import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserDto } from '@time-tracker/dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto, tenantId: string): Promise<UserDto> {
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // We must ensure we create the user in the correct tenant.
        // Even with RLS, it's good practice to set tenantId explicitly.

        const user = await this.prisma.client.user.create({
            data: {
                email: createUserDto.email,
                username: createUserDto.username,
                passwordHash: hashedPassword,
                tenantId: tenantId,
                status: 'ACTIVE',
                employee: createUserDto.firstName && createUserDto.lastName ? {
                    create: {
                        tenantId: tenantId,
                        firstName: createUserDto.firstName,
                        lastName: createUserDto.lastName,
                        status: 'ACTIVE'
                    }
                } : undefined
            },
            include: { employee: true }
        });

        // Map to DTO (omit password)
        return this.mapToDto(user);
    }

    async findAll(tenantId: string) {
        // RLS will handle filtering if context is set
        return this.prisma.client.user.findMany({
            where: { tenantId } // Redundant with RLS but explicit
        });
    }

    async findOne(id: string) {
        return this.prisma.client.user.findUnique({ where: { id } });
    }

    async findByEmail(email: string, tenantId?: string) {
        if (tenantId) {
            return this.prisma.client.user.findUnique({
                where: { tenantId_email: { tenantId, email } },
                include: { roles: true, employee: true }
            });
        }
        // For login (where tenant might be unknown?), we usually need tenantId or global search (superuser).
        // Since this is multi-tenant, login usually requires identifying the tenant or email is unique globally?
        // Our schema says unique(tenantId, email). So email can be duplicated across tenants.
        // Thus Login MUST provide Tenant ID (or alias).
        return null;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.client.user.update({
            where: { id },
            data: {
                email: updateUserDto.email,
                username: updateUserDto.username,
                status: updateUserDto.status,
            },
        });
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
