import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('admin')
export class AdminUsersController {
    private readonly logger = new Logger(AdminUsersController.name);

    constructor(private readonly adminUsersService: AdminUsersService) { }

    /**
     * GET /admin/tenants - List all tenants
     */
    @Get('tenants')
    async getTenants() {
        this.logger.log('Fetching all tenants');
        return this.adminUsersService.getAllTenants();
    }

    /**
     * GET /admin/employees/:tenantId - List employees for a tenant
     */
    @Get('employees/:tenantId')
    async getEmployees(@Param('tenantId') tenantId: string) {
        this.logger.log(`Fetching employees for tenant: ${tenantId}`);
        return this.adminUsersService.getEmployeesByTenant(tenantId);
    }

    /**
     * GET /admin/users - List all users with details
     */
    @Get('users')
    async getUsers() {
        this.logger.log('Fetching all users');
        return this.adminUsersService.getAllUsers();
    }

    /**
     * POST /admin/users - Create a new user
     */
    @Post('users')
    async createUser(@Body() createUserDto: CreateUserDto) {
        this.logger.log(`Creating user for employee: ${createUserDto.employeeId}`);
        return this.adminUsersService.createUser(createUserDto);
    }

    /**
     * PUT /admin/users/:id - Update a user
     */
    @Put('users/:id')
    async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        this.logger.log(`Updating user: ${id}`);
        return this.adminUsersService.updateUser(id, updateUserDto);
    }

    /**
     * DELETE /admin/users/:id - Delete a user
     */
    @Delete('users/:id')
    async deleteUser(@Param('id') id: string) {
        this.logger.log(`Deleting user: ${id}`);
        return this.adminUsersService.deleteUser(id);
    }

    /**
     * POST /admin/users/:id/reset-password - Reset user password
     */
    @Post('users/:id/reset-password')
    async resetPassword(@Param('id') id: string) {
        this.logger.log(`Resetting password for user: ${id}`);
        return this.adminUsersService.resetPassword(id);
    }
}
