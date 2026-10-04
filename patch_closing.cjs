const fs = require('fs');

// 1. Fix App.tsx to include afterLesson for CLOSING
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  "type: 'CLOSING',",
  "type: 'CLOSING',\n             afterLesson: lastPeriod.id,"
);
fs.writeFileSync('src/App.tsx', appCode);

// 2. Fix availability.ts CLOSING logic just to be safe
let availCode = fs.readFileSync('src/algorithm/availability.ts', 'utf8');
availCode = availCode.replace(
  "if (lastLesson.period < (slot.afterLesson || 99)) {",
  "if (lastLesson.period < (slot.afterLesson || 8)) {"
);
fs.writeFileSync('src/algorithm/availability.ts', availCode);

