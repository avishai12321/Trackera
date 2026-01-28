-- Migration: Add MONTHLY_RATE to ProjectBudgetType enum
-- Date: 2026-01-28
-- Description: Adds MONTHLY_RATE option to ProjectBudgetType enum to support monthly rate projects

-- Add MONTHLY_RATE to the ProjectBudgetType enum
ALTER TYPE "ProjectBudgetType" ADD VALUE IF NOT EXISTS 'MONTHLY_RATE';

-- Note: This migration adds the new enum value which will be available for all tenant schemas
-- that reference this enum type
