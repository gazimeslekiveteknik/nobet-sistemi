import React from 'react';
import type { Teacher, Assignment, Zone, Slot } from '../types';
import { BarChart3 } from 'lucide-react';

interface AnalyticsProps {
  teachers: Teacher[];
  assignments: Assignment[];
  zones: Zone[];
  slots: Slot[];
}

export function Analytics({ teachers, assignments, zones, slots }: AnalyticsProps) {
  // Only consider active teachers for the report
  const activeTeachers = teachers.filter(t => !t.isExcluded);

  const stats = activeTeachers.map(teacher => {
    const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);
    
    // Total count
    const totalCount = teacherAssignments.length;

    // Breakdown by zone
    const zoneBreakdown: Record<string, number> = {};
    zones.forEach(z => { zoneBreakdown[z.id] = 0; });
    
    teacherAssignments.forEach(a => {
      if (zoneBreakdown[a.zoneId] !== undefined) {
        zoneBreakdown[a.zoneId]++;
      }
    });

    // Breakdown by slot type (Opening, Break, Closing)
    let openingCount = 0;
    let closingCount = 0;
    
    teacherAssignments.forEach(a => {
      const slot = slots.find(s => s.id === a.slotId);
      if (slot?.type === 'OPENING') openingCount++;
      if (slot?.type === 'CLOSING') closingCount++;
    });

    return {
      teacher,
      totalCount,
      zoneBreakdown,
      openingCount,
      closingCount
    };
  });

  // Sort by total count descending
  stats.sort((a, b) => b.totalCount - a.totalCount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" />
            Adalet ve Yük Analizi
          </h2>
          <p className="text-gray-500 mt-1">
            Öğretmenlerin haftalık toplam nöbet sayıları ve bölgelere göre dağılımı.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600 uppercase tracking-wider">
              <th className="py-4 px-6 font-semibold">Öğretmen Adı</th>
              <th className="py-4 px-6 font-semibold text-center text-indigo-700">Toplam Nöbet</th>
              <th className="py-4 px-6 font-semibold text-center text-blue-600">Açılış</th>
              <th className="py-4 px-6 font-semibold text-center text-purple-600">Kapanış</th>
              {zones.map(z => (
                <th key={z.id} className="py-4 px-6 font-semibold text-center text-gray-500">{z.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.map(({ teacher, totalCount, zoneBreakdown, openingCount, closingCount }) => (
              <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-medium text-gray-900">{teacher.name}</td>
                <td className="py-4 px-6 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                    {totalCount}
                  </span>
                </td>
                <td className="py-4 px-6 text-center font-medium text-blue-700">{openingCount > 0 ? openingCount : '-'}</td>
                <td className="py-4 px-6 text-center font-medium text-purple-700">{closingCount > 0 ? closingCount : '-'}</td>
                {zones.map(z => {
                  const count = zoneBreakdown[z.id];
                  return (
                    <td key={z.id} className="py-4 px-6 text-center text-gray-600">
                      {count > 0 ? (
                        <span className="inline-block w-6 h-6 leading-6 bg-gray-200 rounded-md text-sm font-semibold">{count}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
