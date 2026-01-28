import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUsersService {
    private readonly logger = new Logger(AdminUsersService.name);

    constructor(private supabase: SupabaseService) { }

    /**
     * Generate a secure random password
     */
    generatePassword(length: number = 12): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Get all tenants
     */
    async getAllTenants() {
        const { data, error } = await this.supabase.getAdminClient()
            .from('tenants')
            .select('*')
            .order('name');

        if (error) {
            this.logger.error('Failed to fetch tenants', error);
            throw new Error(`Failed to fetch tenants: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get employees for a specific tenant
     */
    async getEmployeesByTenant(tenantId: string) {
        // First get the tenant to find the schema name
        const { data: tenant, error: tenantError } = await this.supabase.getAdminClient()
            .from('tenants')
            .select('schema_name')
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            this.logger.error('Tenant not found', tenantError);
            throw new NotFoundException(`Tenant not found: ${tenantId}`);
        }

        // Use the tenant-specific schema client
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        const { data, error } = await tenantClient
            .from('employees')
            .select('id, first_name, last_name, email, user_id, status')
            .order('first_name');

        if (error) {
            this.logger.error('Failed to fetch employees', error);
            throw new Error(`Failed to fetch employees: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get all users with their tenant and employee info
     */
    async getAllUsers() {
        const client = this.supabase.getAdminClient();

        // Get all users
        const { data: users, error: usersError } = await client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError) {
            this.logger.error('Failed to fetch users', usersError);
            throw new Error(`Failed to fetch users: ${usersError.message}`);
        }

        // Get all tenants for lookup
        const { data: tenants } = await client
            .from('tenants')
            .select('id, name, schema_name');

        const tenantsMap = new Map((tenants || []).map(t => [t.id, t]));

        // Get all user roles
        const { data: roles } = await client
            .from('user_roles')
            .select('*');

        const rolesMap = new Map<string, any[]>();
        (roles || []).forEach(r => {
            if (!rolesMap.has(r.user_id)) {
                rolesMap.set(r.user_id, []);
            }
            rolesMap.get(r.user_id)!.push(r);
        });

        // Get auth users to retrieve passwords from user_metadata
        const { data: authUsersData } = await client.auth.admin.listUsers();
        const authUsersMap = new Map<string, any>();
        (authUsersData?.users || []).forEach((u: any) => {
            authUsersMap.set(u.email, u);
        });

        // Enrich users with tenant and employee info
        const enrichedUsers = await Promise.all((users || []).map(async (user) => {
            const tenant = tenantsMap.get(user.tenant_id);
            let employee: any = null;

            if (tenant) {
                // Try to find employee for this user
                try {
                    const tenantClient = this.supabase.getClientForTenant(user.tenant_id);
                    const { data: emp } = await tenantClient
                        .from('employees')
                        .select('id, first_name, last_name, email')
                        .eq('user_id', user.id)
                        .single();
                    employee = emp;
                } catch (e) {
                    // No employee found, that's okay
                }
            }

            // Get password from auth user's metadata
            const authUser = authUsersMap.get(user.email);
            const password = authUser?.user_metadata?.plain_password || null;

            return {
                id: user.id,
                email: user.email,
                username: user.username,
                status: user.status,
                tenantId: user.tenant_id,
                tenantName: tenant?.name || 'Unknown',
                employee: employee,
                roles: rolesMap.get(user.id) || [],
                password: password,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            };
        }));

        return enrichedUsers;
    }

    /**
     * Create a new user
     */
    async createUser(dto: CreateUserDto) {
        const client = this.supabase.getAdminClient();

        // Validate tenant exists
        const { data: tenant, error: tenantError } = await client
            .from('tenants')
            .select('id, name, schema_name')
            .eq('id', dto.tenantId)
            .single();

        if (tenantError || !tenant) {
            throw new NotFoundException(`Tenant not found: ${dto.tenantId}`);
        }

        // Get employee from tenant schema
        const tenantClient = this.supabase.getClientForTenant(dto.tenantId);
        const { data: employee, error: empError } = await tenantClient
            .from('employees')
            .select('id, first_name, last_name, email, user_id')
            .eq('id', dto.employeeId)
            .single();

        if (empError || !employee) {
            throw new NotFoundException(`Employee not found: ${dto.employeeId}`);
        }

        if (employee.user_id) {
            throw new BadRequestException(`Employee already has a user account`);
        }

        // Determine email to use - from employee or from request
        const userEmail = employee.email || dto.email;
        if (!userEmail) {
            throw new BadRequestException(`Employee does not have an email address. Please provide one.`);
        }

        // Generate password
        const plainPassword = this.generatePassword();

        // Create user in Supabase Auth (auth.users table) - this is what login uses
        const { data: authUser, error: authError } = await client.auth.admin.createUser({
            email: userEmail,
            password: plainPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                tenant_id: dto.tenantId,
                employee_id: dto.employeeId,
                plain_password: plainPassword, // Store for admin viewing
            },
        });

        if (authError) {
            this.logger.error('Failed to create auth user', authError);
            throw new Error(`Failed to create auth user: ${authError.message}`);
        }

        // Also create user in public.users table for app data
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const { data: newUser, error: userError } = await client
            .from('users')
            .insert({
                id: authUser.user.id, // Use same ID as auth user
                email: userEmail,
                username: userEmail,
                password_hash: hashedPassword,
                tenant_id: dto.tenantId,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (userError) {
            this.logger.error('Failed to create user in public.users', userError);
            // Try to clean up auth user
            await client.auth.admin.deleteUser(authUser.user.id);
            throw new Error(`Failed to create user: ${userError.message}`);
        }

        // Create default role (EMPLOYEE)
        await client
            .from('user_roles')
            .insert({
                user_id: newUser.id,
                role: 'EMPLOYEE',
                scope_type: 'TENANT',
            });

        // Link employee to user
        const { error: linkError } = await tenantClient
            .from('employees')
            .update({ user_id: newUser.id })
            .eq('id', dto.employeeId);

        if (linkError) {
            this.logger.warn('Failed to link employee to user', linkError);
        }

        this.logger.log(`Created user for employee ${employee.first_name} ${employee.last_name}`);

        return {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            status: newUser.status,
            tenantId: newUser.tenant_id,
            tenantName: tenant.name,
            employee: {
                id: employee.id,
                firstName: employee.first_name,
                lastName: employee.last_name,
            },
            password: plainPassword,
            createdAt: newUser.created_at,
        };
    }

    /**
     * Update a user
     */
    async updateUser(id: string, dto: UpdateUserDto) {
        const client = this.supabase.getAdminClient();

        // Get the existing user first
        const { data: existingUser, error: fetchError } = await client
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingUser) {
            throw new NotFoundException(`User not found: ${id}`);
        }

        const updateData: any = {};

        if (dto.email) {
            updateData.email = dto.email;
            updateData.username = dto.email; // Keep username in sync with email
        }
        if (dto.username) {
            updateData.username = dto.username;
        }
        if (dto.status) {
            updateData.status = dto.status;
        }
        if (dto.tenantId) {
            // Validate the new tenant exists
            const { data: tenant, error: tenantError } = await client
                .from('tenants')
                .select('id')
                .eq('id', dto.tenantId)
                .single();

            if (tenantError || !tenant) {
                throw new NotFoundException(`Tenant not found: ${dto.tenantId}`);
            }
            updateData.tenant_id = dto.tenantId;
        }

        // Update user if there are changes
        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await client
                .from('users')
                .update(updateData)
                .eq('id', id);

            if (updateError) {
                this.logger.error('Failed to update user', updateError);
                throw new Error(`Failed to update user: ${updateError.message}`);
            }
        }

        // Handle role update separately
        if (dto.role) {
            // Delete existing roles and add the new one
            await client
                .from('user_roles')
                .delete()
                .eq('user_id', id);

            await client
                .from('user_roles')
                .insert({
                    user_id: id,
                    role: dto.role,
                    scope_type: 'TENANT',
                });
        }

        // Return updated user
        const { data: updatedUser } = await client
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        return updatedUser;
    }

    /**
     * Delete a user
     */
    async deleteUser(id: string) {
        const client = this.supabase.getAdminClient();

        // Get user to find tenant
        const { data: user, error: userError } = await client
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (userError || !user) {
            throw new NotFoundException(`User not found: ${id}`);
        }

        // Unlink employee from user
        try {
            const tenantClient = this.supabase.getClientForTenant(user.tenant_id);
            await tenantClient
                .from('employees')
                .update({ user_id: null })
                .eq('user_id', id);
        } catch (e) {
            this.logger.warn('Could not unlink employee', e);
        }

        // Delete user roles (cascade should handle this, but be explicit)
        await client
            .from('user_roles')
            .delete()
            .eq('user_id', id);

        // Delete user from public.users
        const { error: deleteError } = await client
            .from('users')
            .delete()
            .eq('id', id);

        if (deleteError) {
            this.logger.error('Failed to delete user from public.users', deleteError);
            throw new Error(`Failed to delete user: ${deleteError.message}`);
        }

        // Delete user from auth.users (Supabase Auth)
        const { error: authDeleteError } = await client.auth.admin.deleteUser(id);

        if (authDeleteError) {
            this.logger.warn('Failed to delete user from auth.users', authDeleteError);
            // Don't throw - user is already deleted from public.users
        }

        this.logger.log(`Deleted user: ${id}`);

        return { success: true, message: 'User deleted successfully' };
    }

    /**
     * Reset user password
     */
    async resetPassword(id: string) {
        const client = this.supabase.getAdminClient();

        // First check if user exists in public.users
        this.logger.log(`Looking up user with ID: ${id}`);
        const { data: existingUser, error: fetchError } = await client
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingUser) {
            this.logger.error('User not found', fetchError);
            throw new NotFoundException(`User not found: ${id}`);
        }

        this.logger.log(`Found user: ${existingUser.email}`);
        const plainPassword = this.generatePassword();

        // Update password hash in public.users
        this.logger.log(`Updating public.users with new password hash`);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const { error: updateDbError } = await client
            .from('users')
            .update({
                password_hash: hashedPassword
            })
            .eq('id', id);

        if (updateDbError) {
            this.logger.error('Failed to update public.users', updateDbError);
            throw new Error(`Failed to update password in database: ${updateDbError.message}`);
        }

        // Try to update/create auth user (non-blocking)
        try {
            // First try to create auth user
            const { data: newAuthUser, error: createError } = await client.auth.admin.createUser({
                email: existingUser.email,
                password: plainPassword,
                email_confirm: true,
                user_metadata: {
                    tenant_id: existingUser.tenant_id,
                    plain_password: plainPassword, // Store for admin viewing
                },
            });

            if (createError) {
                this.logger.log(`Auth user create failed (${createError.message}), trying to find and update existing...`);

                // Try to list and find user
                const { data: userList } = await client.auth.admin.listUsers();
                const authUser = (userList?.users || []).find((u: any) => u.email === existingUser.email);

                if (authUser) {
                    const { error: updateError } = await client.auth.admin.updateUserById(authUser.id, {
                        password: plainPassword,
                        user_metadata: { plain_password: plainPassword }, // Store for admin viewing
                    });
                    if (updateError) {
                        this.logger.warn(`Failed to update auth password: ${updateError.message}`);
                    } else {
                        this.logger.log(`Updated auth user password successfully`);
                    }
                } else {
                    this.logger.warn('Could not find auth user by email');
                }
            } else {
                this.logger.log(`Created new auth user: ${newAuthUser?.user?.id}`);
            }
        } catch (authError: any) {
            this.logger.warn(`Auth user update failed: ${authError.message}`);
            // Don't throw - we've already updated public.users
        }

        this.logger.log(`Password reset complete for user: ${existingUser.email}`);

        return {
            id: existingUser.id,
            email: existingUser.email,
            password: plainPassword,
            message: 'Password reset successfully',
        };
    }
}
