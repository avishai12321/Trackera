'use client';
import { useState, useEffect, Suspense, useCallback } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, getCompanySchema } from '@/lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import {
    Plus, Loader, ChevronLeft, ChevronRight,
    Settings, X, Clock, RefreshCw, Users, MapPin, Video
} from 'lucide-react';

interface Attendee {
    email: string;
    displayName: string | null;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    organizer: boolean;
    self: boolean;
    optional: boolean;
}

interface CalendarEvent {
    id: string;
    timeEntryId?: string; // The actual time entry ID in the database
    title: string;
    description?: string | null;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    source: 'google' | 'manual';
    projectId?: string | null;
    confirmed?: boolean;
    location?: string | null;
    organizer?: string | null;
    attendees?: Attendee[];
    attendeesCount?: number;
    conferenceLink?: string | null;
    eventStatus?: string;
}

interface Project {
    id: string;
    name: string;
    code: string | null;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
}

interface TimeSlot {
    id: string;
    dayIndex: number;
    hour: number;
    projectId: string;
    confirmed: boolean;
    description?: string;
}

interface WorkingHours {
    startHour: number;
    endHour: number;
    workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
    slotDuration: number; // in minutes: 15, 30, 60, 120
}

function CalendarContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status');

    // Week navigation
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const diff = today.getDate() - dayOfWeek;
        return new Date(today.setDate(diff));
    });

    // Data
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});

    // Working hours configuration
    const [workingHours, setWorkingHours] = useState<WorkingHours>({
        startHour: 8,
        endHour: 17,
        workDays: [0, 1, 2, 3, 4], // Sunday to Thursday
        slotDuration: 60 // Default 1 hour slots
    });
    const [showSettings, setShowSettings] = useState(false);

    // Selection state
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showAddSlotModal, setShowAddSlotModal] = useState(false);
    const [addSlotData, setAddSlotData] = useState<{ dayIndex: number; hour: number; minute: number; endHour?: number; endMinute?: number } | null>(null);
    const [showEventDetails, setShowEventDetails] = useState(false);
    const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ dayIndex: number; slotIndex: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ dayIndex: number; slotIndex: number } | null>(null);

    // Days of week starting from Sunday
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate time slots based on duration
    const generateTimeSlots = () => {
        const slots: { hour: number; minute: number }[] = [];
        const slotsPerHour = 60 / workingHours.slotDuration;
        for (let h = workingHours.startHour; h < workingHours.endHour; h++) {
            for (let s = 0; s < slotsPerHour; s++) {
                slots.push({ hour: h, minute: s * workingHours.slotDuration });
            }
        }
        return slots;
    };
    const visibleTimeSlots = generateTimeSlots();

    // Generate hours array (0-23) for settings dropdowns
    const allHours = Array.from({ length: 24 }, (_, i) => i);

    useEffect(() => {
        if (status === 'success') {
            alert('Calendar connected successfully! Syncing your events...');
            router.replace('/calendar');
            setTimeout(() => fetchData(), 2000);
        }
    }, [status, router]);

    useEffect(() => {
        fetchData();
    }, [currentWeekStart]);

    // Load working hours from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('workingHours');
        if (saved) {
            setWorkingHours(JSON.parse(saved));
        }
    }, []);

    // Global mouse up handler to end drag even if mouse is released outside table
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleCellMouseUp();
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, dragStart, dragEnd]);

    const saveWorkingHours = (hours: WorkingHours) => {
        setWorkingHours(hours);
        localStorage.setItem('workingHours', JSON.stringify(hours));
    };

    const getWeekDates = () => {
        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates();

    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        const token = session.access_token;
        const tenantId = session.user.user_metadata?.company_id;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId } };
            const schema = await getCompanySchema();

            // Fetch connections
            const connRes = await axios.get('http://localhost:3000/calendar/connections', config);
            setConnections(connRes.data);

            // Fetch projects from Supabase
            const { data: projectsData, error: projectsError } = await supabase
                .schema(schema)
                .from('projects')
                .select('id, name, code')
                .eq('status', 'ACTIVE')
                .order('name');

            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            // Fetch employees from Supabase
            const { data: employeesData, error: employeesError } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);

            // Fetch calendar events for the week
            const startDate = currentWeekStart.toISOString().split('T')[0];
            const endDate = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Fetch calendar suggestions (Google/Microsoft events that haven't been assigned yet)
            const sRes = await axios.get(`http://localhost:3000/time-entries/suggestions?startDate=${startDate}&endDate=${endDate}`, config);
            const calendarSuggestions = sRes.data.map((s: any) => ({
                id: s.id,
                title: s.title,
                description: s.description || null,
                startTime: s.startTime,
                endTime: s.endTime,
                durationMinutes: s.durationMinutes,
                source: 'google',
                projectId: null, // Suggestions are unassigned
                confirmed: false,
                location: s.location || null,
                organizer: s.organizer || null,
                attendees: s.attendees || [],
                attendeesCount: s.attendeesCount || 0,
                conferenceLink: s.conferenceLink || null,
                eventStatus: s.eventStatus || 'confirmed'
            }));

            // Fetch ALL time entries (both manual and calendar-linked)
            let allTimeEntries: any[] = [];
            try {
                const timeEntriesRes = await axios.get(`http://localhost:3000/time-entries?from=${startDate}&to=${endDate}`, config);
                console.log('Time entries response:', timeEntriesRes.data);
                allTimeEntries = (timeEntriesRes.data || [])
                    .filter((entry: any) => entry.start_time && entry.end_time) // Only include entries with valid times
                    .map((entry: any) => {
                        // Check if this is linked to a calendar event or is manual
                        const isCalendarLinked = entry.calendar_event_id != null;

                        return {
                            id: isCalendarLinked ? entry.calendar_event_id : `time-${entry.id}`, // Use calendar event ID if linked, otherwise use time entry ID
                            timeEntryId: entry.id, // Store the actual time entry ID
                            title: entry.description || entry.project?.name || 'Time Entry',
                            description: entry.description || null,
                            startTime: entry.start_time,
                            endTime: entry.end_time,
                            durationMinutes: entry.minutes,
                            source: isCalendarLinked ? 'google' : 'manual', // Mark calendar-linked entries appropriately
                            projectId: entry.project_id,
                            confirmed: true, // All time entries are confirmed (they're already in the DB)
                            location: null,
                            organizer: null,
                            attendees: [],
                            attendeesCount: 0,
                            conferenceLink: null,
                            eventStatus: 'confirmed'
                        };
                    });
                console.log('Mapped time entries:', allTimeEntries);
            } catch (timeEntriesError) {
                console.warn('Failed to fetch time entries:', timeEntriesError);
                // Continue without time entries
            }

            // Combine unassigned calendar suggestions with all time entries (assigned calendar events + manual)
            setCalendarEvents([...calendarSuggestions, ...allTimeEntries]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (provider: 'google' | 'microsoft') => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const token = session.access_token;
        const tenantId = session.user.user_metadata?.company_id;

        try {
            const res = await axios.get(`http://localhost:3000/calendar/connect/${provider}`, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
            });
            window.location.href = res.data.url;
        } catch (err) {
            alert('Failed to initiate connection');
        }
    };

    const handleSync = async (connectionId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const token = session.access_token;
        const tenantId = session.user.user_metadata?.company_id;

        setSyncing(prev => ({ ...prev, [connectionId]: true }));
        try {
            await axios.post(`http://localhost:3000/calendar/sync/${connectionId}`, {}, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
            });
            setTimeout(() => {
                fetchData();
                setSyncing(prev => ({ ...prev, [connectionId]: false }));
            }, 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to sync');
            setSyncing(prev => ({ ...prev, [connectionId]: false }));
        }
    };

    const goToPrevWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart);
    };

    const goToNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart);
    };

    const goToToday = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek;
        setCurrentWeekStart(new Date(today.setDate(diff)));
    };

    // Get events for a specific day and time slot
    const getEventsForSlot = (dayIndex: number, hour: number, minute: number = 0) => {
        const date = weekDates[dayIndex];
        const slotDuration = workingHours.slotDuration;
        return calendarEvents.filter(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            const eventHour = eventStart.getHours();
            const eventMinute = eventStart.getMinutes();

            // Check if event starts within this time slot
            const eventStartMinutes = eventHour * 60 + eventMinute;
            const slotStartMinutes = hour * 60 + minute;
            const slotEndMinutes = slotStartMinutes + slotDuration;

            return eventStart.toDateString() === date.toDateString() &&
                eventStartMinutes >= slotStartMinutes &&
                eventStartMinutes < slotEndMinutes;
        });
    };

    // Calculate how many slots an event spans
    const getEventSlotSpan = (event: CalendarEvent) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const durationMs = eventEnd.getTime() - eventStart.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const slotsSpanned = Math.ceil(durationMinutes / workingHours.slotDuration);
        return slotsSpanned;
    };

    // Check if this slot should display an event (is the first slot of that event)
    const isEventStartSlot = (event: CalendarEvent, slotHour: number, slotMinute: number) => {
        const eventStart = new Date(event.startTime);
        const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
        const slotStartMinutes = slotHour * 60 + slotMinute;
        const slotEndMinutes = slotStartMinutes + workingHours.slotDuration;

        // Event should be displayed in the slot where it starts
        return eventStartMinutes >= slotStartMinutes && eventStartMinutes < slotEndMinutes;
    };

    // Calculate the offset position within the slot (in pixels)
    const getEventOffsetInSlot = (event: CalendarEvent, slotHour: number, slotMinute: number) => {
        const eventStart = new Date(event.startTime);
        const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
        const slotStartMinutes = slotHour * 60 + slotMinute;

        // Calculate how many minutes into the slot the event starts
        const minutesIntoSlot = eventStartMinutes - slotStartMinutes;

        // Calculate the pixel offset based on slot duration
        const heightPerSlot = workingHours.slotDuration <= 30 ? 40 : 60;
        const pixelsPerMinute = heightPerSlot / workingHours.slotDuration;

        return minutesIntoSlot * pixelsPerMinute;
    };

    // Get time slots for a specific day and hour
    const getTimeSlotsForCell = (dayIndex: number, hour: number) => {
        return timeSlots.filter(slot => slot.dayIndex === dayIndex && slot.hour === hour);
    };

    // Handle slot click (for selection)
    const handleSlotClick = (slotId: string, event: React.MouseEvent) => {
        const calEvent = calendarEvents.find(e => e.id === slotId);
        if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd
            setSelectedSlots(prev => {
                const newSet = new Set(prev);
                if (newSet.has(slotId)) {
                    newSet.delete(slotId);
                } else {
                    newSet.add(slotId);
                }
                return newSet;
            });
        } else if (event.shiftKey) {
            // Shift+click to assign directly
            setSelectedSlots(new Set([slotId]));
            setShowProjectModal(true);
        } else {
            // Single click - show event details
            setSelectedSlots(new Set([slotId]));
            if (calEvent) {
                setSelectedEventDetails(calEvent);
                setShowEventDetails(true);
            }
        }
    };

    // Handle empty cell click (to add new time slot)
    const handleEmptyCellClick = (dayIndex: number, hour: number, minute: number) => {
        setAddSlotData({ dayIndex, hour, minute });
        setShowAddSlotModal(true);
    };

    // Drag handlers for multi-slot selection
    const handleCellMouseDown = (dayIndex: number, slotIndex: number, events: CalendarEvent[]) => {
        if (events.length > 0) return; // Don't start drag if cell has events
        setIsDragging(true);
        setDragStart({ dayIndex, slotIndex });
        setDragEnd({ dayIndex, slotIndex });
    };

    const handleCellMouseEnter = (dayIndex: number, slotIndex: number) => {
        if (!isDragging || !dragStart) return;
        // Only allow vertical drag on same day
        if (dayIndex === dragStart.dayIndex) {
            setDragEnd({ dayIndex, slotIndex });
        }
    };

    const handleCellMouseUp = () => {
        if (!isDragging || !dragStart || !dragEnd) {
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
            return;
        }

        const startSlotIdx = Math.min(dragStart.slotIndex, dragEnd.slotIndex);
        const endSlotIdx = Math.max(dragStart.slotIndex, dragEnd.slotIndex);
        const numSlots = endSlotIdx - startSlotIdx + 1;

        if (numSlots === 1) {
            // Single slot click
            const slot = visibleTimeSlots[startSlotIdx];
            setAddSlotData({ dayIndex: dragStart.dayIndex, hour: slot.hour, minute: slot.minute });
        } else {
            // Multi-slot drag
            const startSlot = visibleTimeSlots[startSlotIdx];
            const endSlot = visibleTimeSlots[endSlotIdx];
            // Calculate end time (end of the last slot)
            const endMinuteTotal = endSlot.hour * 60 + endSlot.minute + workingHours.slotDuration;
            const endHour = Math.floor(endMinuteTotal / 60);
            const endMinute = endMinuteTotal % 60;
            setAddSlotData({
                dayIndex: dragStart.dayIndex,
                hour: startSlot.hour,
                minute: startSlot.minute,
                endHour,
                endMinute
            });
        }

        setShowAddSlotModal(true);
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
    };

    // Check if a cell is in the drag selection
    const isCellInDragSelection = (dayIndex: number, slotIndex: number) => {
        if (!isDragging || !dragStart || !dragEnd) return false;
        if (dayIndex !== dragStart.dayIndex) return false;
        const minIdx = Math.min(dragStart.slotIndex, dragEnd.slotIndex);
        const maxIdx = Math.max(dragStart.slotIndex, dragEnd.slotIndex);
        return slotIndex >= minIdx && slotIndex <= maxIdx;
    };

    // Assign project to selected events
    const assignProjectToSelected = async (projectId: string, employeeId: string, startTime: string, endTime: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const token = session.access_token;
        const tenantId = session.user.user_metadata?.company_id;

        try {
            for (const slotId of selectedSlots) {
                const event = calendarEvents.find(e => e.id === slotId);
                if (event) {
                    // Calculate duration from provided times
                    const start = new Date(startTime);
                    const end = new Date(endTime);
                    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

                    await axios.post('http://localhost:3000/time-entries', {
                        projectId,
                        employeeId,
                        description: event.title,
                        startTime,
                        endTime,
                        durationMinutes,
                        billable: true,
                        confirmed: false,
                        calendarEventId: event.source === 'google' ? event.id : undefined // Link to calendar event
                    }, {
                        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
                    });
                }
            }
            setSelectedSlots(new Set());
            setShowProjectModal(false);
            await fetchData(); // Wait for refresh to show updated colors
        } catch (err) {
            console.error('Failed to assign project:', err);
            alert('Failed to assign project');
        }
    };

    // Add manual time slot
    const addManualSlot = async (projectId: string, employeeId: string, description: string) => {
        if (!addSlotData) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const token = session.access_token;
        const tenantId = session.user.user_metadata?.company_id;

        const date = weekDates[addSlotData.dayIndex];
        let startTime = new Date(date);
        startTime.setHours(addSlotData.hour, addSlotData.minute, 0, 0);

        let endTime = new Date(date);
        if (addSlotData.endHour !== undefined && addSlotData.endMinute !== undefined) {
            // Multi-slot drag - use specified end time
            endTime.setHours(addSlotData.endHour, addSlotData.endMinute, 0, 0);
        } else {
            // Single slot - use slot duration
            endTime.setHours(addSlotData.hour, addSlotData.minute + workingHours.slotDuration, 0, 0);
        }

        // Check for overlapping events and adjust start time if needed
        const overlappingEvents = calendarEvents.filter(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            const isSameDay = eventStart.toDateString() === date.toDateString();

            // Check if there's any overlap
            return isSameDay && (
                (startTime >= eventStart && startTime < eventEnd) || // New start is during an event
                (endTime > eventStart && endTime <= eventEnd) || // New end is during an event
                (startTime <= eventStart && endTime >= eventEnd) // New event completely contains an existing event
            );
        });

        // If there are overlapping events, adjust the start time to after the last overlapping event
        if (overlappingEvents.length > 0) {
            // Find the latest end time among overlapping events
            const latestEndTime = overlappingEvents.reduce((latest, event) => {
                const eventEnd = new Date(event.endTime);
                return eventEnd > latest ? eventEnd : latest;
            }, new Date(0));

            // Set the new start time to be right after the last event ends
            startTime = new Date(latestEndTime);

            // Recalculate end time based on the intended duration
            const intendedDuration = endTime.getTime() - new Date(date).setHours(addSlotData.hour, addSlotData.minute, 0, 0);
            endTime = new Date(startTime.getTime() + intendedDuration);
        }

        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        try {
            await axios.post('http://localhost:3000/time-entries', {
                projectId,
                employeeId,
                description,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                durationMinutes,
                billable: true,
                confirmed: false
            }, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
            });
            setShowAddSlotModal(false);
            setAddSlotData(null);
            fetchData();
        } catch (err) {
            alert('Failed to add time slot');
        }
    };

    // Format hour for display
    const formatHour = (hour: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:00 ${ampm}`;
    };

    // Format time slot for display (hour and minute)
    const formatTimeSlot = (hour: number, minute: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    };

    // Check if a day is a work day
    const isWorkDay = (dayIndex: number) => workingHours.workDays.includes(dayIndex);

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Weekly Calendar</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Manage your time and assign meetings to projects.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {connections.length > 0 && (
                        <button
                            onClick={() => handleSync(connections[0].id)}
                            disabled={syncing[connections[0]?.id]}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={16} className={syncing[connections[0]?.id] ? 'animate-spin' : ''} />
                            Sync Calendar
                        </button>
                    )}
                </div>
            </div>

            {/* Connect Calendar (if not connected) */}
            {connections.length === 0 && (
                <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Connect Your Calendar</h3>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Connect your Google or Microsoft calendar to sync your meetings.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => handleConnect('google')} className="btn" style={{ background: '#DB4437', color: 'white' }}>
                            Connect Google Calendar
                        </button>
                        <button onClick={() => handleConnect('microsoft')} className="btn" style={{ background: '#0078D4', color: 'white' }}>
                            Connect Microsoft Calendar
                        </button>
                    </div>
                </div>
            )}

            {/* Week Navigation */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={goToPrevWeek} className="btn" style={{ padding: '0.5rem' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>
                            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </h3>
                        <button onClick={goToToday} className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                            Today
                        </button>
                    </div>
                    <button onClick={goToNextWeek} className="btn" style={{ padding: '0.5rem' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Multi-select info */}
            {selectedSlots.size > 1 && (
                <div className="card" style={{ marginBottom: '1rem', background: '#eff6ff', border: '1px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>{selectedSlots.size}</strong> items selected (Ctrl+Click to select more)</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setShowProjectModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                                Assign to Project
                            </button>
                            <button onClick={() => setSelectedSlots(new Set())} className="btn" style={{ fontSize: '0.8rem' }}>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            <div className="card" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                {/* Settings Gear Icon */}
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            background: showSettings ? '#3b82f6' : '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: showSettings ? 'white' : '#64748b',
                            transition: 'all 0.2s'
                        }}
                        title="Calendar Settings"
                    >
                        <Settings size={18} />
                    </button>

                    {/* Settings Dropdown */}
                    {showSettings && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            minWidth: '280px',
                            zIndex: 100
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Calendar Settings</h4>

                            {/* Working Hours */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>Working Hours</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select
                                        value={workingHours.startHour}
                                        onChange={e => saveWorkingHours({ ...workingHours, startHour: parseInt(e.target.value) })}
                                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
                                    >
                                        {allHours.map(h => (
                                            <option key={h} value={h}>{formatHour(h)}</option>
                                        ))}
                                    </select>
                                    <span style={{ color: '#64748b' }}>to</span>
                                    <select
                                        value={workingHours.endHour}
                                        onChange={e => saveWorkingHours({ ...workingHours, endHour: parseInt(e.target.value) })}
                                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
                                    >
                                        {allHours.map(h => (
                                            <option key={h} value={h}>{formatHour(h)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Time Slot Duration */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>Time Slot Duration</label>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {[15, 30, 60, 120].map(duration => (
                                        <button
                                            key={duration}
                                            onClick={() => saveWorkingHours({ ...workingHours, slotDuration: duration })}
                                            style={{
                                                flex: 1,
                                                padding: '0.4rem 0.5rem',
                                                fontSize: '0.75rem',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '4px',
                                                background: workingHours.slotDuration === duration ? '#3b82f6' : '#f8fafc',
                                                color: workingHours.slotDuration === duration ? 'white' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {duration === 60 ? '1hr' : duration === 120 ? '2hr' : `${duration}m`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Work Days */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>Visible Days</label>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {daysOfWeek.map((day, idx) => (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const newDays = workingHours.workDays.includes(idx)
                                                    ? workingHours.workDays.filter(d => d !== idx)
                                                    : [...workingHours.workDays, idx].sort();
                                                saveWorkingHours({ ...workingHours, workDays: newDays });
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.4rem 0.25rem',
                                                fontSize: '0.7rem',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '4px',
                                                background: workingHours.workDays.includes(idx) ? '#3b82f6' : '#f8fafc',
                                                color: workingHours.workDays.includes(idx) ? 'white' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            title={day}
                                        >
                                            {shortDays[idx]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader className="animate-spin" size={24} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                        Loading calendar...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    <th style={{
                                        width: '80px',
                                        padding: '0.75rem 0.5rem',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e2e8f0',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 2
                                    }}>
                                        Time
                                    </th>
                                    {weekDates.filter((_, idx) => workingHours.workDays.includes(idx)).map((date, _) => {
                                        const originalIdx = weekDates.indexOf(date);
                                        return (
                                            <th
                                                key={originalIdx}
                                                style={{
                                                    minWidth: '120px',
                                                    padding: '0.75rem 0.5rem',
                                                    background: '#f8fafc',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <div style={{ fontWeight: 600 }}>{shortDays[originalIdx]}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTimeSlots.map((slot, slotIdx) => (
                                    <tr key={`${slot.hour}-${slot.minute}`}>
                                        <td style={{
                                            padding: '0.5rem',
                                            background: '#f8fafc',
                                            borderBottom: '1px solid #e2e8f0',
                                            fontSize: '0.75rem',
                                            color: '#64748b',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 1
                                        }}>
                                            {formatTimeSlot(slot.hour, slot.minute)}
                                        </td>
                                        {weekDates.filter((_, idx) => workingHours.workDays.includes(idx)).map((date, _) => {
                                            const dayIdx = weekDates.indexOf(date);
                                            const events = getEventsForSlot(dayIdx, slot.hour, slot.minute);

                                            // Calculate row height based on slot duration
                                            const rowHeight = workingHours.slotDuration <= 30 ? '40px' : '60px';

                                            return (
                                                <td
                                                    key={dayIdx}
                                                    onClick={() => events.length === 0 && handleEmptyCellClick(dayIdx, slot.hour, slot.minute)}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent text selection during drag
                                                        handleCellMouseDown(dayIdx, slotIdx, events);
                                                    }}
                                                    onMouseEnter={() => handleCellMouseEnter(dayIdx, slotIdx)}
                                                    onMouseUp={handleCellMouseUp}
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderBottom: '1px solid #e2e8f0',
                                                        borderRight: '1px solid #f1f5f9',
                                                        background: isCellInDragSelection(dayIdx, slotIdx)
                                                            ? '#dbeafe'
                                                            : 'white',
                                                        verticalAlign: 'top',
                                                        height: rowHeight,
                                                        cursor: events.length === 0
                                                            ? (isDragging ? 'cell' : 'pointer')
                                                            : 'default',
                                                        userSelect: 'none', // Prevent text selection during drag
                                                        position: 'relative',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {events.map(event => {
                                                        // Only render the event in its starting slot
                                                        if (!isEventStartSlot(event, slot.hour, slot.minute)) {
                                                            return null;
                                                        }

                                                        const slotsSpanned = getEventSlotSpan(event);
                                                        const heightPerSlot = workingHours.slotDuration <= 30 ? 40 : 60;
                                                        const eventHeight = slotsSpanned * heightPerSlot - 8; // -8 for padding/margin
                                                        const offsetTop = getEventOffsetInSlot(event, slot.hour, slot.minute);

                                                        // Determine event colors based on assignment status
                                                        let backgroundColor, textColor, borderColor;
                                                        if (selectedSlots.has(event.id)) {
                                                            // Selected state
                                                            backgroundColor = '#3b82f6';
                                                            textColor = 'white';
                                                            borderColor = '#1d4ed8';
                                                        } else if (event.projectId) {
                                                            // Assigned to a project (both manual and calendar-linked)
                                                            if (event.source === 'manual') {
                                                                // Manual time entries
                                                                backgroundColor = '#10b981'; // Emerald green
                                                                textColor = 'white';
                                                            } else {
                                                                // Calendar events assigned to project
                                                                backgroundColor = '#22c55e'; // Bright green
                                                                textColor = 'white';
                                                            }
                                                            borderColor = 'none';
                                                        } else {
                                                            // Unassigned calendar event
                                                            backgroundColor = '#e0e7ff'; // Light indigo
                                                            textColor = '#3730a3';
                                                            borderColor = 'none';
                                                        }

                                                        return (
                                                            <div
                                                                key={event.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSlotClick(event.id, e);
                                                                }}
                                                                style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    marginBottom: '0.25rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.7rem',
                                                                    cursor: 'pointer',
                                                                    background: backgroundColor,
                                                                    color: textColor,
                                                                    border: selectedSlots.has(event.id) ? `2px solid ${borderColor}` : 'none',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'flex-start',
                                                                    gap: '0.25rem',
                                                                    textAlign: 'left',
                                                                    position: 'absolute',
                                                                    left: '0.5rem',
                                                                    right: '0.5rem',
                                                                    top: `${offsetTop}px`,
                                                                    height: `${eventHeight}px`,
                                                                    zIndex: 5,
                                                                    overflow: 'hidden',
                                                                    flexDirection: 'column',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    width: '100%',
                                                                    gap: '0.25rem'
                                                                }}>
                                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                        <div style={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            fontWeight: 500
                                                                        }}>
                                                                            {event.title}
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: '0.6rem',
                                                                            opacity: 0.85,
                                                                            marginTop: '1px'
                                                                        }}>
                                                                            {new Date(event.startTime).toLocaleTimeString('en-US', {
                                                                                hour: 'numeric',
                                                                                minute: '2-digit',
                                                                                hour12: true
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                        {/* Attendee & Conference indicators */}
                                                                        {(event.attendeesCount && event.attendeesCount > 1) && (
                                                                            <span style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '2px',
                                                                                fontSize: '0.6rem',
                                                                                opacity: 0.7
                                                                            }} title={`${event.attendeesCount} attendees`}>
                                                                                <Users size={10} />
                                                                                {event.attendeesCount}
                                                                            </span>
                                                                        )}
                                                                        {event.conferenceLink && (
                                                                            <span title="Has video call">
                                                                                <Video size={10} style={{ opacity: 0.7 }} />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Show time duration if event spans multiple slots */}
                                                                {slotsSpanned > 1 && (
                                                                    <div style={{
                                                                        fontSize: '0.65rem',
                                                                        opacity: 0.8,
                                                                        marginTop: '0.125rem'
                                                                    }}>
                                                                        {event.durationMinutes} min
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {events.length === 0 && (
                                                        <div style={{
                                                            color: '#cbd5e1',
                                                            fontSize: workingHours.slotDuration <= 30 ? '1rem' : '1.25rem',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            +
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#e0e7ff', borderRadius: '2px' }}></span>
                    Calendar Event (Unassigned)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }}></span>
                    Calendar Event (Assigned)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></span>
                    Manual Time Entry
                </span>
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                    Click to view details • Shift+Click to assign • Ctrl+Click to multi-select
                </span>
            </div>

            {/* Project Assignment Modal */}
            {showProjectModal && (
                <AssignModal
                    selectedCount={selectedSlots.size}
                    selectedEvents={Array.from(selectedSlots).map(id => calendarEvents.find(e => e.id === id)).filter(Boolean) as CalendarEvent[]}
                    projects={projects}
                    employees={employees}
                    onClose={() => { setShowProjectModal(false); setSelectedSlots(new Set()); }}
                    onAssign={assignProjectToSelected}
                />
            )}

            {/* Add Time Slot Modal */}
            {showAddSlotModal && addSlotData && (
                <AddSlotModal
                    dayIndex={addSlotData.dayIndex}
                    hour={addSlotData.hour}
                    minute={addSlotData.minute}
                    endHour={addSlotData.endHour}
                    endMinute={addSlotData.endMinute}
                    weekDates={weekDates}
                    projects={projects}
                    employees={employees}
                    formatTimeSlot={formatTimeSlot}
                    shortDays={shortDays}
                    slotDuration={workingHours.slotDuration}
                    calendarEvents={calendarEvents}
                    onClose={() => { setShowAddSlotModal(false); setAddSlotData(null); }}
                    onAdd={addManualSlot}
                />
            )}

            {/* Event Details Modal */}
            {showEventDetails && selectedEventDetails && (
                <EventDetailsModal
                    event={selectedEventDetails}
                    projects={projects}
                    employees={employees}
                    onClose={() => { setShowEventDetails(false); setSelectedEventDetails(null); setSelectedSlots(new Set()); }}
                    onAssign={async (projectId, employeeId, startTime, endTime) => {
                        // Create time entry directly
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        const token = session.access_token;
                        const tenantId = session.user.user_metadata?.company_id;

                        try {
                            const start = new Date(startTime);
                            const end = new Date(endTime);
                            const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

                            await axios.post('http://localhost:3000/time-entries', {
                                projectId,
                                employeeId,
                                description: selectedEventDetails.title,
                                startTime,
                                endTime,
                                durationMinutes,
                                billable: true,
                                confirmed: false
                            }, {
                                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
                            });

                            setShowEventDetails(false);
                            setSelectedEventDetails(null);
                            setSelectedSlots(new Set());
                            fetchData();
                        } catch (err) {
                            alert('Failed to assign project');
                        }
                    }}
                />
            )}
        </DashboardLayout>
    );
}

// Assign Project Modal Component
function AssignModal({
    selectedCount,
    selectedEvents,
    projects,
    employees,
    onClose,
    onAssign
}: {
    selectedCount: number;
    selectedEvents: CalendarEvent[];
    projects: Project[];
    employees: Employee[];
    onClose: () => void;
    onAssign: (projectId: string, employeeId: string, startTime: string, endTime: string) => void;
}) {
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');

    // Get the first selected event's time for default values
    const firstEvent = selectedEvents[0];
    const defaultStartTime = firstEvent ? new Date(firstEvent.startTime) : new Date();
    const defaultEndTime = firstEvent ? new Date(firstEvent.endTime) : new Date();

    // Format time for input (HH:MM)
    const formatTimeForInput = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const [startTime, setStartTime] = useState(formatTimeForInput(defaultStartTime));
    const [endTime, setEndTime] = useState(formatTimeForInput(defaultEndTime));

    const handleSubmit = () => {
        if (!selectedProject || !selectedEmployee) {
            alert('Please select a project and an employee');
            return;
        }

        // Construct full ISO datetime strings using the original date and new times
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const newStartTime = new Date(defaultStartTime);
        newStartTime.setHours(startHour, startMinute, 0, 0);

        const newEndTime = new Date(defaultStartTime);
        newEndTime.setHours(endHour, endMinute, 0, 0);

        onAssign(selectedProject, selectedEmployee, newStartTime.toISOString(), newEndTime.toISOString());
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '90%',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Assign to Project</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>
                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    Assign {selectedCount} meeting{selectedCount > 1 ? 's' : ''} to:
                </p>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project *</label>
                    <select
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee *</label>
                    <select
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    >
                        <option value="">Select Employee</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Time</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem' }}
                        />
                        <span style={{ color: '#64748b' }}>to</span>
                        <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn">Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-primary">
                        Assign
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add Time Slot Modal Component
function AddSlotModal({
    dayIndex,
    hour,
    minute,
    endHour,
    endMinute,
    weekDates,
    projects,
    employees,
    formatTimeSlot,
    shortDays,
    slotDuration,
    onClose,
    onAdd,
    calendarEvents
}: {
    dayIndex: number;
    hour: number;
    minute: number;
    endHour?: number;
    endMinute?: number;
    weekDates: Date[];
    projects: Project[];
    employees: Employee[];
    formatTimeSlot: (h: number, m: number) => string;
    shortDays: string[];
    slotDuration: number;
    onClose: () => void;
    onAdd: (projectId: string, employeeId: string, description: string) => void;
    calendarEvents?: CalendarEvent[];
}) {
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !selectedEmployee) {
            alert('Please select a project and an employee');
            return;
        }
        onAdd(selectedProject, selectedEmployee, description);
    };

    // Format duration for display
    const formatDuration = (mins: number) => {
        const hours = Math.floor(mins / 60);
        const minutes = mins % 60;
        if (hours > 0 && minutes > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return `${minutes} minutes`;
    };

    // Check for overlapping events
    const date = weekDates[dayIndex];
    const startTime = new Date(date);
    startTime.setHours(hour, minute, 0, 0);

    const endTimeCalc = new Date(date);
    if (endHour !== undefined && endMinute !== undefined) {
        endTimeCalc.setHours(endHour, endMinute, 0, 0);
    } else {
        endTimeCalc.setHours(hour, minute + slotDuration, 0, 0);
    }

    const overlappingEvents = calendarEvents?.filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const isSameDay = eventStart.toDateString() === date.toDateString();

        return isSameDay && (
            (startTime >= eventStart && startTime < eventEnd) ||
            (endTimeCalc > eventStart && endTimeCalc <= eventEnd) ||
            (startTime <= eventStart && endTimeCalc >= eventEnd)
        );
    }) || [];

    const hasOverlap = overlappingEvents.length > 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '90%',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Add Time Slot</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {shortDays[dayIndex]}, {weekDates[dayIndex].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <br />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>
                        {formatTimeSlot(hour, minute)} - {endHour !== undefined && endMinute !== undefined ? formatTimeSlot(endHour, endMinute) : formatTimeSlot(hour, minute + slotDuration)}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.8rem' }}>
                        Duration: {formatDuration(endHour !== undefined && endMinute !== undefined ? ((endHour * 60 + endMinute) - (hour * 60 + minute)) : slotDuration)}
                    </span>
                </p>

                {/* Overlap Warning */}
                {hasOverlap && (
                    <div style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.8rem',
                        color: '#92400e'
                    }}>
                        <strong>Note:</strong> This time slot overlaps with {overlappingEvents.length} existing event{overlappingEvents.length > 1 ? 's' : ''}. The start time will be automatically adjusted to begin after the last conflicting event ends.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project *</label>
                        <select
                            value={selectedProject}
                            onChange={e => setSelectedProject(e.target.value)}
                            required
                        >
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee *</label>
                        <select
                            value={selectedEmployee}
                            onChange={e => setSelectedEmployee(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem' }}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What did you work on?"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn">Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} /> Add Slot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Event Details Modal Component with Assignment Form
function EventDetailsModal({
    event,
    projects,
    employees,
    onClose,
    onAssign
}: {
    event: CalendarEvent;
    projects: Project[];
    employees: Employee[];
    onClose: () => void;
    onAssign: (projectId: string, employeeId: string, startTime: string, endTime: string) => void;
}) {
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [showAttendeesList, setShowAttendeesList] = useState(false);

    // Get event times for default values
    const defaultStartTime = new Date(event.startTime);
    const defaultEndTime = new Date(event.endTime);

    // Format time for input (HH:MM)
    const formatTimeForInput = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const [startTime, setStartTime] = useState(formatTimeForInput(defaultStartTime));
    const [endTime, setEndTime] = useState(formatTimeForInput(defaultEndTime));

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const getInitials = (email: string, displayName: string | null) => {
        if (displayName) {
            const parts = displayName.split(' ');
            return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const getResponseColor = (status: string) => {
        switch (status) {
            case 'accepted': return '#10b981';
            case 'tentative': return '#f59e0b';
            case 'declined': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const handleSubmit = () => {
        if (!selectedProject || !selectedEmployee) {
            alert('Please select a project and an employee');
            return;
        }

        // Construct full ISO datetime strings using the original date and new times
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const newStartTime = new Date(defaultStartTime);
        newStartTime.setHours(startHour, startMinute, 0, 0);

        const newEndTime = new Date(defaultStartTime);
        newEndTime.setHours(endHour, endMinute, 0, 0);

        onAssign(selectedProject, selectedEmployee, newStartTime.toISOString(), newEndTime.toISOString());
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                            {event.title}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                            <Clock size={14} />
                            <span>{formatDate(event.startTime)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                        <X size={20} color="#64748b" />
                    </button>
                </div>

                {/* Location */}
                {event.location && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem', color: '#475569' }}>
                        <MapPin size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem' }}>{event.location}</span>
                    </div>
                )}

                {/* Description */}
                {event.description && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#475569',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap'
                    }}>
                        {event.description.length > 200 ? event.description.substring(0, 200) + '...' : event.description}
                    </div>
                )}

                {/* Attendees (expandable) */}
                {event.attendees && event.attendees.length > 0 && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '0.5rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowAttendeesList(!showAttendeesList)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151', fontSize: '0.8rem' }}>
                            <Users size={14} />
                            <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {showAttendeesList ? '(click to collapse)' : '(click to expand)'}
                            </span>
                            <div style={{ display: 'flex', marginLeft: 'auto' }}>
                                {!showAttendeesList && event.attendees.slice(0, 5).map((attendee, idx) => (
                                    <div key={idx} style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: attendee.organizer ? '#8b5cf6' : '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        color: attendee.organizer ? 'white' : '#475569',
                                        marginLeft: idx > 0 ? '-8px' : 0,
                                        border: '2px solid white'
                                    }} title={attendee.displayName || attendee.email}>
                                        {getInitials(attendee.email, attendee.displayName)}
                                    </div>
                                ))}
                                {!showAttendeesList && event.attendees.length > 5 && (
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.55rem',
                                        fontWeight: 600,
                                        color: 'white',
                                        marginLeft: '-8px',
                                        border: '2px solid white'
                                    }}>
                                        +{event.attendees.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Expanded attendee list */}
                        {showAttendeesList && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {event.attendees.map((attendee, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.25rem 0.5rem',
                                        background: 'white',
                                        borderRadius: '4px'
                                    }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: attendee.organizer ? '#8b5cf6' : '#e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.55rem',
                                            fontWeight: 600,
                                            color: attendee.organizer ? 'white' : '#475569',
                                            flexShrink: 0
                                        }}>
                                            {getInitials(attendee.email, attendee.displayName)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{
                                                fontSize: '0.8rem',
                                                fontWeight: attendee.organizer ? 500 : 400,
                                                color: '#1e293b',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {attendee.displayName || attendee.email}
                                                {attendee.organizer && (
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.6rem',
                                                        padding: '0.1rem 0.3rem',
                                                        background: '#8b5cf6',
                                                        color: 'white',
                                                        borderRadius: '3px'
                                                    }}>Organizer</span>
                                                )}
                                            </div>
                                            {attendee.displayName && (
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {attendee.email}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: getResponseColor(attendee.responseStatus),
                                            flexShrink: 0
                                        }} title={attendee.responseStatus} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

                {/* Assignment Form */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project *</label>
                    <select
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee *</label>
                    <select
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                        <option value="">Select Employee</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Time</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Time</label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={onClose} className="btn" style={{ flex: 1 }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1 }}>
                        Assign to Project
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CalendarContent />
        </Suspense>
    );
}
