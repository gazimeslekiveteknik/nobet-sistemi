const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const titleOld2 = />Haftalık Nöbet Planı</g;
const titleNew2 = \`>Nöbet Planı <span className="text-lg font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full ml-3 align-middle">{getWeekString()}</span><\`;

code = code.replace(titleOld2, titleNew2);

fs.writeFileSync('src/App.tsx', code);
