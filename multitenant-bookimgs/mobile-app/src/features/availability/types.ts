export interface ScheduleRange {
  id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  capacity: number;
}

export interface RangeInput {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  capacity: number;
}

export type ExceptionType = 'BLOCKED' | 'CUSTOM_HOURS';

export interface AvailabilityException {
  id: string;
  service_id: string | null;
  date: string;
  type: ExceptionType;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface ExceptionInput {
  service_id: string;
  date: string;
  type: ExceptionType;
  start_time?: string;
  end_time?: string;
  reason?: string;
}
