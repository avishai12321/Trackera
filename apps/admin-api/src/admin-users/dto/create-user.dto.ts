export class CreateUserDto {
    tenantId: string;
    employeeId: string;
    email?: string; // Optional - only needed if employee has no email
    // Password will be auto-generated
}
