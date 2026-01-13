-- Seed data for schema company_test_company
SET search_path TO company_test_company, public;

-- Employees
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '3b9d3719-c848-4875-9b8a-7801372f5bb0', '11111111-1111-1111-1111-111111111111', 'Employee0', 'User0', 'employee0@test.com', 'ACTIVE', 'Developer', 75753, 51, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '57b652c5-41f5-4841-a786-8179441a9e6a', '11111111-1111-1111-1111-111111111111', 'Employee1', 'User1', 'employee1@test.com', 'ACTIVE', 'Developer', 62898, 63, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '276f1edc-3a46-4801-94bf-b53bcf8df73c', '11111111-1111-1111-1111-111111111111', 'Employee2', 'User2', 'employee2@test.com', 'ACTIVE', 'QA', 101698, 99, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '2d6fae48-1173-4c6f-817b-de38806ac2db', '11111111-1111-1111-1111-111111111111', 'Employee3', 'User3', 'employee3@test.com', 'ACTIVE', 'QA', 66117, 64, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', '11111111-1111-1111-1111-111111111111', 'Employee4', 'User4', 'employee4@test.com', 'ACTIVE', 'QA', 61853, 37, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', '11111111-1111-1111-1111-111111111111', 'Employee5', 'User5', 'employee5@test.com', 'ACTIVE', 'DevOps', 80333, 90, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '6d40f245-854b-458b-b7ca-cb34536b4e41', '11111111-1111-1111-1111-111111111111', 'Employee6', 'User6', 'employee6@test.com', 'ACTIVE', 'Designer', 105589, 49, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', '11111111-1111-1111-1111-111111111111', 'Employee7', 'User7', 'employee7@test.com', 'ACTIVE', 'Product Manager', 54082, 30, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', '11111111-1111-1111-1111-111111111111', 'Employee8', 'User8', 'employee8@test.com', 'ACTIVE', 'DevOps', 62902, 82, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', '11111111-1111-1111-1111-111111111111', 'Employee9', 'User9', 'employee9@test.com', 'ACTIVE', 'Developer', 108825, 91, 160
        );

-- Clients
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '994bdcc3-ca90-46bf-8314-bd6c29a94de6', '11111111-1111-1111-1111-111111111111', 'Client Company 0', 'contact@client0.com', 'ACTIVE', 'USD', 188
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'd0414985-69b7-4e33-b7af-2c58b2976171', '11111111-1111-1111-1111-111111111111', 'Client Company 1', 'contact@client1.com', 'ACTIVE', 'USD', 72
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '2f76c417-dfb2-4cb6-a3fd-0199d106573a', '11111111-1111-1111-1111-111111111111', 'Client Company 2', 'contact@client2.com', 'ACTIVE', 'USD', 147
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '86990aa9-de8b-494e-af1d-c2baa347ecd6', '11111111-1111-1111-1111-111111111111', 'Client Company 3', 'contact@client3.com', 'ACTIVE', 'USD', 112
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '469e9cae-d1ac-4071-bebc-52d9b1c259ba', '11111111-1111-1111-1111-111111111111', 'Client Company 4', 'contact@client4.com', 'ACTIVE', 'USD', 89
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'a8432add-1615-47b9-b319-5ee362f6d5cc', '11111111-1111-1111-1111-111111111111', 'Client Company 5', 'contact@client5.com', 'ACTIVE', 'USD', 58
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '11111111-1111-1111-1111-111111111111', 'Client Company 6', 'contact@client6.com', 'ACTIVE', 'USD', 83
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '740a4994-ceac-4d7b-8960-7fe51d507746', '11111111-1111-1111-1111-111111111111', 'Client Company 7', 'contact@client7.com', 'ACTIVE', 'USD', 83
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '11111111-1111-1111-1111-111111111111', 'Client Company 8', 'contact@client8.com', 'ACTIVE', 'USD', 119
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'd479915f-7490-48fd-b68b-fbe29b3be4db', '11111111-1111-1111-1111-111111111111', 'Client Company 9', 'contact@client9.com', 'ACTIVE', 'USD', 195
        );

-- Projects
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '4b99117c-8b28-46ac-afc4-9635f560a862', '11111111-1111-1111-1111-111111111111', 'Project 0', 'PRJ-0', 'ACTIVE', 'd0414985-69b7-4e33-b7af-2c58b2976171', '6d40f245-854b-458b-b7ca-cb34536b4e41', 'HOURLY_RATE', 437255, '2026-01-13T17:51:39.760Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '686d3369-98f8-4aad-ad49-c34b76a31651', '11111111-1111-1111-1111-111111111111', 'Project 1', 'PRJ-1', 'ACTIVE', 'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', 'FIXED', 954886, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'e9706327-3fd5-4372-947d-5420cb28a616', '11111111-1111-1111-1111-111111111111', 'Project 2', 'PRJ-2', 'ACTIVE', '86990aa9-de8b-494e-af1d-c2baa347ecd6', '6d40f245-854b-458b-b7ca-cb34536b4e41', 'HOURLY_RATE', 30946, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '11111111-1111-1111-1111-111111111111', 'Project 3', 'PRJ-3', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '276f1edc-3a46-4801-94bf-b53bcf8df73c', 'HOURLY_RATE', 345510, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '6a6c11a3-729f-4117-a027-77b953b48323', '11111111-1111-1111-1111-111111111111', 'Project 4', 'PRJ-4', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'HOURLY_RATE', 854356, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'c27d39c3-de83-401a-a263-b0a8c2da8889', '11111111-1111-1111-1111-111111111111', 'Project 5', 'PRJ-5', 'ACTIVE', 'd0414985-69b7-4e33-b7af-2c58b2976171', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', 'FIXED', 57938, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '3216666e-2b24-4671-b85e-1b7d6a47c359', '11111111-1111-1111-1111-111111111111', 'Project 6', 'PRJ-6', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '276f1edc-3a46-4801-94bf-b53bcf8df73c', 'FIXED', 160029, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '7cd0594d-93ed-4ebc-9344-df6e78393792', '11111111-1111-1111-1111-111111111111', 'Project 7', 'PRJ-7', 'ACTIVE', 'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 'HOURLY_RATE', 354344, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'cc709c29-6fa7-461d-b724-88298a39168e', '11111111-1111-1111-1111-111111111111', 'Project 8', 'PRJ-8', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'FIXED', 245669, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '5748ec76-1aab-445d-961e-b69e34f80c76', '11111111-1111-1111-1111-111111111111', 'Project 9', 'PRJ-9', 'ACTIVE', '994bdcc3-ca90-46bf-8314-bd6c29a94de6', 'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', 'FIXED', 115905, '2026-01-13T17:51:39.761Z'
        );

-- Project Budgets
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '4b99117c-8b28-46ac-afc4-9635f560a862', 2024, 7, 16110
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '686d3369-98f8-4aad-ad49-c34b76a31651', 2024, 4, 12615
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', 2024, 1, 19406
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', 2024, 2, 12343
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '6a6c11a3-729f-4117-a027-77b953b48323', 2024, 11, 7618
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', 2024, 8, 8501
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '3216666e-2b24-4671-b85e-1b7d6a47c359', 2024, 11, 1878
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '7cd0594d-93ed-4ebc-9344-df6e78393792', 2024, 3, 11186
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'cc709c29-6fa7-461d-b724-88298a39168e', 2024, 11, 13402
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '5748ec76-1aab-445d-961e-b69e34f80c76', 2024, 12, 13392
        ) ON CONFLICT DO NOTHING;

-- Time Allocations
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 4, 76
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 2024, 6, 31
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '4b99117c-8b28-46ac-afc4-9635f560a862', '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', 2024, 5, 22
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 2024, 5, 63
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', 'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', 2024, 12, 41
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 1, 12
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 4, 77
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '5748ec76-1aab-445d-961e-b69e34f80c76', '6d40f245-854b-458b-b7ca-cb34536b4e41', 2024, 2, 18
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '686d3369-98f8-4aad-ad49-c34b76a31651', '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', 2024, 5, 46
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '6a6c11a3-729f-4117-a027-77b953b48323', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 2024, 7, 24
        ) ON CONFLICT DO NOTHING;

-- Time Entries
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '6a6c11a3-729f-4117-a027-77b953b48323', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '2d6fae48-1173-4c6f-817b-de38806ac2db', '4b99117c-8b28-46ac-afc4-9635f560a862', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '2d6fae48-1173-4c6f-817b-de38806ac2db', '6a6c11a3-729f-4117-a027-77b953b48323', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', '5748ec76-1aab-445d-961e-b69e34f80c76', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', '686d3369-98f8-4aad-ad49-c34b76a31651', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '3216666e-2b24-4671-b85e-1b7d6a47c359', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '276f1edc-3a46-4801-94bf-b53bcf8df73c', '7cd0594d-93ed-4ebc-9344-df6e78393792', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );