import { apiRequest } from '@/lib/api-client';
import { AvailabilityException, ExceptionInput, RangeInput, ScheduleRange } from '@/features/availability/types';

export function getSchedule(serviceId: string): Promise<ScheduleRange[]> {
  return apiRequest<ScheduleRange[]>(`/availability/schedule/${serviceId}`);
}

export function createRange(serviceId: string, dayOfWeek: number, data: RangeInput): Promise<ScheduleRange> {
  return apiRequest<ScheduleRange>(`/availability/schedule/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify({ day_of_week: dayOfWeek, ...data }),
  });
}

export function updateRange(id: string, data: Partial<RangeInput>): Promise<ScheduleRange> {
  return apiRequest<ScheduleRange>(`/availability/schedule/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteRange(id: string): Promise<void> {
  return apiRequest<void>(`/availability/schedule/${id}`, { method: 'DELETE' });
}

export function clearDay(serviceId: string, dayOfWeek: number): Promise<void> {
  return apiRequest<void>(`/availability/schedule/${serviceId}/day/${dayOfWeek}`, { method: 'DELETE' });
}

export function getExceptions(serviceId: string): Promise<AvailabilityException[]> {
  return apiRequest<AvailabilityException[]>(`/availability/exceptions/${serviceId}`);
}

export function addException(data: ExceptionInput): Promise<AvailabilityException> {
  return apiRequest<AvailabilityException>('/availability/exceptions', { method: 'POST', body: JSON.stringify(data) });
}

export function deleteException(id: string): Promise<void> {
  return apiRequest<void>(`/availability/exceptions/${id}`, { method: 'DELETE' });
}
