const fs = require('fs');

const code = `import { useState } from 'react';
import { Save, Plus, Trash2, Clock, MapPin, Copy, Link as LinkIcon } from 'lucide-react';

export function SettingsView() {
  const [zones, setZones] = useState([
    { id: 'z1', name: 'Bahçe', idealStaff: 2, priority: 1, startPeriod: 1, endPeriod: 8 },
    { id: 'z2', name: 'Zemin Kat', idealStaff: 2, priority: 2, startPeriod: 1, endPeriod: 8 },
    { id: 'z3', name: '2. Kat', idealStaff: 2, priority: 3, startPeriod: 1, endPeriod: 8 },
    { id: 'z4', name: '3. Kat', idealStaff: 2, priority: 4, startPeriod: 1, endPeriod: 10 },
  ]);

  const [lessons, setLessons] = useState([
    { id: 1, isBlock: false }, { id: 2, isBlock: false }, { id: 3, isBlock: false },
    { id: 4, isBlock: false }, { id: 5, isBlock: false }, { id: 6, isBlock: false },
    { id: 7, isBlock: false }, { id: 8, isBlock: false }, { id: 9, isBlock: false }, { id: 10, isBlock: false }
  ]);

  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  const addZone = () => {
    setZones([...zones, { 
      id: \`z\${Date.now()}\`, 
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

  const addLesson = () => {
    setLessons([...lessons, { id: lessons.length + 1, isBlock: false }]);
  };

  const removeLesson = (id: number) => {
    setLessons(lessons.filter(l => l.id !== id));
  };

  const toggleBlock = (id: number) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, isBlock: !l.isBlock } : l));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-7xl mx-auto mb-10">
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">Haftalık Ders Saatleri Çizelgesi</h3>
            </div>
            <button onClick={addLesson} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Ders Ekle (Sabahçı/Öğlenci)
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Satırlar dersleri, sütunlar günleri gösterir. <strong>Pazartesi</strong> hücresine saatleri girip yanındaki <Copy className="w-3 h-3 inline" /> ikonuna basarak tüm haftaya kopyalayabilirsiniz. Bir dersi <strong>Blok</strong> işaretlerseniz, önceki dersle arasına teneffüs/nöbet konulmaz.
          </p>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold border-b border-r w-32">Ders Sırası</th>
                  <th className="py-3 px-4 font-semibold border-b border-r w-24 text-center">Blok?</th>
                  {days.map(day => (
                    <th key={day} className="py-3 px-2 font-semibold border-b text-center">{day}</th>
                  ))}
                  <th className="py-3 px-4 font-semibold border-b w-16">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lessons.map((lesson, idx) => (
                  <tr key={lesson.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900 border-r bg-gray-50">
                      {lesson.id}. Ders
                    </td>
                    <td className="py-3 px-4 border-r text-center bg-gray-50">
                      {idx > 0 && (
                        <button 
                          onClick={() => toggleBlock(lesson.id)}
                          className={\`px-2 py-1 text-xs rounded-md font-medium border flex items-center justify-center gap-1 w-full \${lesson.isBlock ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'}\`}
                          title="Önceki ders ile blok yap (Araya teneffüs koyma)"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {lesson.isBlock ? 'Blok' : 'Ayrı'}
                        </button>
                      )}
                    </td>
                    {days.map((day, dIdx) => (
                      <td key={day} className="p-2 min-w-[130px] border-r border-gray-100 relative group">
                        <div className="flex items-center gap-1">
                          <input type="time" className={\`w-full px-1 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500 \${lesson.isBlock ? 'bg-gray-100 text-gray-400' : 'bg-white'}\`} disabled={lesson.isBlock} title={lesson.isBlock ? 'Blok derslerde saat girişi yapılmaz, önceki dersle bitişik sayılır.' : 'Başlangıç Saati'} />
                          <span className="text-gray-400">-</span>
                          <input type="time" className="w-full px-1 py-1 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500" title="Bitiş Saati" />
                        </div>
                        {dIdx === 0 && !lesson.isBlock && (
                          <button 
                            className="absolute right-1 top-[-10px] bg-indigo-50 text-indigo-600 p-1 rounded border border-indigo-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-indigo-100 flex items-center gap-1 text-[10px] font-medium"
                            title="Pazartesi saatlerini Salı, Çarşamba, Perşembe ve Cuma'ya kopyala"
                            onClick={() => alert('Pazartesi saatleri tüm günlere kopyalandı! (Gerçek veritabanı entegrasyonu aşamasında aktif olacaktır)')}
                          >
                            <Copy className="w-3 h-3" /> Tümüne Kopyala
                          </button>
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => removeLesson(lesson.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Dersi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
                  <select defaultValue={z.startPeriod} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-sm">
                    {lessons.map(l => <option key={l.id} value={l.id}>{l.id}. Ders</option>)}
                  </select>
                </div>

                <div className="flex flex-col w-32">
                  <label className="text-xs text-gray-500 font-medium mb-1">Bitiş Dersi</label>
                  <select defaultValue={z.endPeriod} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-sm">
                    {lessons.map(l => <option key={l.id} value={l.id}>{l.id}. Ders</option>)}
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
`

fs.writeFileSync('src/components/SettingsView.tsx', code);
