const fs = require('fs');
let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const rotateFunc = `
export const rotateSchedule = (baseAssignments: Assignment[], weekOffset: number, appSlots: Slot[], appZones: Zone[]): Assignment[] => {
    if (weekOffset === 0) return baseAssignments;
    
    const rotated: Assignment[] = [];
    
    // Group assignments by Day
    const assignmentsByDay = new Map<number, Assignment[]>();
    baseAssignments.forEach(a => {
        const slot = appSlots.find(s => s.id === a.slotId);
        if (!slot) return;
        const day = slot.day;
        if (!assignmentsByDay.has(day)) assignmentsByDay.set(day, []);
        assignmentsByDay.get(day)!.push(a);
    });
    
    assignmentsByDay.forEach((dayAssignments, day) => {
        // Group by Teacher to form "Roles" for this day
        const rolesByTeacher = new Map<string, Assignment[]>();
        dayAssignments.forEach(a => {
            if (!rolesByTeacher.has(a.teacherId)) rolesByTeacher.set(a.teacherId, []);
            rolesByTeacher.get(a.teacherId)!.push(a);
        });
        
        // Build roles and determine primary zone for sorting
        const roles = Array.from(rolesByTeacher.values()).map(assignments => {
            const zoneCounts: Record<string, number> = {};
            assignments.forEach(a => zoneCounts[a.zoneId] = (zoneCounts[a.zoneId] || 0) + 1);
            
            const primaryZoneId = Object.keys(zoneCounts).sort((a,b) => zoneCounts[b] - zoneCounts[a])[0];
            const zone = appZones.find(z => z.id === primaryZoneId);
            const priority = zone ? zone.priority : 999;
            // secondary sort by teacherId to be perfectly deterministic
            return { teacherId: assignments[0].teacherId, assignments, priority, id: assignments[0].teacherId };
        });
        
        // Sort roles by priority (Bahçe -> 1.Kat -> 2.Kat -> ...)
        roles.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.id.localeCompare(b.id);
        });
        
        const N = roles.length;
        if (N === 0) return;
        
        let offset = weekOffset % N;
        if (offset < 0) offset += N;
        
        for (let i = 0; i < N; i++) {
            let sourceIndex = (i - offset) % N;
            if (sourceIndex < 0) sourceIndex += N;
            
            const targetRole = roles[i];
            const sourceTeacherId = roles[sourceIndex].teacherId;
            
            targetRole.assignments.forEach(a => {
                rotated.push({
                    ...a,
                    id: a.id + '_w' + weekOffset,
                    teacherId: sourceTeacherId
                });
            });
        }
    });
    
    return rotated;
};
`;

code += "\n" + rotateFunc;

fs.writeFileSync('src/algorithm/scheduler.ts', code);
