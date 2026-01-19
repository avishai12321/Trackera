export class CreateEmployeeReviewDto {
    employeeId!: string;
    reviewDate?: string;
    scorePresentation?: number;
    scoreTimeManagement?: number;
    scoreExcelSkills?: number;
    scoreProficiency?: number;
    scoreTransparency?: number;
    scoreCreativity?: number;
    scoreOverall?: number;
    positiveSkills?: string[];
    improvementSkills?: string[];
    actionItems?: string;
    employeeCommentary?: string;
}

export class UpdateEmployeeReviewDto {
    reviewDate?: string;
    scorePresentation?: number;
    scoreTimeManagement?: number;
    scoreExcelSkills?: number;
    scoreProficiency?: number;
    scoreTransparency?: number;
    scoreCreativity?: number;
    scoreOverall?: number;
    positiveSkills?: string[];
    improvementSkills?: string[];
    actionItems?: string;
    employeeCommentary?: string;
}

export class EmployeeReviewDto {
    id!: string;
    tenantId!: string;
    employeeId!: string;
    reviewerId!: string;
    reviewDate!: string;
    scorePresentation?: number | null;
    scoreTimeManagement?: number | null;
    scoreExcelSkills?: number | null;
    scoreProficiency?: number | null;
    scoreTransparency?: number | null;
    scoreCreativity?: number | null;
    scoreOverall?: number | null;
    positiveSkills?: string[];
    improvementSkills?: string[];
    actionItems?: string | null;
    employeeCommentary?: string | null;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        position?: string;
        department?: string;
    } | null;
    reviewer?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt!: Date;
    updatedAt!: Date;
}
