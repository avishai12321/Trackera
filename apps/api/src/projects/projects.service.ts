import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from '@time-tracker/dto';
import { SupabaseService } from '../shared/supabase.service';

@Injectable()
export class ProjectsService {
    constructor(private supabase: SupabaseService) { }

    async create(createProjectDto: CreateProjectDto, tenantId: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('projects')
            .insert({
                tenant_id: tenantId,
                name: createProjectDto.name,
                code: createProjectDto.code,
                description: createProjectDto.description,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create project: ${error.message}`);
        return data;
    }

    async findAll(tenantId: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('projects')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
        return data || [];
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Project #${id} not found`);
        }
        return data;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('projects')
            .update({
                name: updateProjectDto.name,
                code: updateProjectDto.code,
                description: updateProjectDto.description,
                status: updateProjectDto.status,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update project: ${error.message}`);
        return data;
    }

    async remove(id: string) {
        const { error } = await this.supabase.getAdminClient()
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Failed to delete project: ${error.message}`);
        return { success: true };
    }
}
