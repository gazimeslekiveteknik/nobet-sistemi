const fs = require('fs');

let code = fs.readFileSync('src/components/TeacherList.tsx', 'utf8');

// 1. Add Eye, X imports
const newImports = \`import { useState } from 'react';
import { Search, UserX, UserCheck, Share2, Eye, X } from 'lucide-react';\`;
code = code.replace(/import \{ useState \} from 'react';\nimport \{ Search, UserX, UserCheck, Share2 \} from 'lucide-react';/, newImports);

// 2. Add selectedTeacher state
const modalState = \`  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);\`;
code = code.replace("  const [searchTerm, setSearchTerm] = useState('');", modalState);

// 3. Add getScheduleText
const getScheduleText = \`  const getScheduleText = (teacher: Teacher) => {
    const teacherAssignments = schedule.assignments.filter(a => a.teacherId === teacher.id);
    if (teacherAssignments.length === 0) return 'Bu hafta nöbet görevi bulunmamaktadır.';
    
    // Group by day
    const byDay: Record<number, Assignment[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    teacherAssignments.forEach(a => {
       const slot = slots.find(s => s.id === a.slotId);
       if (slot) byDay[slot.day].push(a);
    });
    
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    let text = \\\`*Sn. \${teacher.name}*,\\nBu haftaki nöbet görevleriniz aşağıdadır:\\n\\n\\\`;
    
    for (let day = 1; day <= 5; day++) {
       const dailyAssignments = byDay[day];
       if (dailyAssignments.length === 0) continue;
       
       // Sort slots by time
       dailyAssignments.sort((a, b) => {
          const sA = slots.find(s => s.id === a.slotId);
          const sB = slots.find(s => s.id === b.slotId);
          if (!sA || !sB) return 0;
          return sA.startTime.localeCompare(sB.startTime);
       });
       
       text += \\\`*\${dayNames[day-1]}:*\\n\\\`;
       dailyAssignments.forEach(a => {
          const slot = slots.find(s => s.id === a.slotId);
          const zone = zones.find(z => z.id === a.zoneId);
          if (slot && zone) {
             let typeName = slot.type === 'OPENING' ? 'Açılış Nöbeti' : slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : \\\`\${slot.afterLesson}. Ders Sonu\\\`;
             text += \\\`- \${slot.startTime} - \${slot.endTime}: \${zone.name} (\${typeName})\\n\\\`;
          }
       });
       text += \\\`\\n\\\`;
    }
    
    text += \\\`İyi çalışmalar dileriz.\\\`;
    return text;
  };\`;

code = code.replace("  const getShareLink = (teacher: Teacher) => {", getScheduleText + "\\n  const getShareLink = (teacher: Teacher) => {");

// 4. Update getShareLink to use getScheduleText
const oldGetShareLinkBody = \`    const teacherAssignments = schedule.assignments.filter(a => a.teacherId === teacher.id);
    if (teacherAssignments.length === 0) return '#';
    
    // Group by day
    const byDay: Record<number, Assignment[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    teacherAssignments.forEach(a => {
       const slot = slots.find(s => s.id === a.slotId);
       if (slot) byDay[slot.day].push(a);
    });
    
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    let text = \\\`*Sn. \${teacher.name}*,\\nBu haftaki nöbet görevleriniz aşağıdadır:\\n\\n\\\`;
    
    for (let day = 1; day <= 5; day++) {
       const dailyAssignments = byDay[day];
       if (dailyAssignments.length === 0) continue;
       
       // Sort slots by time
       dailyAssignments.sort((a, b) => {
          const sA = slots.find(s => s.id === a.slotId);
          const sB = slots.find(s => s.id === b.slotId);
          if (!sA || !sB) return 0;
          return sA.startTime.localeCompare(sB.startTime);
       });
       
       text += \\\`*\${dayNames[day-1]}:*\\n\\\`;
       dailyAssignments.forEach(a => {
          const slot = slots.find(s => s.id === a.slotId);
          const zone = zones.find(z => z.id === a.zoneId);
          if (slot && zone) {
             let typeName = slot.type === 'OPENING' ? 'Açılış Nöbeti' : slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : \\\`\${slot.afterLesson}. Ders Sonu\\\`;
             text += \\\`- \${slot.startTime} - \${slot.endTime}: \${zone.name} (\${typeName})\\n\\\`;
          }
       });
       text += \\\`\\n\\\`;
    }
    
    text += \\\`İyi çalışmalar dileriz.\\\`;\`;

code = code.replace(oldGetShareLinkBody, "    const text = getScheduleText(teacher);\n    if (text.includes('bulunmamaktadır')) return '#';");

// 5. Add Eye button
const oldButtons = \`                  {!teacher.isExcluded && (
                    <a
                      href={getShareLink(teacher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-green-500 text-white hover:bg-green-600 mr-2"
                      title="WhatsApp'ta Paylaş"
                    >
                      <Share2 className="w-4 h-4" /> Paylaş
                    </a>
                  )}\`;

const newButtons = \`                  {!teacher.isExcluded && (
                    <>
                      <button
                        onClick={() => setSelectedTeacher(teacher)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 mr-2"
                        title="Programı Görüntüle"
                      >
                        <Eye className="w-4 h-4" /> Program
                      </button>
                      <a
                        href={getShareLink(teacher)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-green-500 text-white hover:bg-green-600 mr-2"
                        title="WhatsApp'ta Paylaş"
                      >
                        <Share2 className="w-4 h-4" /> Paylaş
                      </a>
                    </>
                  )}\`;
code = code.replace(oldButtons, newButtons);

// 6. Add Modal UI
const modalHtml = \`      </div>

      {/* Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-indigo-900 text-lg">{selectedTeacher.name} - Nöbet Programı</h3>
              <button onClick={() => setSelectedTeacher(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">
              {getScheduleText(selectedTeacher)}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
               <a
                  href={getShareLink(selectedTeacher)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors bg-green-500 text-white hover:bg-green-600"
               >
                  <Share2 className="w-4 h-4" /> WhatsApp'ta Paylaş
               </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );\`;

code = code.replace(/      <\/div>\n    <\/div>\n  \);/, modalHtml);

fs.writeFileSync('src/components/TeacherList.tsx', code);
