const fs = require('fs');
let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const targetStr = `      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }`;
      
const replacement = `      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }
      
      // Filter by active slot types if defined
      if (zone.activeSlotTypes && !zone.activeSlotTypes.includes(slot.type)) {
        return;
      }`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/algorithm/scheduler.ts', code);
