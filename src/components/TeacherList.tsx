import { useState } from 'react';
import { Search, UserX, UserCheck, Share2, Eye, X } from 'lucide-react';
import type { Teacher, Assignment, Slot, Zone } from '../types';

interface TeacherListProps {
  teachers: Teacher[];
  schedule: { assignments: Assignment[] };
  slots: Slot[];
  zones: Zone[];
  onToggleExclude: (teacherId: string, isExcluded: boolean) => void;
}

export function TeacherList({ teachers, schedule, slots, zones, onToggleExclude }: TeacherListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const getScheduleText = (teacher: Teacher) => {
    const teacherAssignments = schedule.assignments.filter(a => a.teacherId === teacher.id);
    if (teacherAssignments.length === 0) return 'Bu hafta nöbet görevi bulunmamaktadır.';
    
    // Group by day
    const byDay: Record<number, Assignment[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    teacherAssignments.forEach(a => {
       const slot = slots.find(s => s.id === a.slotId);
       if (slot) byDay[slot.day].push(a);
    });
    
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    let text = `*Sn. ${teacher.name}*,\nBu haftaki nöbet görevleriniz aşağıdadır:\n\n`;
    
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
       
       text += `*${dayNames[day-1]}:*\n`;
       dailyAssignments.forEach(a => {
          const slot = slots.find(s => s.id === a.slotId);
          const zone = zones.find(z => z.id === a.zoneId);
          if (slot && zone) {
             let typeName = slot.type === 'OPENING' ? 'Açılış Nöbeti' : slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : `${slot.afterLesson}. Ders Sonu`;
             text += `- ${slot.startTime} - ${slot.endTime}: ${zone.name} (${typeName})\n`;
          }
       });
       text += `\n`;
    }
    
    text += `İyi çalışmalar dileriz.`;
    return text;
  };

  const getShareLink = (teacher: Teacher) => {
    const text = getScheduleText(teacher);
    if (text.includes('bulunmamaktadır')) return '#';
    
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  const activeCount = teachers.filter(t => !t.isExcluded).length;
  const excludedCount = teachers.length - activeCount;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Öğretmen Yönetimi</h2>
        <p className="text-gray-500 mt-1">
          Toplam {teachers.length} öğretmen. Nöbet tutan: <span className="font-semibold text-green-600">{activeCount}</span>, Muaf: <span className="font-semibold text-red-500">{excludedCount}</span>
        </p>

        <div className="mt-6 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Öğretmen ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600 uppercase tracking-wider">
              <th className="py-4 px-6 font-semibold">Öğretmen Adı</th>
              <th className="py-4 px-6 font-semibold">Durum</th>
              <th className="py-4 px-6 font-semibold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTeachers.map(teacher => (
              <tr key={teacher.id} className={`transition-colors ${teacher.isExcluded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${teacher.isExcluded ? 'bg-gray-400' : 'bg-indigo-500'}`}>
                      {teacher.name.charAt(0)}
                    </div>
                    <span className={`font-medium ${teacher.isExcluded ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {teacher.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    teacher.isExcluded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {teacher.isExcluded ? 'Muaf (Nöbet Tutmaz)' : 'Aktif (Nöbet Tutar)'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  {!teacher.isExcluded && (
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
                  )}
                  <button
                    onClick={() => onToggleExclude(teacher.id, !teacher.isExcluded)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      teacher.isExcluded 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    {teacher.isExcluded ? (
                      <><UserCheck className="w-4 h-4" /> Havuza Ekle</>
                    ) : (
                      <><UserX className="w-4 h-4" /> Muaf Yap</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            
            {filteredTeachers.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  Arama kriterlerine uygun öğretmen bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
  );
}
