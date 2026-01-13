import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);
    private jwksCache: any = null;
    private jwksCacheTime: number = 0;
    private readonly CACHE_TTL = 600000; // 10 minutes

    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request: any, rawJwtToken: any, done: any) => {
                try {
                    const header = JSON.parse(
                        Buffer.from(rawJwtToken.split('.')[0], 'base64').toString()
                    );

                    this.logger.log(`Fetching JWKS for kid: ${header.kid}`);

                    // Fetch JWKS with caching
                    const now = Date.now();
                    if (!this.jwksCache || (now - this.jwksCacheTime) > this.CACHE_TTL) {
                        this.logger.log('Fetching fresh JWKS from Supabase');
                        const response = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, {
                            headers: {
                                'apikey': anonKey,
                            },
                        });

                        if (!response.ok) {
                            const error = await response.text();
                            this.logger.error(`JWKS fetch failed: ${response.status} - ${error}`);
                            return done(new Error(`Failed to fetch JWKS: ${response.status}`));
                        }

                        this.jwksCache = await response.json();
                        this.jwksCacheTime = now;
                        this.logger.log(`JWKS fetched successfully, keys: ${this.jwksCache.keys?.length || 0}`);
                    }

                    // Find the key
                    const key = this.jwksCache.keys?.find((k: any) => k.kid === header.kid);
                    if (!key) {
                        this.logger.error(`Key not found for kid: ${header.kid}`);
                        return done(new Error('Signing key not found'));
                    }

                    // Convert JWK to PEM for ES256
                    const publicKey = await this.jwkToPem(key);
                    this.logger.log('Successfully converted JWK to PEM');
                    done(null, publicKey);
                } catch (error) {
                    this.logger.error(`Error in secretOrKeyProvider: ${error.message}`);
                    done(error);
                }
            },
            algorithms: ['ES256'],
        });
    }

    private async jwkToPem(jwk: any): Promise<string> {
        const crypto = await import('crypto');

        // For ES256, we need to create a public key from the JWK
        const keyObject = crypto.createPublicKey({
            key: jwk,
            format: 'jwk',
        });

        return keyObject.export({
            type: 'spki',
            format: 'pem',
        }) as string;
    }

    async validate(payload: any) {
        this.logger.log(`Token validated for user: ${payload.email} (${payload.sub})`);

        // Supabase JWT payload structure
        return {
            id: payload.sub,
            email: payload.email,
            tenantId: payload.user_metadata?.company_id,
            roles: payload.role ? [payload.role] : [],
            employeeId: payload.user_metadata?.employee_id,
            username: payload.email,
        };
    }
}
