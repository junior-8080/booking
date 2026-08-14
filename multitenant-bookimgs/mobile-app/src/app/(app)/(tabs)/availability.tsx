import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { getSchedule } from '@/features/availability/api';
import { DayCard } from '@/features/availability/components/day-card';
import { RangeFormModal } from '@/features/availability/components/range-form-modal';
import { ScheduleRange } from '@/features/availability/types';
import { listServices } from '@/features/services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface RangeModalState {
  dayIndex: number;
  range: ScheduleRange | null;
}

export default function AvailabilityScreen() {
  const queryClient = useQueryClient();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [rangeModal, setRangeModal] = useState<RangeModalState | null>(null);

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', 'active-for-availability'],
    queryFn: () => listServices(false),
  });

  // Default to the first service being active/selected as soon as the list loads.
  useEffect(() => {
    if (!selectedServiceId && services && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const activeServiceId = selectedServiceId ?? services?.[0]?.id ?? null;
  const selectedService = services?.find((s) => s.id === activeServiceId) ?? null;

  const { data: ranges, isLoading: scheduleLoading } = useQuery({
    queryKey: ['availability-schedule', activeServiceId],
    queryFn: () => getSchedule(activeServiceId as string),
    enabled: !!activeServiceId,
  });

  const rangesByDay = useMemo(() => {
    const map: Record<number, ScheduleRange[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    (ranges ?? []).forEach((r) => map[r.day_of_week]?.push(r));
    return map;
  }, [ranges]);

  const invalidateSchedule = () => queryClient.invalidateQueries({ queryKey: ['availability-schedule', activeServiceId] });

  if (servicesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!services || services.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Availability</ThemedText>
        </View>
        <EmptyState icon="clock" title="No services yet" message="Add a service first, then set its weekly hours here." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Availability</ThemedText>
      </View>

      {/* Wraps to multiple lines instead of scrolling horizontally —
          ScrollView's horizontal content view was confirmed (via staged
          isolation testing) to blank out its Text children on-device here,
          while an identical plain View row renders correctly. Wrapping
          sidesteps ScrollView entirely and reads fine for the handful of
          services a tenant realistically has. */}
      <View style={styles.servicePicker}>
        {services.map((service) => {
          const active = service.id === activeServiceId;
          return (
            <Pressable
              key={service.id}
              style={[styles.serviceChip, active && styles.serviceChipActive]}
              onPress={() => setSelectedServiceId(service.id)}
            >
              <Text style={active ? styles.serviceChipLabelActive : styles.serviceChipLabel}>
                {service.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {scheduleLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Weekly hours</ThemedText>
          <View style={styles.days}>
            {DAYS.map((day, index) => (
              <DayCard
                key={index}
                dayLabel={day}
                dayIndex={index}
                ranges={rangesByDay[index] ?? []}
                serviceId={activeServiceId as string}
                defaultSlotDuration={selectedService?.duration_minutes ?? 30}
                onChanged={invalidateSchedule}
                onAddRange={() => setRangeModal({ dayIndex: index, range: null })}
                onEditRange={(range) => setRangeModal({ dayIndex: index, range })}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {activeServiceId && (
        <RangeFormModal
          visible={rangeModal !== null}
          onClose={() => setRangeModal(null)}
          onSaved={() => { setRangeModal(null); invalidateSchedule(); }}
          serviceId={activeServiceId}
          dayOfWeek={rangeModal?.dayIndex ?? 0}
          dayLabel={DAYS[rangeModal?.dayIndex ?? 0] ?? ''}
          range={rangeModal?.range ?? null}
          defaultSlotDuration={selectedService?.duration_minutes ?? 30}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: Brand.text1,
  },
  servicePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  serviceChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F0F0F3',
  },
  serviceChipActive: {
    backgroundColor: Brand.brand,
  },
  serviceChipLabel: {
    color: Brand.text2,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  serviceChipLabelActive: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  sectionTitle: {
    color: Brand.text1,
    fontSize: 16,
  },
  days: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
});
