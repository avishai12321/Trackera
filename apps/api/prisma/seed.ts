import { PrismaClient, UserStatus, Role, RoleScopeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Create Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Acme Corp',
        },
    });

    console.log(`Created Tenant: ${tenant.id}`);

    // Set RLS Context manually for seeding (since we use the raw client, we might need to bypass or set it)
    // But wait, the raw client `prisma` here is standard. 
    // However, I enabled RLS on tables.
    // Standard Client as Superuser (postgres) BYPASSES RLS by default.
    // So we are good.

    // Create Admin User
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'admin@acme.com',
            username: 'admin',
            passwordHash,
            status: UserStatus.ACTIVE,
            roles: {
                create: {
                    tenantId: tenant.id,
                    role: Role.OWNER,
                    scopeType: RoleScopeType.TENANT
                }
            }
        },
    });

    console.log(`Created Admin: ${admin.email}`);

    // Create Employee
    const empUser = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'employee@acme.com',
            username: 'employee',
            passwordHash,
            status: UserStatus.ACTIVE,
            roles: {
                create: {
                    tenantId: tenant.id,
                    role: Role.EMPLOYEE,
                    scopeType: RoleScopeType.TENANT
                }
            },
            employee: {
                create: {
                    tenantId: tenant.id,
                    firstName: 'John',
                    lastName: 'Doe',
                    status: 'ACTIVE'
                }
            }
        },
    });

    console.log(`Created Employee: ${empUser.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
