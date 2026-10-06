const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import
code = code.replace("import { generateSchedule } from './algorithm/scheduler';", "import { generateSchedule, rotateSchedule } from './algorithm/scheduler';");

// 2. Modify currentSchedule calculation
const targetStr = `  const currentSchedule = weekSchedules[weekOffset] || schedule;`;

const replacementStr = `  const baseSchedule = weekSchedules[0] || schedule;
  const computedSchedule = weekOffset === 0 
      ? baseSchedule 
      : { ...baseSchedule, assignments: rotateSchedule(baseSchedule.assignments, weekOffset, appSlots, appZones) };
      
  const currentSchedule = weekSchedules[weekOffset] || computedSchedule;`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('src/App.tsx', code);
