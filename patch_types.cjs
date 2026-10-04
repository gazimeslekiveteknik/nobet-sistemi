const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');
code = code.replace("endTime: string; // HH:mm", "endTime: string; // HH:mm\n  zoneSpecificIds?: string[]; // If set, this slot only applies to these zones");
fs.writeFileSync('src/types/index.ts', code);
