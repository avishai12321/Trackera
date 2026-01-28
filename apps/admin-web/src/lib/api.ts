import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:4000';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Tenant {
    id: string;
    name: string;
    schema_name: string;
    created_at: string;
}

export interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null;
    status: string;
}

export interface UserRole {
    id: string;
    user_id: string;
    role: string;
    scope_type: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    status: string;
    tenantId: string;
    tenantName: string;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
    roles: UserRole[];
    password?: string; // Only present in create response
    createdAt: string;
    updatedAt?: string;
}

export interface CreateUserRequest {
    tenantId: string;
    employeeId: string;
    email?: string; // Optional - required only if employee has no email
}

export interface UpdateUserRequest {
    email?: string;
    username?: string;
    status?: 'ACTIVE' | 'DISABLED';
    tenantId?: string;
    role?: string;
}

// Tenant APIs
export async function getTenants(): Promise<Tenant[]> {
    const response = await api.get('/admin/tenants');
    return response.data;
}

// Employee APIs
export async function getEmployeesByTenant(tenantId: string): Promise<Employee[]> {
    const response = await api.get(`/admin/employees/${tenantId}`);
    return response.data;
}

// User APIs
export async function getUsers(): Promise<User[]> {
    const response = await api.get('/admin/users');
    return response.data;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post('/admin/users', data);
    return response.data;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
}

export async function deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
}

export async function resetPassword(id: string): Promise<{ id: string; email: string; password: string }> {
    const response = await api.post(`/admin/users/${id}/reset-password`);
    return response.data;
}
