# Excel Import Template

Create an Excel file (.xlsx) with the following 4 sheets:

## Sheet 1: employees
| name | hire_date | first_report_date | last_report_date |
|------|-----------|-------------------|------------------|
| John Doe | 2024-01-01 | | |
| Jane Smith | 2024-02-15 | | |

**Notes:**
- `name` (required): Full name of employee
- `hire_date` (optional): Employment start date
- `first_report_date` (optional): Will be auto-calculated from time entries
- `last_report_date` (optional): Will be auto-calculated from time entries

## Sheet 2: customers
| name |
|------|
| Acme Corp |
| TechStart Inc |

**Notes:**
- `name` (required): Customer/client name

## Sheet 3: projects
| customer | project | project_key |
|----------|---------|-------------|
| Acme Corp | Website Redesign | ACME-WEB |
| TechStart Inc | Mobile App | TECH-APP |

**Notes:**
- `customer` (required): Must match a customer name from Sheet 2
- `project` (required): Project name
- `project_key` (optional): Project code/key for time entry matching

## Sheet 4: time_entries_import
| employee | project_key | date | hours | minutes | start_time | end_time | description | billable |
|----------|-------------|------|-------|---------|------------|----------|-------------|----------|
| John Doe | ACME-WEB | 2024-03-01 | 8 | 0 | 09:00 | 17:00 | Development work | true |
| Jane Smith | TECH-APP | 2024-03-01 | 4 | 30 | | | Design review | true |
| John Doe | ACME-WEB | 2024-03-02 | 6 | 0 | | | Coding | true |

**Notes:**
- `employee` (required): Must match an employee name from Sheet 1
- `project_key` (required): Must match a project_key from Sheet 3
- `date` (required): Date in YYYY-MM-DD format or Excel date format
- `hours` (required if minutes not provided): Number of hours worked
- `minutes` (optional): Additional minutes (total = hours * 60 + minutes)
- `start_time` (optional): Start time (HH:MM format). Defaults to 00:00 if not provided
- `end_time` (optional): End time (HH:MM format)
- `description` (optional): Description of work
- `billable` (optional): true/false. Defaults to true

## Alternative Column Names Supported

The import service supports multiple column name variations:

### Employees Sheet
- Name: `name`, `employee`, `Name`, `Employee`, `שם`, `עובד`
- Hire Date: `hire_date`, `hireDate`, `start_date`, `תאריך התחלה`
- First Report Date: `first_report_date`, `firstReportDate`, `תאריך דיווח ראשון`
- Last Report Date: `last_report_date`, `lastReportDate`, `תאריך דיווח אחרון`

### Customers Sheet
- Name: `name`, `customer`, `Name`, `Customer`, `שם`, `לקוח`

### Projects Sheet
- Customer: `customer`, `customerName`, `customer_name`, `Customer`, `לקוח`
- Project: `project`, `projectName`, `project_name`, `name`, `Project`, `Name`, `פרויקט`, `שם`
- Project Key: `project_key`, `projectKey`, `key`, `code`, `Code`, `מפתח`

### Time Entries Sheet
- Employee: `employee`, `employeeName`, `employee_name`, `Employee`, `עובד`
- Project Key: `project_key`, `projectKey`, `project_id`, `project`, `Project`, `פרויקט`
- Date: `date`, `Date`, `תאריך`
- Hours: `hours`, `Hours`, `שעות`
- Minutes: `minutes`, `Minutes`, `דקות`
- Start Time: `start_time`, `startTime`, `from`, `משעה`
- End Time: `end_time`, `endTime`, `to`, `עד`
- Description: `description`, `Description`, `תיאור`
- Billable: `billable`, `Billable`

## Import Behavior

1. **Duplicate Handling**: If a record already exists (matching by name), it will use the existing record and add a warning
2. **First/Last Report Dates**: Automatically calculated from time entries after import
3. **Default Values**:
   - Start time defaults to 00:00:00 if not provided
   - Billable defaults to true if not specified
   - Status defaults to ACTIVE for all records
4. **Smart Matching**: All name matching is case-insensitive and trimmed
5. **Error Handling**: Invalid rows are skipped with error messages, valid rows are still imported

## Testing

To test the import:

1. Create your Excel file following the template above
2. Use the web UI at http://localhost:3001/import
3. Or use the test script: `node test-import.js path/to/your/file.xlsx`
