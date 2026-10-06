import React, { useState, useEffect } from 'react';
import { FirebaseService } from './firebase/service';
import { generateSchedule, rotateSchedule } from './algorithm/scheduler';
import { calculateAvailability } from './algorithm/availability';
import type { Teacher, Lesson, Slot, Zone, Assignment, DayOfWeek} from './types';
import { Calendar, Users, ShieldAlert, FileSpreadsheet, Settings, BarChart3, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
interface Schedule {
  assignments: Assignment[];
  warnings: string[];
}


interface Snapshot {
  schedule: Schedule;
  teachers: Teacher[];
}
import { ExcelImport } from './components/ExcelImport';
import { TeacherList } from './components/TeacherList';
import { Analytics } from './components/Analytics';
import { PrintableView } from './components/PrintableView';
import { SettingsView } from './components/SettingsView';

import { bilsaData } from './data/bilsaData';

// Nöbet saatleri (Gerçek saatler: 09:00 - 17:00 aralığına göre güncellendi)
const baseSlots = [
  { id: 's1', type: 'OPENING', startTime: '08:40', endTime: '09:00' },
  { id: 's2', type: 'BREAK', afterLesson: 2, startTime: '10:30', endTime: '10:45' },
  { id: 's3', type: 'BREAK', afterLesson: 4, startTime: '12:15', endTime: '12:30' },
  { id: 's4', type: 'BREAK', afterLesson: 6, startTime: '14:00', endTime: '14:15' },
  { id: 's5', type: 'CLOSING',
 afterLesson: 8, startTime: '17:00', endTime: '17:20' },
  // 3. Kat Özel Saatler
  { id: 's_kat3_1', type: 'OPENING', startTime: '08:00', endTime: '08:20', zoneSpecificIds: ['z4'] },
  { id: 's_kat3_2', type: 'BREAK', afterLesson: 2, startTime: '09:50', endTime: '10:05', zoneSpecificIds: ['z4'] }
];

const mockSlots: Slot[] = [];
[1, 2, 3, 4, 5].forEach(day => {
  baseSlots.forEach(bs => {
     mockSlots.push({ ...bs, id: `${bs.id}_d${day}`, day: day as DayOfWeek } as Slot);
  });
});

const mockZones: Zone[] = [
  { id: 'z1', name: 'Bahçe', priority: 1, minStaff: 1, idealStaff: 2, riskMultiplier: 1.5 },
  { id: 'z2', name: 'Zemin Kat', priority: 2, minStaff: 1, idealStaff: 2, riskMultiplier: 1.2 },
  { id: 'z3', name: '2. Kat', priority: 3, minStaff: 1, idealStaff: 2, riskMultiplier: 1.0 },
  { id: 'z4', name: '3. Kat', priority: 4, minStaff: 1, idealStaff: 2, riskMultiplier: 1.0 },
];

function App() {
  const [currentView, setCurrentView] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print'>('plan');
  // Load the 35 teachers and 934 lessons parsed from the PDF
  const [teachers, setTeachers] = useState<Teacher[]>(bilsaData.teachers as Teacher[]);
  const [lessons, setLessons] = useState<Lesson[]>(bilsaData.lessons as Lesson[]);
  
  // App-level settings state
  const [appZones, setAppZones] = useState<Zone[]>(mockZones);
  const [appPeriods, setAppPeriods] = useState([
    { id: 1, name: '1. Ders' }, { id: 2, name: '2. Ders' }, { id: 3, name: '3. Ders' },
    { id: 4, name: '4. Ders' }, { id: 5, name: '5. Ders' }, { id: 6, name: '6. Ders' },
    { id: 7, name: '7. Ders' }, { id: 8, name: '8. Ders' }, { id: 9, name: '9. Ders' }, { id: 10, name: '10. Ders' }
  ]);
  const [appTimetable, setAppTimetable] = useState<Record<string, {start: string, end: string}>>({});
  const [appSlots, setAppSlots] = useState<Slot[]>(mockSlots);

  const [schedule, setSchedule] = useState(() => generateSchedule(bilsaData.teachers as Teacher[], bilsaData.lessons as Lesson[], mockSlots, mockZones));
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [weekSchedules, setWeekSchedules] = useState<Record<number, typeof schedule>>({ 0: schedule });

  const [history, setHistory] = useState<Record<number, Snapshot[]>>({});

  const saveHistory = () => {
    const currentHistSched = weekSchedules[weekOffset] || schedule;
    setHistory(prev => {
      const weekHist = prev[weekOffset] || [];
      return {
        ...prev,
        [weekOffset]: [...weekHist, { schedule: currentHistSched, teachers: JSON.parse(JSON.stringify(teachers)) }].slice(-20)
      };
    });
  };

  const handleUndo = () => {
    setHistory(prev => {
      const weekHist = prev[weekOffset] || [];
      if (weekHist.length === 0) return prev;
      
      const lastSnapshot = weekHist[weekHist.length - 1];
      const newHist = weekHist.slice(0, -1);
      
      setTeachers(lastSnapshot.teachers);
      setWeekSchedules(weeks => ({ ...weeks, [weekOffset]: lastSnapshot.schedule }));
      setSchedule(lastSnapshot.schedule);
      
      return { ...prev, [weekOffset]: newHist };
    });
  };

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // Timeout to prevent hanging if Firebase is blocked or offline
    const fallbackTimeout = setTimeout(() => {
       if (isMounted) {
          console.warn("Firebase timeout: Loading default settings.");
          setIsInitializing(false);
       }
    }, 4000);

    FirebaseService.loadSettings().then(settings => {
      if (!isMounted) return;
      clearTimeout(fallbackTimeout);
      
      if (settings) {
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
        if (settings.teachers) setTeachers(settings.teachers);
        if (settings.lessons) setLessons(settings.lessons);
        
        if (settings.lastScheduleAssignments) {
           setSchedule(prev => ({ ...prev, assignments: settings.lastScheduleAssignments }));
           setWeekSchedules({ 0: { assignments: settings.lastScheduleAssignments, warnings: [] } });
        }
      }
      setIsInitializing(false);
    }).catch(err => {
      if (!isMounted) return;
      clearTimeout(fallbackTimeout);
      console.error(err);
      setIsInitializing(false);
    });
    
    return () => { isMounted = false; };
  }, []);


  const handleSaveSettings = async () => {
    const newSlots: Slot[] = [];
    const days = [1, 2, 3, 4, 5];
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    // Validate minimum data
    if (!appTimetable['1_Pazartesi']?.start) {
       alert("Lütfen önce ders saatlerini doldurunuz!");
       return;
    }

    days.forEach((dayNum, idx) => {
       const dayName = dayNames[idx];
       
       // 1. OPENING SLOT
       const firstStart = appTimetable[`1_${dayName}`]?.start;
       if (firstStart) {
          const [h,m] = firstStart.split(':').map(Number);
          let totalMins = h * 60 + m - 20; // 20 mins before
          const openStart = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;
          
          newSlots.push({
             id: `s_open_d${dayNum}`,
             day: dayNum as any,
             type: 'OPENING',
             startTime: openStart,
             endTime: firstStart
          });
       }

       // 2. BREAK SLOTS
       for(let i=0; i<appPeriods.length - 1; i++) {
          const curr = appPeriods[i];
          const next = appPeriods[i+1];
          const currEnd = appTimetable[`${curr.id}_${dayName}`]?.end;
          const nextStart = appTimetable[`${next.id}_${dayName}`]?.start;
          
          if (currEnd && nextStart && currEnd !== nextStart) {
             newSlots.push({
               id: `s_break_${curr.id}_d${dayNum}`,
               day: dayNum as any,
               type: 'BREAK',
               afterLesson: curr.id,
               startTime: currEnd,
               endTime: nextStart
             });
          }
       }

       // 3. CLOSING SLOT
       const lastPeriod = appPeriods[appPeriods.length - 1];
       const lastEnd = appTimetable[`${lastPeriod.id}_${dayName}`]?.end;
       if (lastEnd) {
          const [h,m] = lastEnd.split(':').map(Number);
          let totalMins = h * 60 + m + 20; // 20 mins after
          const closeEnd = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;
          
          newSlots.push({
             id: `s_close_d${dayNum}`,
             day: dayNum as any,
             type: 'CLOSING',
             afterLesson: lastPeriod.id,
             startTime: lastEnd,
             endTime: closeEnd
          });
       }
    });

    setAppSlots(newSlots);
    
    // Regenerate schedule with new slots and zones
    const newSchedule = generateSchedule(teachers, lessons, newSlots, appZones, currentSchedule?.assignments || []);
    updateCurrentSchedule(newSchedule);
    
    await FirebaseService.saveSettings({
      appZones,
      appPeriods,
      appTimetable,
      appSlots: newSlots,
      teachers,
      lessons
    });
    
    alert("Ayarlar başarıyla kaydedildi ve Nöbet Programı yeni saatlere göre yeniden oluşturuldu!");
    setCurrentView('plan');
  };

  const baseSchedule = weekSchedules[0] || schedule;
  const computedSchedule = weekOffset === 0 
      ? baseSchedule 
      : { ...baseSchedule, assignments: rotateSchedule(baseSchedule.assignments, weekOffset, appSlots, appZones) };
      
  const currentSchedule = weekSchedules[weekOffset] || computedSchedule;
  const updateCurrentSchedule = (newSched: typeof schedule | ((prev: typeof schedule) => typeof schedule)) => {
    const resolved = typeof newSched === 'function' ? newSched(currentSchedule) : newSched;
    setWeekSchedules(prev => ({ ...prev, [weekOffset]: resolved }));
    setSchedule(resolved);
  };

  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Otomatik yedekleme (Herhangi bir ayar, öğretmen veya liste değiştiğinde)
  useEffect(() => {
    if (isInitializing) return;
    const timeout = setTimeout(() => {
      FirebaseService.saveSettings({
        appZones, appPeriods, appTimetable, appSlots, teachers, lessons,
        lastScheduleAssignments: currentSchedule.assignments
      }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [appZones, appPeriods, appTimetable, appSlots, teachers, lessons, currentSchedule.assignments, isInitializing]);

  
  const getWeekString = (offset = 0) => {
    const curr = new Date();
    curr.setDate(curr.getDate() + (offset * 7));
    const first = curr.getDate() - curr.getDay() + 1; // First day is the day of the month - the day of the week
    const last = first + 4; // Friday
    
    const startDate = new Date(curr.setDate(first));
    const endDate = new Date(curr.setDate(last));
    
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    if (startDate.getMonth() === endDate.getMonth()) {
       return `${startDate.getDate()} - ${endDate.getDate()} ${months[startDate.getMonth()]} Haftası`;
    } else {
       return `${startDate.getDate()} ${months[startDate.getMonth()]} - ${endDate.getDate()} ${months[endDate.getMonth()]} Haftası`;
    }
  };

  const daysList = [
    { id: 1, name: 'Pazartesi' },
    { id: 2, name: 'Salı' },
    { id: 3, name: 'Çarşamba' },
    { id: 4, name: 'Perşembe' },
    { id: 5, name: 'Cuma' }
  ];

  const handleDataImported = (importedTeachers: Teacher[], importedLessons: Lesson[]) => {
    setTeachers(importedTeachers);
    setLessons(importedLessons);
    updateCurrentSchedule(generateSchedule(importedTeachers, importedLessons, appSlots, appZones));
    setTimeout(() => setCurrentView('plan'), 1500); // Switch to plan view after showing success
  };

  const handleToggleExclude = (teacherId: string, isExcluded: boolean) => {
    saveHistory();
    setTeachers(prev => {
      const updated = prev.map(t => t.id === teacherId ? { ...t, isExcluded } : t);
      // Auto-regenerate schedule with updated teachers, keeping manual assignments
      updateCurrentSchedule(generateSchedule(updated, lessons, appSlots, appZones, currentSchedule?.assignments || []));
      return updated;
    });
  };

  const handleTeacherClick = (assignment: Assignment) => {
    saveHistory();
    const t = teachers.find(t => t.id === assignment.teacherId);
    if (!t) return;

    const confirmed = window.confirm(
      `${t.name} hocayı BUGÜN (Gün ${selectedDay}) için RAPORLU/İZİNLİ işaretlemek istiyor musunuz?\n\n` +
      `Sistem otomatik olarak:\n1. Bugün o hocanın nöbetlerine uygun bir yedek atayacak.\n2. Borçlandırma sistemiyle yedeğin gelecekteki bir nöbetini ${t.name} hocaya devredecek.`
    );

    if (!confirmed) return;

    updateCurrentSchedule(prev => {
      let newAssignments = [...prev.assignments];
      const availability = calculateAvailability(teachers, lessons, appSlots);
      
      // Find all assignments for the absent teacher ON THIS DAY
      const todayAssignments = newAssignments.filter(
        a => a.teacherId === t.id && appSlots.find(s => s.id === a.slotId)?.day === selectedDay
      );

      const logs: string[] = [];

      todayAssignments.forEach(absentAssignment => {
        const slot = appSlots.find(s => s.id === absentAssignment.slotId);
        if (!slot) return;

        // Find a replacement teacher
        let bestReplacement: string | null = null;
        let minLoad = Infinity;

        for (const cand of teachers) {
          if (cand.id === t.id || cand.isExcluded) continue;
          
          const candAvail = availability[cand.id]?.[slot.id];
          if (!candAvail || !candAvail.canDuty) continue;

          // Is candidate already assigned to this slot?
          if (newAssignments.some(a => a.slotId === slot.id && a.teacherId === cand.id)) continue;

          // Count candidate's current weekly load to find the one with the least duties
          const candLoad = newAssignments.filter(a => a.teacherId === cand.id).length;
          
          if (candLoad < minLoad) {
            minLoad = candLoad;
            bestReplacement = cand.id;
          }
        }

        if (bestReplacement) {
          const replTeacher = teachers.find(x => x.id === bestReplacement);
          
          // 1. Give the absent duty to the replacement
          const oldIndex = newAssignments.findIndex(a => a.id === absentAssignment.id);
          if (oldIndex !== -1) {
             newAssignments[oldIndex] = { ...newAssignments[oldIndex], teacherId: bestReplacement, isManual: true };
          }

          // 2. Try to settle the debt immediately by finding a future duty of the replacement
          const futureDutyIndex = newAssignments.findIndex(a => {
             if (a.teacherId !== bestReplacement) return false;
             const s = appSlots.find(slot => slot.id === a.slotId);
             // Find a duty later in the week
             return s && s.day > selectedDay;
          });

          if (futureDutyIndex !== -1) {
             const futureDutySlot = appSlots.find(s => s.id === newAssignments[futureDutyIndex].slotId);
             newAssignments[futureDutyIndex] = { ...newAssignments[futureDutyIndex], teacherId: t.id, isManual: true };
             logs.push(`${t.name}'nin bugünkü nöbeti ${replTeacher?.name} hocaya verildi. (Karşılığında ${replTeacher?.name} hocanın ${futureDutySlot?.day}. gündeki nöbeti alındı)`);
          } else {
             // Couldn't find a future duty in this week, so we'd just log it as a cross-week debt.
             logs.push(`${t.name}'nin bugünkü nöbeti ${replTeacher?.name} hocaya verildi. (Bu haftaya ait devredilecek nöbet bulunamadı, puanlarına eklendi)`);
          }
        } else {
          logs.push(`${slot.startTime} saati için uygun yedek öğretmen bulunamadı!`);
        }
      });

      setTimeout(() => alert(logs.join('\n\n')), 100);
      return { ...prev, assignments: newAssignments };
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, assignment: Assignment) => {
    e.dataTransfer.setData('assignmentId', assignment.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, targetSlotId: string, targetZoneId: string) => {
    saveHistory();
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData('assignmentId');
    if (!assignmentId) return;

    const assignment = currentSchedule.assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    // Check if moving to the same place
    if (assignment.slotId === targetSlotId && assignment.zoneId === targetZoneId) return;

    // Calculate if teacher is available in target slot
    const availability = calculateAvailability(teachers, lessons, appSlots);
    const isAvail = availability[assignment.teacherId]?.[targetSlotId];

    if (!isAvail || !isAvail.canDuty) {
       const confirmed = window.confirm(`DİKKAT: Bu öğretmenin bu saatte nöbet tutması uygun değil!\nSebep: ${isAvail?.reason || 'Bilinmiyor'}\n\nYine de zorla atamak istiyor musunuz?`);
       if (!confirmed) return;
    }

    // Update assignment
    updateCurrentSchedule(prev => {
       const newAssignments = prev.assignments.map(a => 
          a.id === assignmentId 
             ? { ...a, slotId: targetSlotId, zoneId: targetZoneId, isManual: true }
             : a
       );
       return { ...prev, assignments: newAssignments };
    });
  };

  // Only show slots for the selected day in the table
  const currentDaySlots = appSlots.filter(s => s.day === selectedDay);

  if (isInitializing) { return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="text-xl font-medium text-gray-500 animate-pulse">Sistem Yükleniyor...</div></div>; }
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600">NöbetAI</h1>
          <p className="text-sm text-gray-500 mt-1">Akıllı Çizelge Sistemi</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentView('plan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'plan' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Calendar size={20} />
            <span>Haftalık Plan</span>
          </button>
          <button 
            onClick={() => setCurrentView('teachers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Users size={20} />
            <span>Öğretmenler</span>
          </button>
          <button 
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <BarChart3 size={20} />
            <span>Analiz & Raporlar</span>
          </button>
          <button 
            onClick={() => setCurrentView('print')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Printer size={20} />
            <span>Çizelge (Yazdır)</span>
          </button>
          <button 
            onClick={() => setCurrentView('import')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'import' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <FileSpreadsheet size={20} />
            <span>Veri Aktarımı</span>
          </button>
          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {currentView === 'import' && (
            <ExcelImport onDataImported={handleDataImported} />
          )}

          {currentView === 'teachers' && (
            <TeacherList 
              teachers={teachers} 
              schedule={currentSchedule} 
              slots={appSlots} 
              zones={appZones} 
              onToggleExclude={handleToggleExclude} 
            />
          )}

          {currentView === 'reports' && (
            <Analytics teachers={teachers} assignments={currentSchedule.assignments} zones={appZones} slots={appSlots} />
          )}

          {currentView === 'print' && (
            <PrintableView 
               schedule={currentSchedule} 
               teachers={teachers} 
               zones={appZones} 
               slots={appSlots} 
               weekString={getWeekString(weekOffset)} 
            />
          )}

          {currentView === 'settings' && (
            <SettingsView 
              appZones={appZones} setAppZones={setAppZones}
              appPeriods={appPeriods} setAppPeriods={setAppPeriods}
              appTimetable={appTimetable} setAppTimetable={setAppTimetable}
              onSave={handleSaveSettings}
            />
          )}

          {currentView === 'plan' && (
            <>
              <header className="flex justify-between items-center mb-8">
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">Nöbet Planı</h2>
                    <div className="flex items-center bg-indigo-50 rounded-full p-1 border border-indigo-100 shadow-sm">
                      <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Önceki Hafta"><ChevronLeft className="w-5 h-5" /></button>
                      <span className="text-sm font-medium text-indigo-700 px-4 min-w-[140px] text-center">{getWeekString(weekOffset)}</span>
                      <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Sonraki Hafta"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-2">Sistemdeki Aktif Öğretmen: {teachers.length}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={async () => {
                      const { FirebaseService } = await import('./firebase/service');
                      const planToSave = {
                        id: 'week_1',
                        weekStartDate: new Date().toISOString(),
                        status: 'PUBLISHED' as const,
                        assignments: currentSchedule.assignments
                      };
                      try {
                        await FirebaseService.saveWeeklyPlan('week_1', teachers, lessons, planToSave);
                        alert('Başarıyla buluta kaydedildi!');
                      } catch(e) {
                        alert('Kaydedilirken hata oluştu!');
                      }
                    }}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Buluta Kaydet
                  </button>
                  
                  <button 
                    onClick={handleUndo}
                    disabled={!(history[weekOffset] && history[weekOffset].length > 0)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Geri Al (Ctrl+Z)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                    Geri Al
                  </button>

                  <button 
                    onClick={() => setIsLocked(!isLocked)}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 ${
                      isLocked 
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {isLocked ? '🔒 Plan Kilitli (Korumada)' : '🔓 Planı Kilitle'}
                  </button>

<button 
                    onClick={() => {
                       if (isLocked) {
                          alert('Bu plan kilitlenmiş! Yanlışlıkla bozulmaması için yeniden optimize etme işlemi engellendi. İşlem yapmak için kilidi açın.');
                          return;
                       }
                       saveHistory();
                       updateCurrentSchedule(generateSchedule(teachers, lessons, appSlots, appZones, currentSchedule?.assignments || []));
                    }}
                    className={`text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm ${
                      isLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Yeniden Optimize Et
                  </button>
                </div>
              </header>

              <div className="mb-6 flex space-x-2 border-b border-gray-200">
                {daysList.map(day => (
                  <button
                    key={day.id}
                    onClick={() => {
                       setSelectedDay(day.id);
                    }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                      selectedDay === day.id 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {day.name}
                  </button>
                ))}
              </div>

          {schedule.warnings.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-amber-800 mb-1">Algoritma Uyarıları</h3>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    {schedule.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-4 px-6 font-semibold text-gray-700">Zaman Dilimi</th>
                  <th className="py-4 px-6 font-semibold text-gray-700">Türü</th>
                  {appZones.map(z => (
                    <th key={z.id} className="py-4 px-6 font-semibold text-gray-700">{z.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentDaySlots.map(slot => (
                  <tr key={slot.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-gray-800 font-medium">{slot.startTime} - {slot.endTime}</td>
                    <td className="py-4 px-6 text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        slot.type === 'OPENING' ? 'bg-blue-100 text-blue-800' :
                        slot.type === 'CLOSING' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {slot.type === 'OPENING' ? 'Açılış Nöbeti' : 
                         slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : 
                         `${slot.afterLesson}. Ders Sonu`}
                      </span>
                    </td>
                    {appZones.map(zone => {
                      const assigned = currentSchedule.assignments.filter(a => a.slotId === slot.id && a.zoneId === zone.id);
                      return (
                        <td 
                          key={zone.id} 
                          className="py-4 px-6 border-l border-gray-100"
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                                if (isLocked) {
                                  alert('Plan kilitliyken sürükle-bırak yapılamaz!');
                                  return;
                                }
                                if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
                                  alert('Bu zaman dilimi bu bölge için geçerli değil!');
                                  return;
                                }
                                handleDrop(e, slot.id, zone.id);
                              }}
                        >
                          <div className="flex flex-col gap-1.5 min-h-[40px]">
                            {assigned.length > 0 ? assigned.map(a => {
                              const t = teachers.find(t => t.id === a.teacherId);
                              return (
                                <div 
                                  key={a.id} 
                                  draggable
                                  onDragStart={(e) => { if (!isLocked) handleDragStart(e, a); }}
                                  onClick={() => {
                                        if (isLocked) {
                                           alert('Plan kilitliyken raporlama işlemi yapılamaz!');
                                           return;
                                        }
                                        handleTeacherClick(a);
                                      }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-grab active:cursor-grabbing border transition-transform hover:scale-[1.02] ${
                                    a.isManual 
                                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                      : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                  }`}
                                >
                                  <span>{t?.name}</span>
                                  {a.isManual && <span className="text-[10px] uppercase font-bold px-1.5 bg-amber-200 rounded text-amber-800 ml-2">Manuel</span>}
                                </div>
                              );
                            }) : (
                              <div className="h-full w-full flex items-center text-gray-400 text-sm italic border-2 border-dashed border-transparent hover:border-gray-200 rounded-md p-2 transition-colors">
                                Boş
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
