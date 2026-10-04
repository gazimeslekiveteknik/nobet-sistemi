import type { Teacher, Lesson, Slot, DayOfWeek, Availability } from '../types';

export function calculateAvailability(
  teachers: Teacher[],
  lessons: Lesson[],
  slots: Slot[]
): Record<string, Record<string, Availability>> {
  const availabilityMatrix: Record<string, Record<string, Availability>> = {};

  // Group lessons by teacher and day
  const lessonsByTeacherAndDay: Record<string, Record<DayOfWeek, Lesson[]>> = {};

  teachers.forEach(t => {
    availabilityMatrix[t.id] = {};
    lessonsByTeacherAndDay[t.id] = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  });

  lessons.forEach(l => {
    if (lessonsByTeacherAndDay[l.teacherId]) {
      lessonsByTeacherAndDay[l.teacherId][l.day].push(l);
    }
  });

  teachers.forEach(teacher => {
    if (teacher.isExcluded) {
      slots.forEach(slot => {
        availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: 'Excluded' };
      });
      return;
    }

    slots.forEach(slot => {
      const dailyLessons = lessonsByTeacherAndDay[teacher.id][slot.day].sort((a, b) => a.period - b.period);
      
      if (dailyLessons.length === 0) {
        // No classes this day -> completely free day -> NO DUTY
        availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: 'Boş Gün' };
        return;
      }

      const firstLesson = dailyLessons[0];
      const lastLesson = dailyLessons[dailyLessons.length - 1];

      // Check if slot overlaps with an actual lesson period
      // Note: A slot typically represents a break, opening, or closing. 
      // If a slot is during a break after lesson N, it does not overlap with lesson N or N+1.
      // But we must check the exact time bounds.
      
      if (slot.type === 'OPENING') {
        // Can only do opening duty BEFORE their first class.
        // Rule: Only the opening slot right before their first class, OR the general opening if their first class is 1st period.
        // For simplicity, let's assume the global OPENING slot is before 1st period. 
        // If a teacher's first class is 1st period, they can do it.
        // Wait, the rule is: "nöbeti okuldaki ilk dersinden veya ondan önceki 20 dakikadan önce başlayamaz"
        if (firstLesson.period > 2) { 
            // If their first class is 3rd period, they cannot do the morning opening.
            // They can only do the break before 3rd period.
            availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: `İlk dersi ${firstLesson.period}. saatte` };
            return;
        }
      }

      if (slot.type === 'CLOSING') {
        // For closing, they can only do it if they have a class at the end of the day.
        // Assuming the school day has 'N' periods. 
        // For now, if their last class is before the closing slot's "afterLesson", they can't do it.
        if (lastLesson.period < (slot.afterLesson || 8)) {
          availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: `Son dersi erken bitiyor` };
          return;
        }
      }

      if (slot.type === 'BREAK') {
        // Slot is a break after 'afterLesson'
        const breakAfter = slot.afterLesson!;
        // The break is before breakAfter + 1
        const nextPeriod = breakAfter + 1;
        
        // Cannot do duty if break is before their first class
        if (nextPeriod < firstLesson.period) {
           availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: `Okula henüz gelmedi (İlk ders: ${firstLesson.period})` };
           return;
        }
        
        // Cannot do duty if break is after their last class
        if (breakAfter >= lastLesson.period) {
           availabilityMatrix[teacher.id][slot.id] = { canDuty: false, reason: `Okuldan ayrıldı (Son ders: ${lastLesson.period})` };
           return;
        }
      }

      // Check if teacher has class exactly during the slot?
      // Since slots are breaks/openings, they normally don't overlap with lessons. 
      // So if they are in the window, they are available!
      availabilityMatrix[teacher.id][slot.id] = { canDuty: true };
    });
  });

  return availabilityMatrix;
}
