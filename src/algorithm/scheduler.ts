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

  // Sort slots by "Most Constrained First" (Minimum available teachers)
  // This is crucial for balancing: fill the slots that have the fewest available teachers first!
  const sortedSlots = [...slots].sort((a, b) => {
    // Count how many teachers are available for slot a
    let aAvail = 0;
    teachers.forEach(t => { if (availabilityMatrix[t.id][a.id]?.canDuty) aAvail++; });
    
    // Count how many teachers are available for slot b
    let bAvail = 0;
    teachers.forEach(t => { if (availabilityMatrix[t.id][b.id]?.canDuty) bAvail++; });
    
    // If they have the same availability, prioritize CLOSING > OPENING > BREAK
    if (aAvail === bAvail) {
       const typePriority = { 'CLOSING': 1, 'OPENING': 2, 'BREAK': 3 };
       return typePriority[a.type] - typePriority[b.type];
    }
    
    return aAvail - bAvail; // Ascending: fewest available teachers first
  });

  // Sort zones by priority
  const sortedZones = [...zones].sort((a, b) => a.priority - b.priority);

  sortedSlots.forEach(slot => {
    sortedZones.forEach(zone => {
      // If this slot is restricted to specific zones and this zone is not in the list, skip
      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }
      
      // Filter by active slot types if defined
      if (zone.activeSlotTypes && !zone.activeSlotTypes.includes(slot.type)) {
        return;
      }
      
      // Skip if this slot is outside the zone's active periods
      if (slot.type === 'OPENING' && zone.startPeriod !== undefined && zone.startPeriod > 1) {
         return; // Zone does not open at period 1, so no morning opening
      }
      if (slot.type === 'BREAK') {
         if (zone.startPeriod !== undefined && slot.afterLesson !== undefined && slot.afterLesson < zone.startPeriod - 1) return;
         if (zone.endPeriod !== undefined && slot.afterLesson !== undefined && slot.afterLesson >= zone.endPeriod) return;
      }
      if (slot.type === 'CLOSING' && zone.endPeriod !== undefined) {
         // If closing slot is after last period (e.g. 10), and zone ends at 7, skip closing duty for this zone.
         if (slot.afterLesson !== undefined && zone.endPeriod < slot.afterLesson) return;
      }
      
      let assignedCount = assignments.filter(a => a.slotId === slot.id && a.zoneId === zone.id).length;
      
      let targetStaff = zone.idealStaff;
      if (slot.type === 'OPENING' || slot.type === 'CLOSING') {
         if (zone.activeSlotTypes && !zone.activeSlotTypes.includes('BREAK')) {
            targetStaff = zone.idealStaff;
         } else {
            targetStaff = 1;
         }
      }
      while (assignedCount < targetStaff) {
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
          // Multiply weekly load by 1000 so the algorithm strongly balances total weekly duties above all else
          let score = teacherLoads[teacher.id] * 1000;
          
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
