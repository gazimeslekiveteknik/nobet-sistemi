import { useState } from 'react';
import { Search, UserX, UserCheck } from 'lucide-react';
import type { Teacher } from '../types';

interface TeacherListProps {
  teachers: Teacher[];
  onToggleExclude: (teacherId: string, isExcluded: boolean) => void;
}

export function TeacherList({ teachers, onToggleExclude }: TeacherListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    </div>
  );
}
