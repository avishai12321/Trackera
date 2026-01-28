import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly logger = new Logger(SupabaseService.name);
    private supabaseAdmin: SupabaseClient;

    constructor() {
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
        this.logger.log('Supabase admin client initialized');
    }

    getAdminClient(): SupabaseClient {
        return this.supabaseAdmin;
    }

    // Get a client configured for a specific tenant's schema
    getClientForTenant(tenantId: string): SupabaseClient<any, any, any> {
        const schemaName = `company_${tenantId}`;
        this.logger.log(`Creating client for tenant schema: ${schemaName}`);
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                db: { schema: schemaName },
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );
    }
}
