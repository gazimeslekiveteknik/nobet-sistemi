const fs = require('fs');
let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const targetStr = `const targetStaff = (slot.type === 'OPENING' || slot.type === 'CLOSING') ? 1 : zone.idealStaff;`;
      
const replacement = `let targetStaff = zone.idealStaff;
      if (slot.type === 'OPENING' || slot.type === 'CLOSING') {
         if (zone.activeSlotTypes && !zone.activeSlotTypes.includes('BREAK')) {
            targetStaff = zone.idealStaff;
         } else {
            targetStaff = 1;
         }
      }`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/algorithm/scheduler.ts', code);
