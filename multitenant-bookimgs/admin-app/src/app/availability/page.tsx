'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
import type { Service } from '@/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleRange {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  capacity: number;
}

interface Exception {
  id: string;
  date: string;
  type: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const inp: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--bg)', outline: 'none', color: 'var(--text-1)',
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 0,
        background: on ? 'var(--brand)' : 'var(--border-2)', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.18s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ── Inline range form (add or edit) ──────────────────────────────────────────
function RangeForm({
  initial,
  defaultSlotDuration,
  onSave,
  onCancel,
}: {
  initial?: Partial<ScheduleRange>;
  defaultSlotDuration: number;
  onSave: (data: { start_time: string; end_time: string; slot_duration_minutes: number; capacity: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    start_time: initial?.start_time ?? '09:00',
    end_time: initial?.end_time ?? '17:00',
    slot_duration_minutes: initial?.slot_duration_minutes ?? defaultSlotDuration,
    capacity: initial?.capacity ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const isValid = form.start_time < form.end_time && form.capacity >= 1 && form.slot_duration_minutes >= 5;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Opens</div>
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Closes</div>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Seats per slot</div>
          <div style={{ position: 'relative' }}>
            <input
              type="number" min={1}
              value={form.capacity}
              onFocus={e => e.target.select()}
              onChange={e => set('capacity', +e.target.value)}
              style={{ ...inp, width: 72, paddingRight: 36 }}
            />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-3)', pointerEvents: 'none' }}>ppl</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Slot</div>
          <div style={{ position: 'relative' }}>
            <input
              type="number" min={5} step={5}
              value={form.slot_duration_minutes}
              onFocus={e => e.target.select()}
              onChange={e => set('slot_duration_minutes', +e.target.value)}
              style={{ ...inp, width: 72, paddingRight: 32 }}
            />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-3)', pointerEvents: 'none' }}>min</span>
          </div>
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--danger-fg)' }}>{error}</div>}
      {!isValid && form.start_time >= form.end_time && (
        <div style={{ fontSize: 12, color: 'var(--danger-fg)' }}>Close must be after open</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValid}
          style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: isValid ? 'var(--brand)' : 'var(--border-2)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isValid ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Day row ───────────────────────────────────────────────────────────────────
function DayRow({
  day, index, ranges, serviceId, defaultSlotDuration,
  onRangeCreated, onRangeUpdated, onRangeDeleted, onDayCleared,
}: {
  day: string;
  index: number;
  ranges: ScheduleRange[];
  serviceId: string;
  defaultSlotDuration: number;
  onRangeCreated: (r: ScheduleRange) => void;
  onRangeUpdated: (r: ScheduleRange) => void;
  onRangeDeleted: (id: string) => void;
  onDayCleared: (dayIndex: number) => void;
}) {
  const active = ranges.length > 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Reset edit state when service changes
  useEffect(() => { setEditingId(null); setShowAdd(false); }, [serviceId]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (active) {
        await adminApi.clearDay(serviceId, index);
        onDayCleared(index);
        setShowAdd(false);
        setEditingId(null);
      } else {
        const created = await adminApi.createRange(serviceId, {
          day_of_week: index,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: defaultSlotDuration,
          capacity: 1,
        }) as unknown as ScheduleRange;
        onRangeCreated(created);
      }
    } finally { setToggling(false); }
  };

  const handleAddRange = async (data: { start_time: string; end_time: string; slot_duration_minutes: number; capacity: number }) => {
    const created = await adminApi.createRange(serviceId, { day_of_week: index, ...data }) as unknown as ScheduleRange;
    onRangeCreated(created);
    setShowAdd(false);
  };

  const handleUpdateRange = (id: string) => async (data: { start_time: string; end_time: string; slot_duration_minutes: number; capacity: number }) => {
    const updated = await adminApi.updateRange(id, data) as unknown as ScheduleRange;
    onRangeUpdated(updated);
    setEditingId(null);
  };

  const handleDeleteRange = async (id: string) => {
    await adminApi.deleteRange(id);
    onRangeDeleted(id);
  };

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: active ? 'var(--surface)' : 'var(--bg)',
      overflow: 'hidden',
      opacity: toggling ? 0.6 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <Toggle on={active} onChange={handleToggle} />
        <span style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--text-1)' : 'var(--text-3)', flex: 1 }}>
          {day}
        </span>
        {active ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {ranges.length} range{ranges.length !== 1 ? 's' : ''}
            </span>
            {!showAdd && (
              <button
                onClick={() => { setShowAdd(true); setEditingId(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-2)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add range
              </button>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Closed</span>
        )}
      </div>

      {/* Ranges + add form */}
      {active && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px' }}>

          {ranges.map(range => (
            <div key={range.id}>
              {editingId === range.id ? (
                <RangeForm
                  initial={range}
                  defaultSlotDuration={defaultSlotDuration}
                  onSave={handleUpdateRange(range.id)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                      {range.start_time} – {range.end_time}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-subtle)', color: 'var(--text-2)', fontWeight: 500 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        {range.capacity} per slot
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-subtle)', color: 'var(--text-2)', fontWeight: 500 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {range.slot_duration_minutes} min
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditingId(range.id); setShowAdd(false); }}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, cursor: 'pointer', color: 'var(--text-2)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRange(range.id)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Remove range"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAdd && (
            <RangeForm
              defaultSlotDuration={defaultSlotDuration}
              onSave={handleAddRange}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Exception form ────────────────────────────────────────────────────────────
const EMPTY_EX = { date: '', type: 'BLOCKED' as 'BLOCKED' | 'CUSTOM_HOURS', start_time: '', end_time: '', reason: '' };

function ExceptionForm({ serviceId, onAdded, onCancel }: { serviceId: string; onAdded: (ex: Exception) => void; onCancel: () => void }) {
  const [form, setForm] = useState(EMPTY_EX);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const isValid = form.date.length > 0 && (form.type === 'BLOCKED' || (form.start_time < form.end_time));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = await adminApi.addException({
        service_id: serviceId,
        date: form.date,
        type: form.type,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        reason: form.reason || undefined,
      }) as unknown as Exception;
      onAdded(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>New exception</div>
      {error && <div style={{ fontSize: 13, color: 'var(--danger-fg)', padding: '8px 12px', borderRadius: 7, background: 'var(--danger-bg)' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Date</div>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Type</div>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
            <option value="BLOCKED">Closed — block all slots</option>
            <option value="CUSTOM_HOURS">Custom hours</option>
          </select>
        </div>
      </div>
      {form.type === 'CUSTOM_HOURS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Opens</div>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} required style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Closes</div>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} required style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Reason <span style={{ fontWeight: 400 }}>(optional)</span></div>
        <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Public holiday, staff training…" style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-1)' }}>Cancel</button>
        <button type="submit" disabled={saving || !isValid} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: isValid ? 'var(--brand)' : 'var(--border-2)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isValid ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Add exception'}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [ranges, setRanges] = useState<ScheduleRange[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [showAddException, setShowAddException] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.listServices().then(s => {
      setServices(s as Service[]);
      if ((s as Service[])[0]) setSelectedServiceId((s as Service[])[0].id);
    });
  }, []);

  const loadData = useCallback(async (serviceId: string) => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const [sched, ex] = await Promise.all([
        adminApi.getSchedule(serviceId),
        adminApi.getExceptions(serviceId),
      ]);
      setRanges(sched as ScheduleRange[]);
      setExceptions((ex as Exception[]).sort((a, b) => a.date.localeCompare(b.date)));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(selectedServiceId); }, [selectedServiceId, loadData]);

  const rangesByDay = DAYS.reduce<Record<number, ScheduleRange[]>>((acc, _, i) => {
    acc[i] = ranges.filter(r => r.day_of_week === i);
    return acc;
  }, {});

  const selectedService = services.find(s => s.id === selectedServiceId);
  const defaultSlotDuration = selectedService?.duration_minutes ?? 30;

  const handleRangeCreated = (r: ScheduleRange) => setRanges(prev => [...prev, r].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
  const handleRangeUpdated = (r: ScheduleRange) => setRanges(prev => prev.map(x => x.id === r.id ? r : x));
  const handleRangeDeleted = (id: string) => setRanges(prev => prev.filter(r => r.id !== id));
  const handleDayCleared = (dayIndex: number) => setRanges(prev => prev.filter(r => r.day_of_week !== dayIndex));

  const handleExceptionAdded = (ex: Exception) => {
    setExceptions(prev => [...prev, ex].sort((a, b) => a.date.localeCompare(b.date)));
    setShowAddException(false);
  };

  const removeException = async (id: string) => {
    await adminApi.deleteException(id);
    setExceptions(prev => prev.filter(e => e.id !== id));
  };

  return (
    <DashboardShell>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Availability</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Set weekly hours and manage closures per service.</p>
        </div>
      </div>

      {/* Service tabs */}
      {services.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 28, background: 'var(--bg-subtle)', padding: 4, borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' }}>
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedServiceId(s.id); setShowAddException(false); }}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, cursor: 'pointer',
                background: selectedServiceId === s.id ? 'var(--surface)' : 'transparent',
                color: selectedServiceId === s.id ? 'var(--text-1)' : 'var(--text-2)',
                fontWeight: selectedServiceId === s.id ? 600 : 400,
                boxShadow: selectedServiceId === s.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <div style={{ fontSize: 14 }}>No services yet — add a service first.</div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div className="availability-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* Weekly hours */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Weekly hours</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                {selectedService?.name} — toggle days, add time ranges, and set how many people can book each slot
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DAYS.map((day, i) => (
                <DayRow
                  key={i}
                  day={day}
                  index={i}
                  ranges={rangesByDay[i] ?? []}
                  serviceId={selectedServiceId}
                  defaultSlotDuration={defaultSlotDuration}
                  onRangeCreated={handleRangeCreated}
                  onRangeUpdated={handleRangeUpdated}
                  onRangeDeleted={handleRangeDeleted}
                  onDayCleared={handleDayCleared}
                />
              ))}
            </div>
          </div>

          {/* Exceptions */}
          <div className="exceptions-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Exceptions</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Closures and custom hours for specific dates</div>
              </div>
              {!showAddException && (
                <button
                  onClick={() => setShowAddException(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-1)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add
                </button>
              )}
            </div>

            {showAddException && (
              <div style={{ marginBottom: 10 }}>
                <ExceptionForm serviceId={selectedServiceId} onAdded={handleExceptionAdded} onCancel={() => setShowAddException(false)} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exceptions.length === 0 && !showAddException && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', border: '1.5px dashed var(--border)', borderRadius: 10 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <div style={{ fontSize: 13 }}>No exceptions — all regular hours apply</div>
                </div>
              )}
              {exceptions.map(ex => {
                const isBlocked = ex.type === 'BLOCKED';
                const dateLabel = new Date(ex.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: isBlocked ? 'var(--danger-fg)' : 'var(--warning-fg)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{dateLabel}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: isBlocked ? 'var(--danger-bg)' : 'var(--warning-bg)', color: isBlocked ? 'var(--danger-fg)' : 'var(--warning-fg)' }}>
                          {isBlocked ? 'Closed' : 'Custom hours'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {!isBlocked && ex.start_time && `${ex.start_time} – ${ex.end_time}`}
                        {ex.reason && <span style={{ color: 'var(--text-3)', marginLeft: !isBlocked && ex.start_time ? 8 : 0 }}>{ex.reason}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeException(ex.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      title="Remove exception"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </DashboardShell>
  );
}
