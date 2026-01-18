'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter, type DatePreset } from '@/contexts/DateFilterContext';
import { Calendar } from 'lucide-react';

const PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'quarter', label: 'Last 90 Days' },
  { value: 'year', label: 'Last Year' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangePicker() {
  const { dateFilter, setDateRange, applyPreset } = useDateFilter();
  const [localStartDate, setLocalStartDate] = useState(dateFilter.startDate);
  const [localEndDate, setLocalEndDate] = useState(dateFilter.endDate);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(dateFilter.preset || 'month');
  const [error, setError] = useState<string>('');

  // Sync local state with context when context changes
  useEffect(() => {
    setLocalStartDate(dateFilter.startDate);
    setLocalEndDate(dateFilter.endDate);
    setSelectedPreset(dateFilter.preset || 'custom');
  }, [dateFilter]);

  const handlePresetClick = (preset: DatePreset) => {
    setError('');
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      applyPreset(preset);
    }
  };

  const handleApplyCustom = () => {
    setError('');

    // Validate dates
    const start = new Date(localStartDate);
    const end = new Date(localEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid dates');
      return;
    }

    if (end < start) {
      setError('End date must be after start date');
      return;
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      setError('Date range cannot exceed 1 year');
      return;
    }

    setDateRange(localStartDate, localEndDate, 'custom');
  };

  const formatDateRange = () => {
    const start = new Date(dateFilter.startDate);
    const end = new Date(dateFilter.endDate);

    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
  };

  return (
    <div className="date-range-picker">
      <div className="date-range-header">
        <Calendar className="calendar-icon" size={20} />
        <span className="date-range-display">{formatDateRange()}</span>
      </div>

      <div className="preset-buttons">
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`preset-btn ${selectedPreset === option.value ? 'active' : ''}`}
            onClick={() => handlePresetClick(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selectedPreset === 'custom' && (
        <div className="custom-date-inputs">
          <div className="date-input-group">
            <label htmlFor="start-date">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              max={localEndDate}
            />
          </div>

          <div className="date-input-group">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              min={localStartDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button
            type="button"
            className="apply-btn"
            onClick={handleApplyCustom}
          >
            Apply
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <style jsx>{`
        .date-range-picker {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .date-range-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .calendar-icon {
          color: #6b7280;
        }

        .date-range-display {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .preset-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .preset-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .preset-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .preset-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .custom-date-inputs {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .date-input-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .date-input-group label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
        }

        .date-input-group input[type="date"] {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #111827;
        }

        .date-input-group input[type="date"]:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .apply-btn {
          padding: 8px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          height: fit-content;
        }

        .apply-btn:hover {
          background: #2563eb;
        }

        .error-message {
          margin-top: 12px;
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .preset-buttons {
            gap: 6px;
          }

          .preset-btn {
            padding: 6px 12px;
            font-size: 13px;
          }

          .custom-date-inputs {
            flex-direction: column;
            align-items: stretch;
          }

          .apply-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
