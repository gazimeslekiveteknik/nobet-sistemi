const fs = require('fs');
let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const targetStr = `      if (slot.type === 'BREAK' && zone.startPeriod !== undefined && zone.endPeriod !== undefined) {
         // A break is AFTER slot.afterLesson.
         // If a zone starts at Period 3, the break just before it is after period 2.
         // So if slot.afterLesson < zone.startPeriod - 1, we skip.
         // Also skip if slot.afterLesson >= zone.endPeriod.
         if (slot.afterLesson !== undefined && slot.afterLesson < zone.startPeriod - 1) return;
         if (slot.afterLesson !== undefined && slot.afterLesson >= zone.endPeriod) return;
      }`;

const replacementStr = `      if (slot.type === 'BREAK') {
         if (zone.startPeriod !== undefined && slot.afterLesson !== undefined && slot.afterLesson < zone.startPeriod - 1) return;
         if (zone.endPeriod !== undefined && slot.afterLesson !== undefined && slot.afterLesson >= zone.endPeriod) return;
      }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/algorithm/scheduler.ts', code);
