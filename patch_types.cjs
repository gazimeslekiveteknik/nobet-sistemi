const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(
  'riskMultiplier: number;',
  'riskMultiplier: number;\n  startPeriod?: number;\n  endPeriod?: number;'
);

fs.writeFileSync('src/types/index.ts', code);
