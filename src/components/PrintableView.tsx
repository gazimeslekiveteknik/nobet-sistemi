
import { Printer } from 'lucide-react';
import type { Teacher, Assignment, Slot, Zone } from '../types';

interface PrintableViewProps {
  schedule: { assignments: Assignment[] };
  teachers: Teacher[];
  zones: Zone[];
  slots: Slot[];
  weekString: string;
}

export function PrintableView({ schedule, teachers, zones, slots, weekString }: PrintableViewProps) {
  const days = [
    { id: 1, name: 'Pazartesi' },
    { id: 2, name: 'Salı' },
    { id: 3, name: 'Çarşamba' },
    { id: 4, name: 'Perşembe' },
    { id: 5, name: 'Cuma' }
  ];

  // For a given day and zone, find all unique teachers assigned
  const getTeachersForDayAndZone = (day: number, zoneId: string) => {
    // Find all slots for this day
    const daySlotIds = slots.filter(s => s.day === day).map(s => s.id);
    
    // Find assignments in this zone for this day's slots
    const zoneAssignments = schedule.assignments.filter(a => 
       a.zoneId === zoneId && daySlotIds.includes(a.slotId)
    );
    
    // Get unique teacher IDs
    const uniqueTeacherIds = [...new Set(zoneAssignments.map(a => a.teacherId))];
    
    // Map to teacher objects
    return uniqueTeacherIds.map(tid => teachers.find(t => t.id === tid)).filter(Boolean) as Teacher[];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Haftalık Nöbet Çizelgesi</h2>
          <p className="text-gray-500 mt-1">{weekString} - Yazdırılabilir Format</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          <Printer className="w-5 h-5" /> Yazdır
        </button>
      </div>

      <div className="p-8 overflow-auto bg-white print:p-0 print:overflow-visible" id="print-area">
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              #print-area { position: absolute; left: 0; top: 0; width: 100%; }
              @page { size: landscape; margin: 10mm; }
            }
        `}} />
        
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl uppercase">T.C.</h3>
          <h3 className="font-bold text-xl uppercase">SULTANGAZİ KAYMAKAMLIĞI</h3>
          <h3 className="font-bold text-lg uppercase">GAZİ MESLEKİ VE TEKNİK ANADOLU LİSESİ</h3>
          <h4 className="font-bold text-md mt-2 uppercase">{weekString} NÖBET ÇİZELGESİ</h4>
        </div>

        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr>
              <th className="border border-black p-2 bg-gray-100 w-24">Günler</th>
              {zones.map(zone => (
                <th key={zone.id} className="border border-black p-2 bg-gray-100 text-center uppercase">
                  {zone.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day.id}>
                <td className="border border-black p-2 font-bold bg-gray-50 text-center">{day.name}</td>
                {zones.map(zone => {
                  const teachersInZone = getTeachersForDayAndZone(day.id, zone.id);
                  return (
                    <td key={zone.id} className="border border-black p-2 text-center align-middle h-20">
                       {teachersInZone.map((t, idx) => (
                         <div key={idx} className="font-semibold">{t.name}</div>
                       ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-8 text-xs leading-relaxed space-y-1">
           <p className="font-bold text-sm mb-2">NÖBETÇİ ÖĞRETMENLERİN GÖREVLERİ:</p>
           <p>1- Nöbetçi öğretmen nöbete 15 dakika önce gelir, nöbet bittikten 15 dakika sonra nöbet yerinden ayrılır.</p>
           <p>2- Günlük vakit çizelgesini uygulamak.</p>
           <p>3- Öğretmenlerin derslere zamanında girip girmediğini izlemek ve sınıf defterlerini kontrol etmek.</p>
           <p>4- Bahçedeki, koridorlardaki ve sınıflardaki öğrencileri gözetlemek.</p>
           <p>5- Beklenmedik olaylar karşısında gerekli tedbirleri almak ve idareye bildirmek.</p>
        </div>
      </div>
    </div>
  );
}
