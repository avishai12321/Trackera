import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Define Enums locally
enum CalendarProvider {
    GOOGLE = 'GOOGLE',
    MICROSOFT = 'MICROSOFT'
}

enum ConnectionStatus {
    ACTIVE = 'ACTIVE',
    REVOKED = 'REVOKED',
    ERROR = 'ERROR'
}

@Injectable()
export class CalendarService {
    private googleClient: OAuth2Client;
    private readonly logger = new Logger(CalendarService.name);

    constructor(private supabase: SupabaseService) {
        this.googleClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * Trigger calendar sync - now runs synchronously (no queue)
     */
    async enqueueSync(connectionId: string) {
        // Run sync directly instead of queuing
        await this.syncEvents(connectionId);
    }

    async getConnections(tenantId: string, userId: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('calendar_connections')
            .select('id, provider, provider_account_id, status, last_sync_at, created_at')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error('Error fetching connections', error);
            return [];
        }

        return data || [];
    }

    async syncEvents(connectionId: string) {
        this.logger.log(`Syncing events for connection ${connectionId}`);

        const { data: connectionRaw, error } = await this.supabase.getAdminClient()
            .from('calendar_connections')
            .select('*')
            .eq('id', connectionId)
            .single();

        if (error || !connectionRaw) {
            this.logger.error(`Connection ${connectionId} not found`);
            return;
        }

        if (connectionRaw.provider === CalendarProvider.GOOGLE) {
            return this.syncGoogleEvents(connectionRaw);
        } else if (connectionRaw.provider === CalendarProvider.MICROSOFT) {
            return this.syncMicrosoftEvents(connectionRaw);
        }

        return { status: 'skipped', reason: 'unknown_provider' };
    }

    private async syncMicrosoftEvents(connectionRaw: any) {
        this.logger.log('Syncing Microsoft events (not implemented yet)');
        return { status: 'skipped' };
    }

    private async syncGoogleEvents(connectionRaw: any) {
        const { id: connectionId, tenant_id: tenantId, access_token_encrypted: accessTokenEncrypted, refresh_token_encrypted: refreshTokenEncrypted, sync_cursor: syncCursor } = connectionRaw;

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
            await this.supabase.getAdminClient()
                .from('calendar_connections')
                .update({
                    access_token_encrypted: tokens.access_token,
                    token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('id', connectionId);
        });

        const calendar = google.calendar({ version: 'v3', auth: client });

        try {
            // 3. Call Google API
            const listParams: any = {
                calendarId: 'primary',
                singleEvents: true,
                maxResults: 250,
            };

            if (syncCursor) {
                listParams.syncToken = syncCursor;
            } else {
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
                            await this.supabase.getAdminClient()
                                .from('calendar_events')
                                .delete()
                                .match({
                                    connection_id: connectionId,
                                    provider_event_id: event.id
                                });
                        }
                    } else {
                        if (!event.start || !event.end) continue;

                        const startAt = event.start.dateTime || event.start.date;
                        const endAt = event.end.dateTime || event.end.date;

                        if (!startAt || !endAt) continue;

                        // Extract attendees data
                        const attendeesData = event.attendees?.map(a => ({
                            email: a.email,
                            displayName: a.displayName || null,
                            responseStatus: a.responseStatus || 'needsAction',
                            organizer: a.organizer || false,
                            self: a.self || false,
                            optional: a.optional || false
                        })) || null;

                        // Extract conference/meeting link
                        let conferenceLink: string | null = null;
                        if (event.hangoutLink) {
                            conferenceLink = event.hangoutLink;
                        } else if (event.conferenceData?.entryPoints) {
                            const videoEntry = event.conferenceData.entryPoints.find(
                                ep => ep.entryPointType === 'video'
                            );
                            if (videoEntry?.uri) {
                                conferenceLink = videoEntry.uri;
                            }
                        }

                        // Upsert Logic: Supabase upsert works if we have a unique constraint
                        // Unique constraint on: [tenant_id, connection_id, provider, provider_event_id]
                        // Make sure tenant_id IS included in the insert payload
                        await this.supabase.getAdminClient()
                            .from('calendar_events')
                            .upsert({
                                tenant_id: tenantId,
                                connection_id: connectionId,
                                provider: CalendarProvider.GOOGLE,
                                provider_event_id: event.id!,
                                ical_uid: event.iCalUID || null,
                                title: event.summary,
                                description: event.description || null,
                                start_at: new Date(startAt).toISOString(),
                                end_at: new Date(endAt).toISOString(),
                                is_all_day: !event.start.dateTime,
                                location: event.location,
                                organizer: event.organizer?.email || null,
                                attendees: attendeesData,
                                attendees_count: event.attendees?.length || 0,
                                conference_link: conferenceLink,
                                event_status: event.status || 'confirmed',
                                visibility: event.visibility || 'default',
                                updated_at_provider: new Date().toISOString(),
                                synced_at: new Date().toISOString()
                            }, { onConflict: 'tenant_id,connection_id,provider,provider_event_id' });
                    }
                }

            } while (pageToken);

            // 5. Update cursor
            if (nextSyncToken) {
                await this.supabase.getAdminClient()
                    .from('calendar_connections')
                    .update({
                        sync_cursor: nextSyncToken,
                        last_sync_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);
            }

        } catch (error: any) {
            if (error.code === 410) {
                this.logger.warn('Sync token invalid, clearing cursor to resync');
                await this.supabase.getAdminClient()
                    .from('calendar_connections')
                    .update({ sync_cursor: null })
                    .eq('id', connectionId);

                // Retry sync directly instead of re-queuing
                await this.syncEvents(connectionId);
            } else {
                this.logger.error('Error syncing events', error);
                throw error;
            }
        }

        return { status: 'success' };
    }

    async getGoogleAuthUrl(tenantId: string, userId: string) {
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
            this.logger.log(`Google callback for tenant: ${tenantId}, user: ${userId}`);
        } catch (e) {
            this.logger.error('Invalid state parameter', e);
            throw new BadRequestException('Invalid state parameter');
        }

        try {
            const { tokens } = await this.googleClient.getToken(code);
            this.logger.log('Received tokens from Google');

            if (!tokens.access_token) throw new BadRequestException('No access token received');

            // Set credentials to fetch profile
            this.googleClient.setCredentials(tokens);
            const oauth2 = google.oauth2({ version: 'v2', auth: this.googleClient });
            const userInfo = await oauth2.userinfo.get();
            const googleUserId = userInfo.data.id;

            if (!googleUserId) throw new BadRequestException('Could not retrieve Google User ID');
            this.logger.log(`Google User ID: ${googleUserId}`);

            // Ensure employee exists for this user
            const { data: employee, error: empError } = await this.supabase.getAdminClient()
                .from('employees')
                .select('id')
                .match({ tenant_id: tenantId, user_id: userId })
                .maybeSingle();

            if (!employee) {
                this.logger.log(`Creating missing employee for user: ${userId}`);
                const { error: insertEmpError } = await this.supabase.getAdminClient()
                    .from('employees')
                    .insert({
                        tenant_id: tenantId,
                        user_id: userId,
                        first_name: userInfo.data.given_name || 'Google',
                        last_name: userInfo.data.family_name || 'User',
                        email: userInfo.data.email || '',
                        status: 'ACTIVE'
                    });
                if (insertEmpError) {
                    this.logger.error('Error creating missing employee', insertEmpError);
                }
            }

            // Check existence
            const { data: existing, error: selectError } = await this.supabase.getAdminClient()
                .from('calendar_connections')
                .select('*')
                .match({
                    tenant_id: tenantId,
                    user_id: userId,
                    provider: CalendarProvider.GOOGLE
                })
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                this.logger.error('Error checking existing connection', selectError);
            }

            if (existing) {
                this.logger.log(`Updating existing connection: ${existing.id}`);
                const { data, error } = await this.supabase.getAdminClient()
                    .from('calendar_connections')
                    .update({
                        provider_account_id: googleUserId,
                        access_token_encrypted: tokens.access_token,
                        refresh_token_encrypted: tokens.refresh_token || undefined,
                        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                        status: ConnectionStatus.ACTIVE,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select();

                if (error) {
                    this.logger.error('Error updating connection', error);
                    throw new BadRequestException('Failed to update calendar connection');
                }
                this.logger.log('Connection updated successfully');
                const connectionId = (data as any)[0].id;
                return { connectionId };
            } else {
                this.logger.log('Creating new connection');
                const { data, error } = await this.supabase.getAdminClient()
                    .from('calendar_connections')
                    .insert({
                        tenant_id: tenantId,
                        user_id: userId,
                        provider: CalendarProvider.GOOGLE,
                        provider_account_id: googleUserId,
                        access_token_encrypted: tokens.access_token,
                        refresh_token_encrypted: tokens.refresh_token,
                        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                        status: ConnectionStatus.ACTIVE
                    })
                    .select();

                if (error) {
                    this.logger.error('Error inserting connection', error);
                    throw new BadRequestException('Failed to create calendar connection');
                }
                this.logger.log('Connection created successfully');
                const connectionId = (data as any)[0].id;
                return { connectionId };
            }
        } catch (error) {
            this.logger.error('Error in handleGoogleCallback', error);
            throw error;
        }
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

        // Check existence
        const { data: existing } = await this.supabase.getAdminClient()
            .from('calendar_connections')
            .select('*')
            .match({
                tenant_id: tenantId,
                user_id: userId,
                provider: CalendarProvider.MICROSOFT
            })
            .single();

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

        if (existing) {
            return this.supabase.getAdminClient()
                .from('calendar_connections')
                .update({
                    provider_account_id: msUserId,
                    access_token_encrypted: tokens.access_token,
                    refresh_token_encrypted: tokens.refresh_token,
                    token_expires_at: expiresAt.toISOString(),
                    status: ConnectionStatus.ACTIVE,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            return this.supabase.getAdminClient()
                .from('calendar_connections')
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    provider: CalendarProvider.MICROSOFT,
                    provider_account_id: msUserId,
                    access_token_encrypted: tokens.access_token,
                    refresh_token_encrypted: tokens.refresh_token,
                    token_expires_at: expiresAt.toISOString(),
                    status: ConnectionStatus.ACTIVE
                });
        }
    }
}


