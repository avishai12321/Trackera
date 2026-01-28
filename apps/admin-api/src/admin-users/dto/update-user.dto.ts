export class UpdateUserDto {
    email?: string;
    username?: string;
    status?: 'ACTIVE' | 'DISABLED';
    tenantId?: string;
    role?: string;
}
