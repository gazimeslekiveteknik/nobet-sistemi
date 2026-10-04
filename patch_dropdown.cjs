const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const lessonSelectOld = /<select className="px-3 py-1\.5 border border-blue-200 rounded outline-none text-sm bg-white">[\s\S]*?<\/select>/;
const lessonSelectNew = \`<select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="30">30 Dakika</option>
                 <option value="40">40 Dakika</option>
                 <option value="45">45 Dakika</option>
                 <option value="60">60 Dakika</option>
               </select>\`;

code = code.replace(lessonSelectOld, lessonSelectNew);

const breakSelectOld = /<select className="px-3 py-1\.5 border border-blue-200 rounded outline-none text-sm bg-white">[\s\S]*?<\/select>/;
const breakSelectNew = \`<select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="5">5 Dakika</option>
                 <option value="10">10 Dakika</option>
                 <option value="15">15 Dakika</option>
               </select>\`;

// Since there are two selects that match the generic class, let's just do it directly on the HTML strings
const oldHtml = \`            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Ders Süresi</label>
               <select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="40">40 Dakika</option>
                 <option value="45">45 Dakika</option>
                 <option value="30">30 Dakika</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Teneffüs Süresi</label>
               <select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="10">10 Dakika</option>
                 <option value="15">15 Dakika</option>
                 <option value="5">5 Dakika</option>
               </select>
            </div>\`;

const newHtml = \`            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Ders Süresi</label>
               <select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="30">30 Dakika</option>
                 <option value="40">40 Dakika</option>
                 <option value="45">45 Dakika</option>
                 <option value="60">60 Dakika</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Teneffüs Süresi</label>
               <select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="5">5 Dakika</option>
                 <option value="10">10 Dakika</option>
                 <option value="15">15 Dakika</option>
               </select>
            </div>\`;

code = code.replace(oldHtml, newHtml);
fs.writeFileSync('src/components/SettingsView.tsx', code);
