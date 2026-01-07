import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContext } from '../shared/tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private extendedClient: any;

    async onModuleInit() {
        await this.$connect();
        const self = this;

        this.extendedClient = this.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        const tenantId = TenantContext.getTenantId();

                        // If no tenant context (e.g. public endpoint, login), run raw query
                        // WARNING: ensure public endpoints don't touch tenant data blindly
                        if (!tenantId) {
                            return query(args);
                        }

                        // Wrap in transaction to apply RLS
                        // The original comments about `prisma = new PrismaClient()` and `Note: Use 'this' carefully.` are now less relevant
                        // as we're explicitly capturing `this` as `self`.
                        return (self as any).$transaction(async (tx: any) => {
                            // Set RLS variable
                            try {
                                await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
                            } catch (e) {
                                console.error('Error setting RLS context', e);
                                throw e;
                            }

                            // Execute original operation on the TRANSACTION client
                            if (model && operation && tx[model] && tx[model][operation]) {
                                return tx[model][operation](args);
                            }
                            // Fallback for non-model ops (shouldn't happen in $allModels)
                            return query(args);
                        });
                    },
                },
            },
        });
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Helper to access the extended client
    get client() {
        if (!this.extendedClient) return this;
        return this.extendedClient;
    }

    async withTenant<T>(tenantId: string, callback: (tx: any) => Promise<T>): Promise<T> {
        return this.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
            return callback(tx);
        });
    }
}
