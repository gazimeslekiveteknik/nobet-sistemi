import type { Assignment, Teacher, Lesson, Slot, Zone } from '../types';
import { assignmentProblem } from './validation';

export function replaceDailyLeave(teacherId: string, day: number, assignments: Assignment[], teachers: Teacher[], lessons: Lesson[], slots: Slot[], zones: Zone[]) {
  const removed = assignments.filter(a => a.teacherId === teacherId && slots.find(s => s.id === a.slotId)?.day === day);
  const result = assignments.filter(a => !removed.includes(a)).map(a => ({ ...a }));
  const affected = new Set([teacherId]);
  const logs: string[] = [];
  const absent = teachers.find(t => t.id === teacherId)?.name || teacherId;
  for (const original of removed) {
    const slot = slots.find(s => s.id === original.slotId)!;
    const candidates = teachers.filter(t => t.id !== teacherId && !assignmentProblem({ ...original, teacherId: t.id }, result, teachers, lessons, slots, zones));
    candidates.sort((a, b) => result.filter(x => x.teacherId === a.id).length - result.filter(x => x.teacherId === b.id).length || a.id.localeCompare(b.id));
    const replacement = candidates[0];
    if (!replacement) {
      logs.push(`${slot.startTime}: uygun yedek bulunamadı; nöbet boş bırakıldı.`);
      continue;
    }
    result.push({ ...original, teacherId: replacement.id, isManual: true });
    affected.add(replacement.id);
    const exchange = result.find(a => a.teacherId === replacement.id && !a.isManual && (slots.find(s => s.id === a.slotId)?.day ?? 0) > day
      && !assignmentProblem({ ...a, teacherId }, result, teachers, lessons, slots, zones));
    if (exchange) {
      exchange.teacherId = teacherId;
      exchange.isManual = true;
      logs.push(`${slot.startTime}: ${absent} yerine ${replacement.name}; uygun sonraki nöbet karşılıklı devredildi.`);
    } else logs.push(`${slot.startTime}: ${absent} yerine ${replacement.name}; karşılıklı devre uygun nöbet yok, ek görev verildi.`);
  }
  return { assignments: result, affected, logs };
}
