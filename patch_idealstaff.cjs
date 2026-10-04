const fs = require('fs');

let schedCode = fs.readFileSync('src/algorithm/scheduler.ts', 'utf8');
schedCode = schedCode.replace(
  "while (assignedCount < zone.idealStaff) {",
  "const targetStaff = (slot.type === 'OPENING' || slot.type === 'CLOSING') ? 1 : zone.idealStaff;\n      while (assignedCount < targetStaff) {"
);

// Also need to fix the warning generation if it still checks zone.idealStaff
schedCode = schedCode.replace(
  "if (finalCount < zone.idealStaff) {",
  "const finalTarget = (slot.type === 'OPENING' || slot.type === 'CLOSING') ? 1 : zone.idealStaff;\n      if (finalCount < finalTarget) {"
);
schedCode = schedCode.replace(
  "warnings.push(`Uyarı: ${slot.day}. Gün ${slot.startTime} slotunda ${zone.name} bölgesi için yeterli nöbetçi bulunamadı. (Atanan: ${finalCount}, Gereken: ${zone.idealStaff})`);",
  "warnings.push(`Uyarı: ${slot.day}. Gün ${slot.startTime} slotunda ${zone.name} bölgesi için yeterli nöbetçi bulunamadı. (Atanan: ${finalCount}, Gereken: ${finalTarget})`);"
);

fs.writeFileSync('src/algorithm/scheduler.ts', schedCode);

