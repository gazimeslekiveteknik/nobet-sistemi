import { useState } from 'react';
import { Save, Plus, Trash2, Clock, MapPin, Copy, Wand2 } from 'lucide-react';
import type { Zone } from '../types';

interface SettingsProps {
  appZones: Zone[];
  setAppZones: (z: Zone[]) => void;
  appPeriods: any[];
  setAppPeriods: (p: any[]) => void;
  appTimetable: Record<string, {start: string, end: string}>;
  setAppTimetable: (t: any) => void;
  onSave: () => void;
}

export function SettingsView({ appZones, setAppZones, appPeriods, setAppPeriods, appTimetable, setAppTimetable, onSave }: SettingsProps) {
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const [lessonDuration, setLessonDuration] = useState(40);
  const [breakDuration, setBreakDuration] = useState(15);

  const handleTimeChange = (lessonId: number, day: string, field: 'start' | 'end', val: string) => {
    setAppTimetable((prev: any) => ({
      ...prev,
      [`${lessonId}_${day}`]: {
        ...(prev[`${lessonId}_${day}`] || { start: '', end: '' }),
        [field]: val
      }
    }));
  };

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const m = (totalMins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleAutoFill = () => {
    const firstStart = appTimetable['1_Pazartesi']?.start;
    if (!firstStart) {
      alert('Lütfen Pazartesi 1. Dersin başlangıç saatini girin! (Örn: 09:00)');
      return;
    }

    const newTimetable = { ...appTimetable };
    const startMins = parseTime(firstStart);

    days.forEach(day => {
      let currentMins = startMins;
      
      appPeriods.forEach(lesson => {
        const endMins = currentMins + lessonDuration;
        
        newTimetable[`${lesson.id}_${day}`] = {
          start: formatTime(currentMins),
          end: formatTime(endMins)
        };
        
        currentMins = endMins + breakDuration;
      });
    });

    setAppTimetable(newTimetable);
  };

  const copyToAllDays = (lessonId: number) => {
     const pztStart = appTimetable[`${lessonId}_Pazartesi`]?.start || '';
     const pztEnd = appTimetable[`${lessonId}_Pazartesi`]?.end || '';
     
     if (!pztStart && !pztEnd) return;
     
     const newTimetable = { ...appTimetable };
     days.forEach(day => {
        if (day !== 'Pazartesi') {
           newTimetable[`${lessonId}_${day}`] = { start: pztStart, end: pztEnd };
        }
     });
     setAppTimetable(newTimetable);
  };

  const addZone = () => {
    setAppZones([...appZones, { 
      id: `z${Date.now()}`, 
      name: 'Yeni Bölge', 
      idealStaff: 2, 
      priority: appZones.length + 1,
      minStaff: 1,
      riskMultiplier: 1,
      startPeriod: 1,
      endPeriod: 8
    }]);
  };

  const removeZone = (id: string) => {
    setAppZones(appZones.filter(z => z.id !== id));
  };

  const addLesson = () => {
    setAppPeriods([...appPeriods, { id: appPeriods.length + 1, name: `${appPeriods.length + 1}. Ders` }]);
  };

  const removeLesson = (id: number) => {
    setAppPeriods(appPeriods.filter(l => l.id !== id));
  };

  const updateLessonName = (id: number, newName: string) => {
    setAppPeriods(appPeriods.map(l => l.id === id ? { ...l, name: newName } : l));
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
        <button onClick={onSave} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
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
            Ders isimlerini (Örn: "1. Blok") üzerine tıklayarak değiştirebilirsiniz. Saatleri hızlıca doldurmak için <strong>Otomatik Dağıt</strong> aracını kullanabilirsiniz.
          </p>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-end gap-4">
            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Ders Süresi</label>
               <select value={lessonDuration} onChange={e => setLessonDuration(Number(e.target.value))} className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="30">30 Dakika</option>
                 <option value="40">40 Dakika</option>
                 <option value="45">45 Dakika</option>
                 <option value="60">60 Dakika</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-blue-800 mb-1">Teneffüs Süresi</label>
               <select value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">
                 <option value="5">5 Dakika</option>
                 <option value="10">10 Dakika</option>
                 <option value="15">15 Dakika</option>
               </select>
            </div>
            <button 
               onClick={handleAutoFill}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Tümünü Otomatik Hesapla ve Dağıt
            </button>
          </div>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold border-b border-r w-32">Ders Sırası</th>
                  {days.map(day => (
                    <th key={day} className="py-3 px-2 font-semibold border-b text-center">{day}</th>
                  ))}
                  <th className="py-3 px-4 font-semibold border-b w-16">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appPeriods.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900 border-r bg-gray-50">
                      <input 
                         type="text" 
                         value={lesson.name} 
                         onChange={(e) => updateLessonName(lesson.id, e.target.value)}
                         className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1 py-0.5"
                      />
                    </td>
                    {days.map((day, dIdx) => (
                      <td key={day} className="p-2 min-w-[130px] border-r border-gray-100 relative group">
                        <div className="flex items-center gap-1">
                          <input type="time" value={appTimetable[`${lesson.id}_${day}`]?.start || ''} onChange={e => handleTimeChange(lesson.id, day, 'start', e.target.value)} className="w-full px-1 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500 bg-white" title="Başlangıç Saati" />
                          <span className="text-gray-400">-</span>
                          <input type="time" value={appTimetable[`${lesson.id}_${day}`]?.end || ''} onChange={e => handleTimeChange(lesson.id, day, 'end', e.target.value)} className="w-full px-1 py-1 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500" title="Bitiş Saati" />
                        </div>
                        {dIdx === 0 && (
                          <button 
                            onClick={() => copyToAllDays(lesson.id)}
                            className="absolute right-1 top-[-10px] bg-indigo-50 text-indigo-600 p-1 rounded border border-indigo-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-indigo-100 flex items-center gap-1 text-[10px] font-medium"
                            title="Pazartesi saatlerini kopyala"
                          >
                            <Copy className="w-3 h-3" />
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
            {appZones.map((z, idx) => (
              <div key={z.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors group">
                
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-gray-500 font-medium mb-1">Bölge Adı</label>
                  <input type="text" value={z.name} onChange={(e) => {
                     const newZones = [...appZones];
                     newZones[idx].name = e.target.value;
                     setAppZones(newZones);
                  }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                
                <div className="flex flex-col w-24">
                  <label className="text-xs text-gray-500 font-medium mb-1">Gereken Kişi</label>
                  <input type="number" value={z.idealStaff} onChange={(e) => {
                     const newZones = [...appZones];
                     newZones[idx].idealStaff = Number(e.target.value);
                     setAppZones(newZones);
                  }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                </div>
                
                <div className="flex flex-col w-24">
                  <label className="text-xs text-gray-500 font-medium mb-1">Öncelik</label>
                  <input type="number" value={z.priority} onChange={(e) => {
                     const newZones = [...appZones];
                     newZones[idx].priority = Number(e.target.value);
                     setAppZones(newZones);
                  }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                </div>

                <div className="flex flex-col w-32 border-l pl-4 border-gray-200">
                  <label className="text-xs text-gray-500 font-medium mb-1">Başlangıç</label>
                  <select value={z.startPeriod} onChange={(e) => {
                     const newZones = [...appZones];
                     newZones[idx].startPeriod = Number(e.target.value);
                     setAppZones(newZones);
                  }} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-sm">
                    {appPeriods.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col w-32">
                  <label className="text-xs text-gray-500 font-medium mb-1">Bitiş</label>
                  <select value={z.endPeriod} onChange={(e) => {
                     const newZones = [...appZones];
                     newZones[idx].endPeriod = Number(e.target.value);
                     setAppZones(newZones);
                  }} className="px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-sm">
                    {appPeriods.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
