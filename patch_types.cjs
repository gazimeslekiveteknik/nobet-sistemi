const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(/endPeriod\?: number;/, "endPeriod?: number;\\n  activeSlotTypes?: ('OPENING' | 'BREAK' | 'CLOSING')[];");

fs.writeFileSync('src/types/index.ts', code);
