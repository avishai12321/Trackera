import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import { CreateUserDto, UpdateUserDto, UserDto } from '@time-tracker/dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private supabase: SupabaseService) { }

    async create(createUserDto: CreateUserDto, tenantId: string): Promise<UserDto> {
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const adminClient = this.supabase.getAdminClient();

        // 1. Create User
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: createUserDto.email,
                username: createUserDto.username,
                password_hash: hashedPassword,
                tenant_id: tenantId,
                status: 'ACTIVE'
            })
            .select() // Equivalent to returning * or include in Prisma? Supabase returns inserted row.
            .single();

        if (userError) throw new Error(`Failed to create user: ${userError.message}`);

        // 2. Create Employee (optional)
        if (createUserDto.firstName && createUserDto.lastName) {
            const { error: empError } = await adminClient
                .from('employees')
                .insert({
                    tenant_id: tenantId,
                    user_id: user.id, // Link to created user
                    first_name: createUserDto.firstName,
                    last_name: createUserDto.lastName,
                    status: 'ACTIVE'
                });

            if (empError) {
                // Should we rollback user creation? Supabase doesn't support multi-table transaction without RPC.
                // For now, log and throw.
                console.error(`Failed to create employee for user ${user.id}: ${empError.message}`);
                // throw new Error(`Failed to create employee: ${empError.message}`);
            }
        }

        // Return DTO
        return this.mapToDto(user);
    }

    async findAll(tenantId: string) {
        const client = this.supabase.getAdminClient();

        // 1. Fetch Users
        const { data: users, error: usersError } = await client
            .from('users')
            .select('*')
            .eq('tenant_id', tenantId);

        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`);
        }

        // 2. Fetch Employees
        const { data: employees, error: empError } = await client
            .from('employees')
            .select('*')
            .eq('tenant_id', tenantId);

        if (empError) {
            console.warn(`Failed to fetch employees: ${empError.message}`);
        }

        // 3. Map
        return users.map((user: any) => {
            const emp = employees?.find((e: any) => e.user_id === user.id);
            return {
                ...user,
                employee: emp || null
            };
        });
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async findByEmail(email: string, tenantId?: string) {
        if (!tenantId) return null;

        const client = this.supabase.getAdminClient();

        // 1. Fetch User
        const { data: user, error } = await client
            .from('users')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('email', email)
            .single();

        if (error || !user) return null;

        // 2. Fetch Roles
        const { data: roles } = await client
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id);

        // 3. Fetch Employee
        const { data: employee } = await client
            .from('employees')
            .select('*')
            .eq('user_id', user.id)
            .single();

        return {
            ...user,
            roles: roles || [],
            employee: employee || null
        };
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const { data: user, error } = await this.supabase.getAdminClient()
            .from('users')
            .update({
                email: updateUserDto.email,
                username: updateUserDto.username,
                status: updateUserDto.status,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update user: ${error.message}`);
        return this.mapToDto(user);
    }

    async mapToDto(user: any): Promise<UserDto> {
        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            username: user.username,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
        };
    }
}
