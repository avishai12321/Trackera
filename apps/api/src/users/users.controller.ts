import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '@time-tracker/dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Role } from '@prisma/client';
import { TenantContext } from '../shared/tenant-context';

@Controller('users')
@UseGuards(TenantGuard, AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(Role.OWNER, Role.ADMIN) // Only Admin/Owner can create users
    create(@Body() createUserDto: CreateUserDto) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.usersService.create(createUserDto, tenantId);
    }

    @Get()
    @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER) // Managers can list users? Or everyone?
    // Let's say everyone can list users for now (to select in projects)
    // But strictly, maybe only Managers+?
    // Spec: "Users & Employees: CRUD APIs". 
    // Let's restrict to MANAGER+ for full list.
    findAll() {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.usersService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.OWNER, Role.ADMIN)
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    // @Delete(':id') 
    // Implement logical delete (status) if needed
}
