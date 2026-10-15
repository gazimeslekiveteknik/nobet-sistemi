import type { Assignment, Teacher, Lesson, Slot, Zone } from '../types';
import { calculateAvailability } from './availability';

export function zoneAllowsSlot(zone: Zone, slot: Slot): boolean {
  if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) return false;
  if (zone.activeSlotTypes && !zone.activeSlotTypes.includes(slot.type)) return false;
  if (slot.type === 'OPENING') return zone.startPeriod === undefined || zone.startPeriod <= 1;
  if (slot.type === 'CLOSING') return zone.endPeriod === undefined || zone.endPeriod >= (slot.afterLesson ?? 8);
  return (zone.startPeriod === undefined || (slot.afterLesson ?? 0) >= zone.startPeriod - 1)
    && (zone.endPeriod === undefined || (slot.afterLesson ?? 0) < zone.endPeriod);
}

export function overlaps(a: Slot, b: Slot): boolean {
  return a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime;
}

export function assignmentProblem(candidate: Assignment, assignments: Assignment[], teachers: Teacher[], lessons: Lesson[], slots: Slot[], zones: Zone[]): string | null {
  const teacher = teachers.find(t => t.id === candidate.teacherId);
  const slot = slots.find(s => s.id === candidate.slotId);
  const zone = zones.find(z => z.id === candidate.zoneId);
  if (!teacher || !slot || !zone) return 'Öğretmen, saat veya bölge kaydı bulunamadı.';
  if (!zoneAllowsSlot(zone, slot)) return 'Bölge bu saat diliminde etkin değil.';
  const availability = calculateAvailability([teacher], lessons, [slot])[teacher.id][slot.id];
  if (!availability.canDuty) return availability.reason || 'Öğretmen uygun değil.';
  if (assignments.some(a => a.id !== candidate.id && a.teacherId === candidate.teacherId && slots.some(s => s.id === a.slotId && overlaps(s, slot)))) {
    return 'Öğretmenin aynı veya çakışan saatte başka bir nöbeti var.';
  }
  return null;
}

export function validateSchedule(assignments: Assignment[], teachers: Teacher[], lessons: Lesson[], slots: Slot[], zones: Zone[]): string[] {
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const assignment of assignments) {
    if (ids.has(assignment.id)) warnings.push('Tekrarlanan atama kimliği: ' + assignment.id);
    ids.add(assignment.id);
    const problem = assignmentProblem(assignment, assignments, teachers, lessons, slots, zones);
    if (problem) warnings.push(`${teachers.find(t => t.id === assignment.teacherId)?.name || assignment.teacherId}: ${problem}`);
  }
  for (const slot of slots) for (const zone of zones) {
    if (!zoneAllowsSlot(zone, slot)) continue;
    const count = new Set(assignments.filter(a => a.slotId === slot.id && a.zoneId === zone.id).map(a => a.teacherId)).size;
    if (count < zone.minStaff) warnings.push(`${slot.day}. gün ${slot.startTime}, ${zone.name}: ${count}/${zone.minStaff} nöbetçi.`);
  }
  return [...new Set(warnings)];
}
