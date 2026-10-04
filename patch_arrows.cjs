const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const titleOld = /<h2 className="text-3xl font-bold text-gray-800">Nöbet Planı <span className="text-lg font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full ml-3 align-middle">\{getWeekString\(\)\}<\/span><\/h2>/;
const titleNew = \`<div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">Nöbet Planı</h2>
                    <div className="flex items-center bg-indigo-50 rounded-full p-1 border border-indigo-100 shadow-sm">
                      <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Önceki Hafta"><ChevronLeft className="w-5 h-5" /></button>
                      <span className="text-sm font-medium text-indigo-700 px-4 min-w-[140px] text-center">{getWeekString(weekOffset)}</span>
                      <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Sonraki Hafta"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                  </div>\`;

code = code.replace(titleOld, titleNew);
fs.writeFileSync('src/App.tsx', code);
