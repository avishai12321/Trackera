import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly logger = new Logger(SupabaseService.name);
    private supabaseAdmin: SupabaseClient;

    constructor() {
        // Admin client for restricted operations
        this.supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );
    }

    // Get admin client (service role)
    getAdminClient(): SupabaseClient {
        return this.supabaseAdmin;
    }

    // Get client context for a specific user (passed via token)
    // This allows RLS to work if we pass the user's JWT
    getClientForUser(token: string): SupabaseClient {
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
                auth: {
                    persistSession: false,
                },
            },
        );
    }
}
