import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from '@time-tracker/dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    async create(createProjectDto: CreateProjectDto, tenantId: string) {
        // RLS context handles tenant isolation, but we explicit set tenantId for clarity
        return this.prisma.client.project.create({
            data: {
                name: createProjectDto.name,
                code: createProjectDto.code,
                description: createProjectDto.description,
                status: 'ACTIVE',
                tenantId: tenantId,
            },
        });
    }

    async findAll(tenantId: string) {
        return this.prisma.client.project.findMany({
            where: { tenantId }
        });
    }

    async findOne(id: string) {
        const project = await this.prisma.client.project.findUnique({
            where: { id },
        });
        if (!project) throw new NotFoundException(`Project #${id} not found`);
        return project;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto) {
        return this.prisma.client.project.update({
            where: { id },
            data: updateProjectDto,
        });
    }

    async remove(id: string) {
        return this.prisma.client.project.delete({
            where: { id },
        });
    }
}
