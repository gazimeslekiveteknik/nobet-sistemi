const fs = require('fs');

let code = fs.readFileSync('src/components/TeacherList.tsx', 'utf8');

const imports = \`import { useState } from 'react';
import { Search, UserX, UserCheck, Share2 } from 'lucide-react';
import type { Teacher, Assignment, Slot, Zone } from '../types';

interface TeacherListProps {
  teachers: Teacher[];
  schedule: { assignments: Assignment[] };
  slots: Slot[];
  zones: Zone[];
  onToggleExclude: (teacherId: string, isExcluded: boolean) => void;
}\`;

code = code.replace(/import \{ useState \} from 'react';[\s\S]*?onToggleExclude: \(teacherId: string, isExcluded: boolean\) => void;\n\}/, imports);

const signatureOld = \`export function TeacherList({ teachers, onToggleExclude }: TeacherListProps) {\`;
const signatureNew = \`export function TeacherList({ teachers, schedule, slots, zones, onToggleExclude }: TeacherListProps) {
  const getShareLink = (teacher: Teacher) => {
    const teacherAssignments = schedule.assignments.filter(a => a.teacherId === teacher.id);
    if (teacherAssignments.length === 0) return '#';
    
    // Group by day
    const byDay: Record<number, Assignment[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    teacherAssignments.forEach(a => {
       const slot = slots.find(s => s.id === a.slotId);
       if (slot) byDay[slot.day].push(a);
    });
    
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    let text = \`*Sn. \${teacher.name}*,\\nBu haftaki nöbet görevleriniz aşağıdadır:\\n\\n\`;
    
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
       
       text += \`*\${dayNames[day-1]}:*\\n\`;
       dailyAssignments.forEach(a => {
          const slot = slots.find(s => s.id === a.slotId);
          const zone = zones.find(z => z.id === a.zoneId);
          if (slot && zone) {
             let typeName = slot.type === 'OPENING' ? 'Açılış Nöbeti' : slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : \`\${slot.afterLesson}. Ders Sonu\`;
             text += \`- \${slot.startTime} - \${slot.endTime}: \${zone.name} (\${typeName})\\n\`;
          }
       });
       text += \`\\n\`;
    }
    
    text += \`İyi çalışmalar dileriz.\`;
    return \`https://wa.me/?text=\${encodeURIComponent(text)}\`;
  };\`;

code = code.replace(signatureOld, signatureNew);

// Add button to UI
const oldTd = \`<td className="py-4 px-6 text-right">\`;
const newTd = \`<td className="py-4 px-6 text-right">
                  {!teacher.isExcluded && (
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

code = code.replace(new RegExp('<td className="py-4 px-6 text-right">', 'g'), newTd);

fs.writeFileSync('src/components/TeacherList.tsx', code);
