import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Teacher, Lesson, DayOfWeek } from '../types';

interface Props {
  teachers: Teacher[];
  lessons: Lesson[];
}

export function TeacherTimetablesPrintView({ teachers, lessons }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const days: { id: DayOfWeek; name: string }[] = [
    { id: 1, name: 'Pazartesi' },
    { id: 2, name: 'Salı' },
    { id: 3, name: 'Çarşamba' },
    { id: 4, name: 'Perşembe' },
    { id: 5, name: 'Cuma' }
  ];

  // Assuming standard 1 to 10 periods
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Filter teachers who actually have lessons
  const activeTeachers = teachers.filter(t => 
    !t.isExcluded && 
    lessons.some(l => l.teacherId === t.id) &&
    t.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div className="bg-white min-h-screen p-8 text-gray-900 print:p-0 print:bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 1cm; }
        }
      `}} />
      <div className="print:hidden mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Öğretmen Ders Programları</h1>
        <p className="text-gray-500 mt-1 mb-6">Bu sayfayı yazdırarak veya PDF'e çevirerek her öğretmenin haftalık ders programını inceleyebilirsiniz. Çizelgeler sayfaya sığacak şekilde otomatik boyutlandırılır.</p>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Öğretmen ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 whitespace-nowrap">
            Yazdır / PDF Olarak Kaydet
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {activeTeachers.map(teacher => (
          <div key={teacher.id} className="print:break-inside-avoid border border-gray-300 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-300 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{teacher.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">Haftalık Ders Programı</p>
              </div>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-300 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200 w-24">Ders</th>
                  {days.map(d => (
                    <th key={d.id} className="px-4 py-3 font-semibold border-r border-gray-200 last:border-0 text-center w-1/5">{d.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray-200 bg-gray-50/50 text-center">
                      {period}. Ders
                    </td>
                    {days.map(day => {
                      const lesson = lessons.find(l => 
                        l.day === day.id && 
                        l.period === period && 
                        l.teacherId === teacher.id
                      );
                      
                      let cellContent = <span className="text-gray-300">-</span>;
                      
                      if (lesson) {
                        cellContent = (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-indigo-700">{lesson.className}</span>
                          </div>
                        );
                      }
                      
                      return (
                        <td key={day.id} className="px-4 py-3 border-r border-gray-200 last:border-0 text-center align-middle">
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      
      {activeTeachers.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          Gösterilecek ders programı bulunamadı. Lütfen önce veri aktarımı yapın.
        </div>
      )}
    </div>
  );
}
