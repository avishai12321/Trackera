'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type DatePreset = 'today' | 'week' | 'month' | 'last-month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string;   // ISO format YYYY-MM-DD
}

export interface DateFilterState extends DateRange {
  preset?: DatePreset;
  compareEnabled?: boolean;  // Future: comparison mode
  compareRange?: DateRange;  // Future: comparison period
}

interface DateFilterContextType {
  dateFilter: DateFilterState;
  setDateRange: (startDate: string, endDate: string, preset?: DatePreset) => void;
  applyPreset: (preset: DatePreset) => void;
  resetToDefault: () => void;
  isLoading: boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'dashboardDateFilter';
const MAX_RANGE_DAYS = 365;

// Helper function to get default date range (last 30 days)
const getDefaultDateRange = (): DateFilterState => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    preset: 'month',
  };
};

// Helper function to calculate date ranges for presets
const calculatePresetRange = (preset: DatePreset): DateRange => {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);

  switch (preset) {
    case 'today':
      // Start and end are the same day
      break;

    case 'week':
      // Last 7 days
      startDate.setDate(today.getDate() - 7);
      break;

    case 'month':
      // Last 30 days
      startDate.setDate(today.getDate() - 30);
      break;

    case 'last-month':
      // Previous calendar month
      endDate.setDate(0); // Last day of previous month
      startDate.setMonth(endDate.getMonth(), 1); // First day of previous month
      break;

    case 'quarter':
      // Last 90 days
      startDate.setDate(today.getDate() - 90);
      break;

    case 'year':
      // Last 365 days
      startDate.setDate(today.getDate() - 365);
      break;

    default:
      // Custom - return current values
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

// Validate date range
const validateDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // Check if end is after start
  if (end < start) {
    return false;
  }

  // Check if range is not too large (max 1 year)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_RANGE_DAYS) {
    return false;
  }

  return true;
};

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterState>(getDefaultDateRange());

  // Initialize date filter from URL params or localStorage or default
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let initialFilter: DateFilterState;

    // Priority 1: URL params
    if (fromParam && toParam && validateDateRange(fromParam, toParam)) {
      initialFilter = {
        startDate: fromParam,
        endDate: toParam,
        preset: 'custom',
      };
    }
    // Priority 2: localStorage
    else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (validateDateRange(parsed.startDate, parsed.endDate)) {
            initialFilter = parsed;
          } else {
            initialFilter = getDefaultDateRange();
          }
        } else {
          initialFilter = getDefaultDateRange();
        }
      } catch (error) {
        console.error('Error loading date filter from localStorage:', error);
        initialFilter = getDefaultDateRange();
      }
    }

    setDateFilter(initialFilter);
    setIsLoading(false);
  }, []); // Only run on mount

  // Update URL and localStorage when date filter changes
  useEffect(() => {
    if (isLoading) return; // Skip during initialization

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    const currentFrom = params.get('from');
    const currentTo = params.get('to');

    // Only update URL if the date filter has actually changed
    if (currentFrom !== dateFilter.startDate || currentTo !== dateFilter.endDate) {
      params.set('from', dateFilter.startDate);
      params.set('to', dateFilter.endDate);

      // Use replace to avoid adding to browser history for every date change
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    // Update localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dateFilter));
    } catch (error) {
      console.error('Error saving date filter to localStorage:', error);
    }
  }, [dateFilter, pathname, router, searchParams, isLoading]);

  const setDateRange = useCallback((startDate: string, endDate: string, preset?: DatePreset) => {
    if (!validateDateRange(startDate, endDate)) {
      console.error('Invalid date range:', { startDate, endDate });
      return;
    }

    setDateFilter({
      startDate,
      endDate,
      preset: preset || 'custom',
    });
  }, []);

  const applyPreset = useCallback((preset: DatePreset) => {
    const range = calculatePresetRange(preset);
    setDateFilter({
      ...range,
      preset,
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setDateFilter(getDefaultDateRange());
  }, []);

  const value: DateFilterContextType = {
    dateFilter,
    setDateRange,
    applyPreset,
    resetToDefault,
    isLoading,
  };

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
