const fs = require('fs');
let code = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');

const oldLogic = \`    sortedZones.forEach(zone => {
      // If this slot is restricted to specific zones and this zone is not in the list, skip
      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }\`;

const newLogic = \`    sortedZones.forEach(zone => {
      // If this slot is restricted to specific zones and this zone is not in the list, skip
      if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
        return;
      }
      
      // Skip if this slot is outside the zone's active periods
      if (slot.type === 'OPENING' && zone.startPeriod !== undefined && zone.startPeriod > 1) {
         return; // Zone does not open at period 1, so no morning opening
      }
      if (slot.type === 'BREAK' && zone.startPeriod !== undefined && zone.endPeriod !== undefined) {
         // A break is AFTER slot.afterLesson.
         // If a zone starts at Period 3, it should have a break AFTER period 2 (which is before period 3)?
         // Usually, if a zone starts at period 3, they don't do duty in the break after period 2.
         // Wait, the break after period 2 IS the time just before period 3! So maybe they DO want it?
         // If zone starts at period 3, they want duty during the break before period 3, which is break after period 2.
         // So if slot.afterLesson < zone.startPeriod - 1, SKIP.
         if (slot.afterLesson !== undefined && slot.afterLesson < zone.startPeriod - 1) return;
         if (slot.afterLesson !== undefined && slot.afterLesson >= zone.endPeriod) return;
      }
      if (slot.type === 'CLOSING' && zone.endPeriod !== undefined) {
         // If closing slot is after last period (e.g. 10), and zone ends at 7, skip closing duty for this zone.
         if (slot.afterLesson !== undefined && zone.endPeriod < slot.afterLesson) return;
      }\`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/algorithm/scheduler.ts', code);
