import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from '@time-tracker/dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../shared/enums';
import { TenantContext } from '../shared/tenant-context';

@Controller('projects')
@UseGuards(TenantGuard, AuthGuard('jwt'), RolesGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
    create(@Body() createProjectDto: CreateProjectDto) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.projectsService.create(createProjectDto, tenantId);
    }

    @Get()
    // All authenticated employees can list projects? 
    // Maybe only "active" ones?
    // RBAC spec: "Employees: Manage own time entries".
    // To manage time entries, they need to SELECT a project.
    // So read access to projects is needed for EMPLOYEE.
    findAll() {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.projectsService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER)
    update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
        return this.projectsService.update(id, updateProjectDto);
    }

    @Delete(':id')
    @Roles(Role.OWNER, Role.ADMIN) // Only Admin/Owner can delete
    remove(@Param('id') id: string) {
        return this.projectsService.remove(id);
    }
}
