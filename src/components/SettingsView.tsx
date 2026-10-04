import { useState } from 'react';
import { Save, Plus, Trash2, Clock, MapPin, } from 'lucide-react';


export function SettingsView() {
  const [zones, setZones] = useState([
    { id: 'z1', name: 'Bahçe', idealStaff: 2, priority: 1, startPeriod: 1, endPeriod: 8 },
    { id: 'z2', name: 'Zemin Kat', idealStaff: 2, priority: 2, startPeriod: 1, endPeriod: 8 },
    { id: 'z3', name: '2. Kat', idealStaff: 2, priority: 3, startPeriod: 1, endPeriod: 8 },
    { id: 'z4', name: '3. Kat', idealStaff: 2, priority: 4, startPeriod: 1, endPeriod: 10 },
  ]);

  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  const addZone = () => {
    setZones([...zones, { 
      id: `z${Date.now()}`, 
      name: 'Yeni Bölge', 
      idealStaff: 2, 
      priority: zones.length + 1,
      startPeriod: 1,
      endPeriod: 8
    }]);
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto mb-10">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Sistem Ayarları
          </h2>
          <p className="text-gray-500 mt-1">Ders saatlerini ve nöbet bölgelerini okulunuza göre özelleştirin.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <Save className="w-5 h-5" />
          Tüm Ayarları Kaydet
        </button>
      </div>

      <div className="p-8 space-y-12">
        
        {/* 1. HAFTALIK DERS SAATLERİ */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Haftalık Ders Saatleri Çizelgesi</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Bazı günlerin (Örn: Cuma) farklı saatlerde bitmesi durumuna karşı her günün ders saatlerini ayrı ayrı belirleyebilirsiniz.</p>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold border-b border-r">Günler \\ Dersler</th>
                  {periods.map(p => (
                    <th key={p} className="py-3 px-2 font-semibold border-b text-center">{p}. Ders</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map(day => (
                  <tr key={day} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900 border-r bg-gray-50">{day}</td>
                    {periods.map(p => (
                      <td key={p} className="p-1 min-w-[120px]">
                        <div className="flex flex-col gap-1">
                          <input type="time" className="w-full px-1 py-1 text-xs border rounded bg-white" placeholder="Başlama" />
                          <input type="time" className="w-full px-1 py-1 text-xs border rounded bg-white" placeholder="Bitiş" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* 2. NÖBET BÖLGELERİ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">Nöbet Bölgeleri (Katlar)</h3>
            </div>
            <button onClick={addZone} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Yeni Bölge Ekle
            </button>
          </div>
          
          <div className="space-y-4">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors group">
                
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-gray-500 font-medium mb-1">Bölge Adı</label>
                  <input type="text" defaultValue={z.name} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                
                <div className="flex flex-col w-24">
                  <label className="text-xs text-gray-500 font-medium mb-1">Gereken Kişi</label>
                  <input type="number" defaultValue={z.idealStaff} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                </div>
                
                <div className="flex flex-col w-24">
                  <label className="text-xs text-gray-500 font-medium mb-1">Öncelik</label>
                  <input type="number" defaultValue={z.priority} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                </div>

                <div className="flex flex-col w-32 border-l pl-4 border-gray-200">
                  <label className="text-xs text-gray-500 font-medium mb-1">Başlangıç Dersi</label>
                  <select defaultValue={z.startPeriod} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50">
                    {periods.map(p => <option key={p} value={p}>{p}. Ders</option>)}
                  </select>
                </div>

                <div className="flex flex-col w-32">
                  <label className="text-xs text-gray-500 font-medium mb-1">Bitiş Dersi</label>
                  <select defaultValue={z.endPeriod} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50">
                    {periods.map(p => <option key={p} value={p}>{p}. Ders</option>)}
                  </select>
                </div>

                <button 
                  onClick={() => removeZone(z.id)}
                  className="mt-5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Bölgeyi Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
