import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from '@time-tracker/dto';
import { SupabaseService } from '../shared/supabase.service';

@Injectable()
export class ProjectsService {
    constructor(private supabase: SupabaseService) { }

    async create(createProjectDto: CreateProjectDto, tenantId: string) {
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
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
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
            .from('projects')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
        return data || [];
    }

    async findOne(id: string, tenantId: string) {
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Project #${id} not found`);
        }
        return data;
    }

    async update(id: string, updateProjectDto: UpdateProjectDto, tenantId: string) {
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
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

    async remove(id: string, tenantId: string) {
        const client = this.supabase.getClientForTenant(tenantId);

        // First, delete all time entries associated with this project
        const { error: timeEntriesError } = await client
            .from('time_entries')
            .delete()
            .eq('project_id', id);

        if (timeEntriesError) {
            throw new Error(`Failed to delete time entries: ${timeEntriesError.message}`);
        }

        // Delete time allocations (should cascade but we do it explicitly to be safe)
        const { error: timeAllocationsError } = await client
            .from('time_allocations')
            .delete()
            .eq('project_id', id);

        if (timeAllocationsError) {
            throw new Error(`Failed to delete time allocations: ${timeAllocationsError.message}`);
        }

        // Delete project budgets (should cascade but we do it explicitly to be safe)
        const { error: projectBudgetsError } = await client
            .from('project_budgets')
            .delete()
            .eq('project_id', id);

        if (projectBudgetsError) {
            throw new Error(`Failed to delete project budgets: ${projectBudgetsError.message}`);
        }

        // Finally, delete the project itself
        const { error: projectError } = await client
            .from('projects')
            .delete()
            .eq('id', id);

        if (projectError) {
            throw new Error(`Failed to delete project: ${projectError.message}`);
        }

        return { success: true };
    }
}
