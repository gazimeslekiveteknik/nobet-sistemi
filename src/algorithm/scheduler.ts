import type { Teacher, Lesson, Slot, Zone, Assignment } from '../types';
import { calculateAvailability } from './availability';

export interface ScheduleResult {
  assignments: Assignment[];
  warnings: string[];
}

export function generateSchedule(
  teachers: Teacher[],
  lessons: Lesson[],
  slots: Slot[],
  zones: Zone[],
  existingAssignments: Assignment[] = []
): ScheduleResult {
  const availabilityMatrix = calculateAvailability(teachers, lessons, slots);
  
  // Keep assignments that are manually locked
  const assignments: Assignment[] = existingAssignments.filter(a => a.isManual);
  const warnings: string[] = [];
  
  // Track current weekly load (start with history to balance globally)
  const teacherLoads: Record<string, number> = {};
  teachers.forEach(t => {
    teacherLoads[t.id] = t.historyStats.totalScore; 
  });

  // Apply loads from manual assignments
  assignments.forEach(a => {
     const zone = zones.find(z => z.id === a.zoneId);
     if (zone) teacherLoads[a.teacherId] += zone.riskMultiplier;
  });

  // Track daily load to avoid giving someone 5 duties in one day if possible
  const teacherDailyLoads: Record<string, Record<number, number>> = {};
  teachers.forEach(t => {
    teacherDailyLoads[t.id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  });

  assignments.forEach(a => {
     const slot = slots.find(s => s.id === a.slotId);
     if (slot) {
         if (teacherDailyLoads[a.teacherId]) {
            teacherDailyLoads[a.teacherId][slot.day] += 1;
         }
     }
  });

  // Sort slots by priority: Closing first, then Opening, then Breaks (because pools are smaller)
  const sortedSlots = [...slots].sort((a, b) => {
    const typePriority = { 'CLOSING': 1, 'OPENING': 2, 'BREAK': 3 };
    return typePriority[a.type] - typePriority[b.type];
  });

  // Sort zones by priority
  const sortedZones = [...zones].sort((a, b) => a.priority - b.priority);

  sortedSlots.forEach(slot => {
    sortedZones.forEach(zone => {
      // If this slot is restricted to specific zones and this zone is not in the list, skip
      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }
      
      let assignedCount = assignments.filter(a => a.slotId === slot.id && a.zoneId === zone.id).length;
      
      while (assignedCount < zone.idealStaff) {
        // Find best candidate
        let bestCandidate: Teacher | null = null;
        let bestScore = Infinity;

        for (const teacher of teachers) {
          const avail = availabilityMatrix[teacher.id][slot.id];
          if (!avail || !avail.canDuty) continue;

          // Check if already assigned to another zone in this slot
          const isAssigned = assignments.some(a => a.slotId === slot.id && a.teacherId === teacher.id);
          if (isAssigned) continue;

          // Calculate score (lower is better)
          // Multiply weekly load by 15 so the algorithm strongly balances total weekly duties
          let score = teacherLoads[teacher.id] * 15;
          
          // HARD LIMIT PENALTY: Prevent anyone from getting more than 8 duties if possible
          if (teacherLoads[teacher.id] >= 8) {
            score += 1000;
          }
          
          // Penalty for multiple duties in the same day (10 points per duty)
          score += teacherDailyLoads[teacher.id][slot.day] * 10;
          
          // Penalty if they had this zone in history
          const zoneHistory = teacher.historyStats.zoneCounts[zone.id] || 0;
          score += zoneHistory * 2;
          
          // Tie-breaker
          score += Math.random();
          
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = teacher;
          }
        }

        if (bestCandidate) {
          assignments.push({
            id: `A_${slot.id}_${zone.id}_${bestCandidate.id}`,
            slotId: slot.id,
            zoneId: zone.id,
            teacherId: bestCandidate.id,
            isManual: false
          });
          
          // Update loads
          teacherLoads[bestCandidate.id] += zone.riskMultiplier; 
          teacherDailyLoads[bestCandidate.id][slot.day] += 1;
          assignedCount++;
        } else {
          // Could not find anyone for this zone's need
          break;
        }
      }

      if (assignedCount < zone.minStaff) {
        warnings.push(`Uyarı: ${slot.day}. Gün ${slot.startTime} slotunda ${zone.name} bölgesi için yeterli nöbetçi bulunamadı. (Atanan: ${assignedCount}, Gereken: ${zone.minStaff})`);
      }
    });
  });

  return { assignments, warnings };
}
