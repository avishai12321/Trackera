import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
    private static storage = new AsyncLocalStorage<{ tenantId: string }>();

    static run(tenantId: string, callback: () => void) {
        this.storage.run({ tenantId }, callback);
    }

    static getTenantId(): string | undefined {
        return this.storage.getStore()?.tenantId;
    }
}
