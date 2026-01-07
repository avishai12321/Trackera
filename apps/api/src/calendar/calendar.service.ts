import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarProvider, ConnectionStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CalendarService {
    private googleClient: OAuth2Client;
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        private prisma: PrismaService,
        @InjectQueue('calendar-sync') private calendarSyncQueue: Queue
    ) {
        this.googleClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    async enqueueSync(connectionId: string) {
        await this.calendarSyncQueue.add('sync-events', { connectionId });
    }

    async syncEvents(connectionId: string) {
        this.logger.log(`Syncing events for connection ${connectionId}`);

        // 1. Fetch connection (Raw first to finding tenant)
        // We use a raw query or findUnique without RLS context to find the tenant.
        // Since we are in a background job, we don't have a TenantContext set yet.
        const connectionRaw = await this.prisma.calendarConnection.findUnique({
            where: { id: connectionId }
        });

        if (!connectionRaw) {
            this.logger.error(`Connection ${connectionId} not found`);
            return;
        }

        if (connectionRaw.provider === CalendarProvider.GOOGLE) {
            return this.syncGoogleEvents(connectionRaw);
        } else if (connectionRaw.provider === CalendarProvider.MICROSOFT) {
            return this.syncMicrosoftEvents(connectionRaw); // Future
        }

        return { status: 'skipped', reason: 'unknown_provider' };
    }

    private async syncMicrosoftEvents(connectionRaw: any) {
        this.logger.log('Syncing Microsoft events (not implemented yet)');
        return { status: 'skipped' };
    }

    private async syncGoogleEvents(connectionRaw: any) {
        const { id: connectionId, tenantId, accessTokenEncrypted, refreshTokenEncrypted, syncCursor } = connectionRaw;

        await this.prisma.withTenant(tenantId, async (tx) => {
            // 2. Setup Google Client
            const client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            client.setCredentials({
                access_token: accessTokenEncrypted,
                refresh_token: refreshTokenEncrypted || undefined
            });

            // Listen for token updates (refresh)
            client.on('tokens', async (tokens) => {
                this.logger.log('Tokens refreshed');
                await tx.calendarConnection.update({
                    where: { id: connectionId },
                    data: {
                        accessTokenEncrypted: tokens.access_token,
                        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                        updatedAt: new Date()
                        // If refresh_token is returned, update it too (rare for Google unless prompted)
                    }
                });
            });

            const calendar = google.calendar({ version: 'v3', auth: client });

            try {
                // 3. Call Google API
                const listParams: any = {
                    calendarId: 'primary',
                    singleEvents: true, // Expand recurring events for simpler suggestion logic
                    maxResults: 250,
                };

                if (syncCursor) {
                    listParams.syncToken = syncCursor;
                } else {
                    // Initial sync: fetch from now - 1 month? Or just future?
                    // Let's fetch last 30 days and future
                    const now = new Date();
                    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    listParams.timeMin = oneMonthAgo.toISOString();
                }

                let nextSyncToken: string | undefined | null = null;
                let pageToken: string | undefined = undefined;

                do {
                    if (pageToken) listParams.pageToken = pageToken;

                    const res = await calendar.events.list(listParams);
                    const items = res.data.items || [];
                    nextSyncToken = res.data.nextSyncToken;
                    pageToken = res.data.nextPageToken || undefined;

                    // 4. Upsert events
                    for (const event of items) {
                        if (event.status === 'cancelled') {
                            // Handle deletion
                            if (event.id) {
                                await tx.calendarEvent.deleteMany({
                                    where: {
                                        connectionId,
                                        providerEventId: event.id
                                    }
                                });
                            }
                        } else {
                            if (!event.start || !event.end) continue;

                            const startAt = event.start.dateTime || event.start.date; // Date-only if all-day
                            const endAt = event.end.dateTime || event.end.date;

                            if (!startAt || !endAt) continue;

                            await tx.calendarEvent.upsert({
                                where: {
                                    tenantId_connectionId_provider_providerEventId: {
                                        tenantId,
                                        connectionId,
                                        provider: CalendarProvider.GOOGLE,
                                        providerEventId: event.id!
                                    }
                                },
                                update: {
                                    title: event.summary,
                                    startAt: new Date(startAt),
                                    endAt: new Date(endAt),
                                    isAllDay: !event.start.dateTime, // If no DateTime, it's date-only
                                    location: event.location,
                                    updatedAtProvider: new Date()
                                },
                                create: {
                                    tenantId,
                                    connectionId,
                                    provider: CalendarProvider.GOOGLE,
                                    providerEventId: event.id!,
                                    icalUid: event.iCalUID || undefined, // Fix null issue
                                    title: event.summary,
                                    startAt: new Date(startAt),
                                    endAt: new Date(endAt),
                                    isAllDay: !event.start.dateTime,
                                    location: event.location,
                                    updatedAtProvider: new Date()
                                }
                            });
                        }
                    }

                } while (pageToken);

                // 5. Update cursor
                if (nextSyncToken) {
                    await tx.calendarConnection.update({
                        where: { id: connectionId },
                        data: {
                            syncCursor: nextSyncToken,
                            lastSyncAt: new Date()
                        }
                    });
                }

            } catch (error: any) {
                if (error.code === 410) {
                    this.logger.warn('Sync token invalid, clearing cursor to resync');
                    await tx.calendarConnection.update({
                        where: { id: connectionId },
                        data: { syncCursor: null }
                    });
                    // Retry immediately or let next job handle it?
                    // Let's enqueue another job
                    await this.calendarSyncQueue.add('sync-events', { connectionId });
                } else {
                    this.logger.error('Error syncing events', error);
                    throw error; // Let Bull retry
                }
            }
        });

        return { status: 'success' };
    }

    async getGoogleAuthUrl(tenantId: string, userId: string) {
        // We pack tenantId/userId into 'state' to recover them on callback
        // In a real app, sign this state to prevent tampering (CSRF).
        // For MVP, simplistic JSON.stringify + Base64
        const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');

        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ];

        return this.googleClient.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            scope: scopes,
            state: state,
            prompt: 'consent' // Force consent to ensure we get refresh_token
        });
    }

    async handleGoogleCallback(code: string, state: string) {
        let tenantId: string;
        let userId: string;

        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            tenantId = decoded.tenantId;
            userId = decoded.userId;
        } catch (e) {
            throw new BadRequestException('Invalid state parameter');
        }

        const { tokens } = await this.googleClient.getToken(code);

        // Save tokens to DB
        // Check if connection exists, update or create
        // We unfortunately can't set TenantContext here easily if we are in a public callback?
        // Wait, callback route IS guarded in my controller?
        // "AuthGuard('jwt')" -> Requires user to be logged in on the Frontend when callback hits?
        // Yes, browser carries the token? 
        // If 'callback/google' is hit by browser redirect, it SHOULD send the Authorization header? 
        // NO. Browser redirects don't automatically add 'Authorization: Bearer ...' header unless we use cookies.
        // We are using stateless JWT in headers.
        // So the user is "Anonymous" to the backend on this GET request unless query param has token?

        // Strategy: 
        // 1. The 'state' param recovers who the user IS.
        // 2. We trust 'state' (should be signed in prod).
        // 3. We use a sudo-mode to write to DB for that tenant/user.

        if (!tokens.access_token) throw new BadRequestException('No access token received');

        // Set credentials to fetch profile
        this.googleClient.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: this.googleClient });
        const userInfo = await oauth2.userinfo.get();
        const googleUserId = userInfo.data.id;

        if (!googleUserId) throw new BadRequestException('Could not retrieve Google User ID');

        return this.prisma.withTenant(tenantId, async (tx) => {
            // Check existence
            const existing = await tx.calendarConnection.findUnique({
                where: {
                    tenantId_userId_provider: {
                        tenantId,
                        userId,
                        provider: CalendarProvider.GOOGLE
                    }
                }
            });

            if (existing) {
                return tx.calendarConnection.update({
                    where: { id: existing.id },
                    data: {
                        providerAccountId: googleUserId, // Update in case it changed or was pending
                        accessTokenEncrypted: tokens.access_token, // TODO: encrypt
                        refreshTokenEncrypted: tokens.refresh_token || undefined, // Only update if present
                        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                        status: ConnectionStatus.ACTIVE,
                        updatedAt: new Date()
                    }
                });
            } else {
                return tx.calendarConnection.create({
                    data: {
                        tenantId,
                        userId,
                        provider: CalendarProvider.GOOGLE,
                        providerAccountId: googleUserId,
                        accessTokenEncrypted: tokens.access_token,
                        refreshTokenEncrypted: tokens.refresh_token,
                        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                        status: ConnectionStatus.ACTIVE
                    }
                });
            }
        });
    }

    async getMicrosoftAuthUrl(tenantId: string, userId: string) {
        const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
        const scopes = ['offline_access', 'Calendars.Read', 'User.Read'];
        const params = new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            response_type: 'code',
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
            response_mode: 'query',
            scope: scopes.join(' '),
            state: state
        });
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    }

    async handleMicrosoftCallback(code: string, state: string) {
        let tenantId: string;
        let userId: string;

        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            tenantId = decoded.tenantId;
            userId = decoded.userId;
        } catch (e) {
            throw new BadRequestException('Invalid state parameter');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID!,
                scope: 'offline_access Calendars.Read User.Read',
                code: code,
                redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
                grant_type: 'authorization_code',
                client_secret: process.env.MICROSOFT_CLIENT_SECRET!
            })
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            this.logger.error(`Microsoft Token Error: ${err}`);
            throw new BadRequestException('Failed to exchange Microsoft token');
        }

        const tokens = await tokenResponse.json();

        // Get User Profile for ID
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        if (!profileResponse.ok) {
            throw new BadRequestException('Failed to fetch Microsoft profile');
        }

        const profile = await profileResponse.json();
        const msUserId = profile.id;

        return this.prisma.withTenant(tenantId, async (tx) => {
            const existing = await tx.calendarConnection.findUnique({
                where: {
                    tenantId_userId_provider: {
                        tenantId,
                        userId,
                        provider: CalendarProvider.MICROSOFT
                    }
                }
            });

            // Calculate expiry
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

            if (existing) {
                return tx.calendarConnection.update({
                    where: { id: existing.id },
                    data: {
                        providerAccountId: msUserId,
                        accessTokenEncrypted: tokens.access_token,
                        refreshTokenEncrypted: tokens.refresh_token,
                        tokenExpiresAt: expiresAt,
                        status: ConnectionStatus.ACTIVE,
                        updatedAt: new Date()
                    }
                });
            } else {
                return tx.calendarConnection.create({
                    data: {
                        tenantId,
                        userId,
                        provider: CalendarProvider.MICROSOFT,
                        providerAccountId: msUserId,
                        accessTokenEncrypted: tokens.access_token,
                        refreshTokenEncrypted: tokens.refresh_token,
                        tokenExpiresAt: expiresAt,
                        status: ConnectionStatus.ACTIVE
                    }
                });
            }
        });
    }
}


