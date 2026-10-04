const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const titleOld = /<h1 className="text-3xl font-bold text-gray-900">Haftalık Nöbet Planı<\/h1>/g;
const titleNew = \`<h1 className="text-3xl font-bold text-gray-900">Nöbet Planı <span className="text-lg font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full ml-3 align-middle">{getWeekString()}</span></h1>\`;

code = code.replace(titleOld, titleNew);

fs.writeFileSync('src/App.tsx', code);
