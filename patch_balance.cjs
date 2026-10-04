const fs = require('fs');

let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const oldSort = \`  // Sort slots by priority: Closing first, then Opening, then Breaks (because pools are smaller)
  const sortedSlots = [...slots].sort((a, b) => {
    const typePriority = { 'CLOSING': 1, 'OPENING': 2, 'BREAK': 3 };
    return typePriority[a.type] - typePriority[b.type];
  });\`;

const newSort = \`  // Sort slots by "Most Constrained First" (Minimum available teachers)
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
  });\`;

code = code.replace(oldSort, newSort);

// Also let's increase the weight of total weekly load to be the absolute king
const oldScore = \`let score = teacherLoads[teacher.id] * 15;\`;
const newScore = \`let score = teacherLoads[teacher.id] * 1000; // Weekly load is the absolute priority\`;

code = code.replace(oldScore, newScore);

fs.writeFileSync('src/algorithm/scheduler.ts', code);
