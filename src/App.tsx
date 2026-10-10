import React, { useState, useEffect } from 'react';
import { FirebaseService } from './firebase/service';
import { storage } from './firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { useRef } from 'react';
import { generateSchedule, rotateSchedule } from './algorithm/scheduler';
import { calculateAvailability } from './algorithm/availability';
import type { Teacher, Lesson, Slot, Zone, Assignment, DayOfWeek} from './types';
import { Calendar, ShieldAlert, Settings, BarChart3, ChevronLeft, ChevronRight, Printer, X, Plus } from 'lucide-react';
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
import { TeacherSchedulesPrintView } from './components/TeacherSchedulesPrintView';
import { TeacherTimetablesPrintView } from './components/TeacherTimetablesPrintView';
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
  const [currentView, setCurrentView] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print' | 'print-teachers'>('plan');
  const [settingsTab, setSettingsTab] = useState<'config' | 'teachers' | 'import'>('import');
  const [printTab, setPrintTab] = useState<'master' | 'personal' | 'timetable'>('master');
  const [schedulesSearch, setSchedulesSearch] = useState('');
  const [timetablesSearch, setTimetablesSearch] = useState('');

  // Clear search states when leaving the print menu
  useEffect(() => {
    if (currentView !== 'print') {
      setSchedulesSearch('');
      setTimetablesSearch('');
    }
  }, [currentView]);

  // Load the 35 teachers and 934 lessons parsed from the PDF
  
    const generatePdfBlob = async (activeTeachers: Teacher[]) => {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      let addedPage = false;
      const filteredTeachers = activeTeachers.filter(t => !t.isExcluded);
      for (let i = 0; i < filteredTeachers.length; i++) {
         setPublishingProgress(`PDF Oluşturuluyor... (${i+1}/${filteredTeachers.length})`);
         await new Promise(r => setTimeout(r, 50)); // let UI update
         const teacher = filteredTeachers[i];
         const el = document.getElementById(`teacher-print-${teacher.id}`);
         
         if (el) {
            const imgData = await toJpeg(el, {
               cacheBust: true,
               pixelRatio: 1,
               quality: 0.85,
               backgroundColor: '#ffffff',
               skipFonts: true
            });
            
            if (addedPage) pdf.addPage();
            addedPage = true;
            
            const imgProps = pdf.getImageProperties(imgData);
            const padding = 10;
            const availableWidth = pdfWidth - (padding * 2);
            const availableHeight = pdfHeight - (padding * 2);
            const ratio = Math.min(availableWidth / imgProps.width, availableHeight / imgProps.height);
            
            const finalW = imgProps.width * ratio;
            const finalH = imgProps.height * ratio;
            
            const x = (pdfWidth - finalW) / 2;
            const y = (pdfHeight - finalH) / 2;
            
            pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
         }
      }
      
      return pdf.output('blob');
   };

   const sendTelegramNotification = async (weekStr: string, activeTeachers: Teacher[], msg: string) => {
    if (!telegramToken || !telegramChatId) {
       alert("Telegram ayarları eksik!");
       return false;
    }
    try {
      setPdfTeachers(activeTeachers);
      // Wait for React to render the hidden div and load fonts
      await new Promise(r => setTimeout(r, 1500));
      
      if (!hiddenPrintRef.current) return false;
      
      // Use html-to-image which natively supports CSS features like oklch via SVG foreignObject
      
      const pdfBlob = await generatePdfBlob(activeTeachers);
      
      const formData = new FormData();
      formData.append("chat_id", telegramChatId);
      formData.append("document", new File([pdfBlob], `${weekStr.replace(/ /g, '_')}_El_Programi.pdf`, { type: 'application/pdf' }));
      formData.append("caption", msg);

      const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
         method: 'POST',
         body: formData
      });
      if (!res.ok) {
         const errText = await res.text();
         console.error('Telegram Error:', errText);
         alert('Telegram Hatası: ' + errText);
      }
      
      setPdfTeachers([]); // Cleanup
      return res.ok;
    } catch(e) {
      console.error(e);
      alert("PDF Üretim Hatası: " + (e instanceof Error ? e.message : String(e)));
      setPdfTeachers([]);
      return false;
    }
  };

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
  const getWeekString = (offset = 0) => {
    const curr = new Date();
    curr.setDate(curr.getDate() + (offset * 7));
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    if (monday.getMonth() === friday.getMonth()) {
      return `${monday.getDate()} - ${friday.getDate()} ${monthNames[monday.getMonth()]} Haftası`;
    }
    return `${monday.getDate()} ${monthNames[monday.getMonth()]} - ${friday.getDate()} ${monthNames[friday.getMonth()]} Haftası`;
  };
  const [weekSchedules, setWeekSchedules] = useState<Record<number, typeof schedule>>({ 0: schedule });

  const [history, setHistory] = useState<Record<number, Snapshot[]>>({});
  const [publishedWeeks, setPublishedWeeks] = useState<Record<string, {assignments: Assignment[], teachers: Teacher[], lessons: Lesson[]}>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const hiddenPrintRef = useRef<HTMLDivElement>(null);
  const [pdfTeachers, setPdfTeachers] = useState<Teacher[]>([]);
  const [telegramMessage, setTelegramMessage] = useState("Yeni haftalık nöbet programımız yayınlanmıştır. Güncel Öğretmen El Programı (PDF) ektedir.\n\nİyi çalışmalar dileriz.");
  const [sendTelegramPdf, setSendTelegramPdf] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState<string | null>(null);

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
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [adminPassword, setAdminPassword] = useState('1234');

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
        if (settings.telegramToken) setTelegramToken(settings.telegramToken);
        if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
        if (settings.adminPassword) setAdminPassword(settings.adminPassword);
        
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
    const newSchedule = generateSchedule(teachers, lessons, newSlots, appZones, currentSchedule?.assignments.filter(a => !a.isManual) || []);
    updateCurrentSchedule(newSchedule);
    setSchedule(newSchedule);
    
    await FirebaseService.saveSettings({
      appZones,
      appPeriods,
      appTimetable,
      appSlots: newSlots,
      teachers,
      lessons,
      telegramToken, telegramChatId, adminPassword
    });
    
    alert("Ayarlar başarıyla kaydedildi ve Nöbet Programı yeni saatlere göre yeniden oluşturuldu!");
    setCurrentView('plan');
  };

  
  const baseSchedule = schedule;
  const targetWeekStr = getWeekString(weekOffset);
  const computedSchedule = {
    ...baseSchedule,
    assignments: publishedWeeks[targetWeekStr] 
      ? publishedWeeks[targetWeekStr].assignments
      : (weekOffset === 0 
          ? baseSchedule.assignments 
          : rotateSchedule(baseSchedule.assignments, weekOffset, appSlots, appZones))
  };

      
  const currentSchedule = weekSchedules[weekOffset] || computedSchedule;
  const updateCurrentSchedule = (newSched: typeof schedule | ((prev: typeof schedule) => typeof schedule)) => {
    const resolved = typeof newSched === 'function' ? newSched(currentSchedule) : newSched;
    setWeekSchedules(prev => ({ ...prev, [weekOffset]: resolved }));
  };

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [addTeacherModal, setAddTeacherModal] = useState<{slotId: string, zoneId: string} | null>(null);
  const [leaveModal, setLeaveModal] = useState<{assignment: Assignment, teacher: Teacher} | null>(null);
  const [telegramSpecificModal, setTelegramSpecificModal] = useState<{title: string, message: string, affectedTeachers: Teacher[]} | null>(null);
  const [longLeaveDate, setLongLeaveDate] = useState<string>('');

  // Otomatik yedekleme (Herhangi bir ayar, öğretmen veya liste değiştiğinde)
  useEffect(() => {
    if (isInitializing) return;
    const timeout = setTimeout(() => {
      FirebaseService.saveSettings({
        appZones, appPeriods, appTimetable, appSlots, teachers, lessons,
        lastScheduleAssignments: (weekSchedules[0] || schedule).assignments,
        publishedWeeks,
        telegramToken, telegramChatId, adminPassword
      }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [appZones, appPeriods, appTimetable, appSlots, teachers, lessons, (weekSchedules[0] || schedule).assignments, publishedWeeks, isInitializing, telegramToken, telegramChatId, adminPassword]);

  

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
    const newSched = generateSchedule(importedTeachers, importedLessons, appSlots, appZones);
    updateCurrentSchedule(newSched);
    setSchedule(newSched);
    setTimeout(() => setCurrentView('plan'), 1500); // Switch to plan view after showing success
  };

  const handleToggleExclude = (teacherId: string, isExcluded: boolean) => {
    saveHistory();
    setTeachers(prev => {
      const updated = prev.map(t => t.id === teacherId ? { ...t, isExcluded } : t);
      // Auto-regenerate schedule with updated teachers, keeping manual assignments
      const newSched = generateSchedule(updated, lessons, appSlots, appZones, currentSchedule?.assignments.filter(a => !a.isManual) || []);
      updateCurrentSchedule(newSched);
      setSchedule(newSched);
      return updated;
    });
  };

  const handleTeacherClick = (assignment: Assignment) => {
    const t = teachers.find(t => t.id === assignment.teacherId);
    if (!t) return;
    setLeaveModal({ assignment, teacher: t });
  };
  
  const processOneDayLeave = (t: Teacher) => {
    saveHistory();
    let affectedTeacherIds = new Set<string>();
    affectedTeacherIds.add(t.id);
    let finalLogs = "";
    
    updateCurrentSchedule(prev => {
      let newAssignments = [...prev.assignments];
      
      const todayAssignments = newAssignments.filter(
        a => a.teacherId === t.id && appSlots.find(s => s.id === a.slotId)?.day === selectedDay
      );

      const logs: string[] = [];

      todayAssignments.forEach(absentAssignment => {
        const slot = appSlots.find(s => s.id === absentAssignment.slotId);
        if (!slot) return;

        const availableTeachers = teachers.filter(cand => 
          cand.id !== t.id && !cand.isExcluded &&
          !newAssignments.some(a => a.teacherId === cand.id && a.slotId === slot.id) &&
          !lessons.some(l => l.teacherId === cand.id && l.day === slot.day && appTimetable[l.period]?.start < slot.endTime && appTimetable[l.period]?.end > slot.startTime)
        );

        let bestReplacement = availableTeachers[0]?.id;
        
        if (bestReplacement) {
          affectedTeacherIds.add(bestReplacement);
          const replTeacher = teachers.find(x => x.id === bestReplacement);
          
          const oldIndex = newAssignments.findIndex(a => a.id === absentAssignment.id);
          if (oldIndex !== -1) {
             newAssignments[oldIndex] = { ...newAssignments[oldIndex], teacherId: bestReplacement, isManual: true };
          }

          const futureDutyIndex = newAssignments.findIndex(a => {
             if (a.teacherId !== bestReplacement) return false;
             const s = appSlots.find(slot => slot.id === a.slotId);
             return s && s.day > selectedDay;
          });

          if (futureDutyIndex !== -1) {
             const futureDutySlot = appSlots.find(s => s.id === newAssignments[futureDutyIndex].slotId);
             newAssignments[futureDutyIndex] = { ...newAssignments[futureDutyIndex], teacherId: t.id, isManual: true };
             logs.push(`• ${t.name} hocanın bugünkü (${slot.startTime}) nöbeti ${replTeacher?.name} hocaya verildi. (Karşılığında ${replTeacher?.name} hocanın ${["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][futureDutySlot?.day || 0]} günkü nöbeti alındı)`);
          } else {
             logs.push(`• ${t.name} hocanın bugünkü (${slot.startTime}) nöbeti ${replTeacher?.name} hocaya verildi. (Devredilecek nöbet bulunamadı, sistem borçlandırdı)`);
          }
        } else {
          logs.push(`• ${slot.startTime} saati için uygun yedek öğretmen bulunamadı!`);
        }
      });
      
      finalLogs = logs.join('\n');
      return { ...prev, assignments: newAssignments };
    });
    
    setTimeout(() => {
       setTelegramSpecificModal({
          title: "Günlük Rapor Değişikliği",
          message: `🚨 Duyuru: ${t.name} hocamız bugün raporlu/izinli olduğu için nöbetlerde aşağıdaki zorunlu değişiklikler yapılmıştır:

${finalLogs}

Değişiklikten etkilenen öğretmenlerimizin güncel programı ektedir.`,
          affectedTeachers: teachers.filter(x => affectedTeacherIds.has(x.id))
       });
    }, 200);
  };

  const processLongLeave = (t: Teacher, untilDate: string) => {
    if (!untilDate) {
      alert("Lütfen iznin bitiş (dönüş) tarihini seçiniz!");
      return;
    }
    saveHistory();
    const tempTeachers = teachers.map(x => x.id === t.id ? { ...x, isExcluded: true, excludedUntil: untilDate } : x);
    setTeachers(tempTeachers);
    
    const newSched = generateSchedule(tempTeachers, lessons, appSlots, appZones, currentSchedule?.assignments.filter(a => !a.isManual) || []);
    updateCurrentSchedule(newSched);
    setSchedule(newSched);
    
    setTimeout(() => {
       setTelegramSpecificModal({
          title: "Uzun Süreli İzin / Görevlendirme",
          message: `🚨 Duyuru: ${t.name} hocamız ${new Date(untilDate).toLocaleDateString('tr-TR')} tarihine kadar görevli/izinli olduğu için şablon nöbet programı yeniden dengelenmiş ve güncellenmiştir.\n\nTüm öğretmenlerimizin güncel programı ektedir.`,
          affectedTeachers: tempTeachers 
       });
    }, 200);
  };


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, assignment: Assignment) => {
    e.dataTransfer.setData('assignmentId', assignment.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault(); // allow drop
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    saveHistory();
    updateCurrentSchedule(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== assignmentId)
    }));
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
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
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
            onClick={() => { setCurrentView('settings'); setSettingsTab('config'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>

          <button 
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <BarChart3 size={20} />
            <span>Analiz & Raporlar</span>
          </button>

          <button 
            onClick={() => { setCurrentView('print'); setPrintTab('master'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
          >
            <Printer size={20} />
            <span>Çıktılar & Çizelgeler</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 print:p-0">
        <div className="max-w-6xl mx-auto print:max-w-none print:m-0">


          {currentView === 'reports' && (
            <Analytics teachers={teachers} assignments={currentSchedule.assignments} zones={appZones} slots={appSlots} />
          )}

          {currentView === 'print' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 print:hidden">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setPrintTab('master')} 
                    className={`pb-3 px-1 font-medium text-lg border-b-2 transition-colors ${printTab === 'master' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Okul Panosu (Genel)
                  </button>
                  <button 
                    onClick={() => setPrintTab('personal')} 
                    className={`pb-3 px-1 font-medium text-lg border-b-2 transition-colors ${printTab === 'personal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Öğretmen El Programı
                  </button>
                  <button 
                    onClick={() => setPrintTab('timetable')} 
                    className={`pb-3 px-1 font-medium text-lg border-b-2 transition-colors ${printTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Ders Programları
                  </button>
                </div>
                
                <div className={`flex items-center bg-indigo-50 rounded-full p-1 border border-indigo-100 shadow-sm mb-2 ${printTab === 'timetable' ? 'opacity-0 pointer-events-none' : ''}`}>
                  <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Önceki Hafta"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="text-sm font-medium text-indigo-700 px-4 min-w-[140px] text-center">{getWeekString(weekOffset)}</span>
                  <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Sonraki Hafta"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              {printTab === 'master' && (
                <PrintableView 
                  schedule={currentSchedule} 
                  teachers={publishedWeeks[getWeekString(weekOffset)]?.teachers || teachers} 
                  zones={appZones} 
                  slots={appSlots} 
                  weekString={getWeekString(weekOffset)} 
                />
              )}
              {printTab === 'personal' && (
                <TeacherSchedulesPrintView
                  teachers={publishedWeeks[getWeekString(weekOffset)]?.teachers || teachers}
                  assignments={currentSchedule.assignments}
                  slots={appSlots}
                  zones={appZones}
                  weekString={getWeekString(weekOffset)}
                  searchTerm={schedulesSearch}
                  setSearchTerm={setSchedulesSearch}
                />
              )}
              {printTab === 'timetable' && (
                <TeacherTimetablesPrintView
                  teachers={publishedWeeks[getWeekString(weekOffset)]?.teachers || teachers}
                  lessons={publishedWeeks[getWeekString(weekOffset)]?.lessons || lessons}
                  searchTerm={timetablesSearch}
                  setSearchTerm={setTimetablesSearch}
                />
              )}
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center mb-8 border-b border-gray-200 pb-6">
                <button onClick={() => setSettingsTab('import')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${settingsTab === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>1</div>
                  <span className={`ml-3 font-medium text-lg ${settingsTab === 'import' ? 'text-indigo-600' : 'text-gray-500'}`}>Veri Aktarımı</span>
                </button>
                <ChevronRight className="w-5 h-5 mx-6 text-gray-400" />
                <button onClick={() => setSettingsTab('teachers')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${settingsTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>2</div>
                  <span className={`ml-3 font-medium text-lg ${settingsTab === 'teachers' ? 'text-indigo-600' : 'text-gray-500'}`}>Öğretmenler</span>
                </button>
                <ChevronRight className="w-5 h-5 mx-6 text-gray-400" />
                <button onClick={() => setSettingsTab('config')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${settingsTab === 'config' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>3</div>
                  <span className={`ml-3 font-medium text-lg ${settingsTab === 'config' ? 'text-indigo-600' : 'text-gray-500'}`}>Program & Bölge Ayarı</span>
                </button>
              </div>
              
              {settingsTab === 'config' && (
                <SettingsView 
                  appZones={appZones} setAppZones={setAppZones}
                  appPeriods={appPeriods} setAppPeriods={setAppPeriods}
                  appTimetable={appTimetable} setAppTimetable={setAppTimetable}
                  telegramToken={telegramToken} setTelegramToken={setTelegramToken}
                  telegramChatId={telegramChatId} setTelegramChatId={setTelegramChatId}
                  adminPassword={adminPassword} setAdminPassword={setAdminPassword}
                  onSave={handleSaveSettings}
                />
              )}

              {settingsTab === 'teachers' && (
                <TeacherList 
                  teachers={teachers} 
                  schedule={currentSchedule} 
                  slots={appSlots} 
                  zones={appZones} 
                  onToggleExclude={handleToggleExclude} 
                />
              )}

              {settingsTab === 'import' && (
                <ExcelImport onDataImported={handleDataImported} />
              )}
            </div>
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
                  <p className="text-gray-500 mt-2">
                    Toplam {teachers.length} öğretmen. Nöbet tutan: <span className="font-semibold text-green-600">{teachers.filter(t => !t.isExcluded).length}</span>, Muaf: <span className="font-semibold text-red-500">{teachers.filter(t => t.isExcluded).length}</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPublishModalOpen(true)}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Programı Yayınla (Kilitle)
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
                       const newSched = generateSchedule(teachers, lessons, appSlots, appZones, currentSchedule?.assignments.filter(a => !a.isManual) || []);
                       updateCurrentSchedule(newSched);
                       setSchedule(newSched);
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
                          <div className="flex flex-col gap-1.5 min-h-[40px] group/cell relative pb-5">
                            {assigned.length > 0 ? assigned.map(a => {
                              const t = teachers.find(t => t.id === a.teacherId);
                              return (
                                <div key={a.id} className="relative group">
                                <div 
                                  draggable
                                  onDragStart={(e) => { if (!isLocked) handleDragStart(e, a); }}
                                  onClick={() => {
                                        if (isLocked) {
                                           alert('Plan kilitliyken raporlama işlemi yapılamaz!');
                                           return;
                                        }
                                        handleTeacherClick(a);
                                      }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-grab active:cursor-grabbing border transition-transform group-hover:scale-[1.02] ${
                                    a.isManual 
                                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                      : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                  }`}
                                >
                                  <span>{t?.name}</span>
                                  {a.isManual && <span className="text-[10px] uppercase font-bold px-1.5 bg-amber-200 rounded text-amber-800 ml-2">Manuel</span>}
                                </div>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveAssignment(a.id);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 rounded-full p-0.5 border border-red-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm z-10"
                                    title="Görevi Sil"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                </div>
                              );
                            }) : (
                              <div className="h-full w-full flex items-center text-gray-400 text-sm italic border-2 border-dashed border-transparent hover:border-gray-200 rounded-md p-2 transition-colors">
                                Boş
                              </div>
                            )}

                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddTeacherModal({ slotId: slot.id, zoneId: zone.id });
                                }}
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 bg-green-100 text-green-700 rounded-full p-1 border border-green-300 opacity-0 group-hover/cell:opacity-100 transition-all hover:bg-green-200 hover:scale-110 shadow-sm z-10"
                                title="Öğretmen Ekle"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
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

      {/* MANUEL ÖĞRETMEN EKLEME MODALI */}
      {addTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Öğretmen Ekle (Manuel)</h3>
              <button 
                onClick={() => setAddTeacherModal(null)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {teachers.filter(t => !t.isExcluded).map(t => {
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        saveHistory();
                        updateCurrentSchedule(prev => ({
                          ...prev,
                          assignments: [
                            ...prev.assignments,
                            {
                              id: `manual_${Date.now()}_${t.id}`,
                              slotId: addTeacherModal.slotId,
                              zoneId: addTeacherModal.zoneId,
                              teacherId: t.id,
                              isManual: true
                            }
                          ]
                        }));
                        setAddTeacherModal(null);
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100 transition-colors"
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}


      
      {publishModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Yeni Programı Yayınla</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Hazırladığınız program TV Kiosk ve Telegram'da yayınlanacaktır.
            </p>

            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendTelegramPdf} 
                  onChange={e => setSendTelegramPdf(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Telegram Grubuna PDF ve Mesaj Gönder</span>
              </label>
              
              {sendTelegramPdf && (
                <textarea 
                  value={telegramMessage}
                  onChange={e => setTelegramMessage(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-50 h-28"
                  placeholder="Telegram mesajınızı buraya yazın..."
                />
              )}
            </div>
            
            <div className="space-y-3 mt-4">
              <button 
                disabled={isPublishing}
                onClick={async () => {
                  setIsPublishing(true);
                  const weekStr = getWeekString(weekOffset);
                  try {
                    let pdfUrl = null;
                    setPdfTeachers(teachers);
                    await new Promise(r => setTimeout(r, 1500));
                    const pdfBlob = await generatePdfBlob(teachers);
                    const filename = `weekly_pdfs/${weekStr.replace(/ /g, '_')}.pdf`;
                    const storageRef = ref(storage, filename);
                    await new Promise<void>((resolve, reject) => {
                      const uploadTask = uploadBytesResumable(storageRef, pdfBlob);
                      uploadTask.on('state_changed', 
                        (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          setPublishingProgress(`Buluta Yükleniyor... (%${progress.toFixed(0)})`);
                        }, 
                        (error) => reject(error), 
                        () => resolve()
                      );
                    });
                    pdfUrl = await getDownloadURL(storageRef);
                      
                    if (sendTelegramPdf && telegramToken && telegramChatId) {
                      const formData = new FormData();
                      formData.append("chat_id", telegramChatId);
                      formData.append("document", new File([pdfBlob], `${weekStr.replace(/ /g, '_')}_El_Programi.pdf`, { type: 'application/pdf' }));
                      formData.append("caption", telegramMessage);
                      await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, { method: 'POST', body: formData });
                    }
                    
                    setPdfTeachers([]);
                    
                    const updatedData = { assignments: currentSchedule.assignments, teachers, lessons, pdfUrl };
                    await FirebaseService.saveSettings({ publishedWeeks: { ...publishedWeeks, [weekStr]: updatedData } });
                    setPublishedWeeks(prev => ({ ...prev, [weekStr]: updatedData }));
                    alert("Yayınlandı ve buluta kaydedildi!");
                  } catch (e) {
                    console.error(e);
                    alert("Hata: " + e);
                    setPdfTeachers([]);
                  }
                  setIsPublishing(false);
                  setPublishingProgress(null);
                  setPublishModalOpen(false);
                }}
                className="w-full text-left p-4 rounded-lg border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-indigo-900">Hemen Şimdi (Mevcut Haftayı Ez)</div>
                <div className="text-sm text-indigo-700 mt-1">
                  {isPublishing && publishingProgress ? publishingProgress : "Acil durum değişiklikleri için uygundur."}
                </div>
              </button>

              <button 
                disabled={isPublishing}
                onClick={async () => {
                  setIsPublishing(true);
                  const nextWeekStr = getWeekString(weekOffset + 1);
                  try {
                    let pdfUrl = null;
                    setPdfTeachers(teachers);
                    await new Promise(r => setTimeout(r, 1500));
                    const pdfBlob = await generatePdfBlob(teachers);
                    const filename = `weekly_pdfs/${nextWeekStr.replace(/ /g, '_')}.pdf`;
                    const storageRef = ref(storage, filename);
                    await new Promise<void>((resolve, reject) => {
                      const uploadTask = uploadBytesResumable(storageRef, pdfBlob);
                      uploadTask.on('state_changed', 
                        (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          setPublishingProgress(`Buluta Yükleniyor... (%${progress.toFixed(0)})`);
                        }, 
                        (error) => reject(error), 
                        () => resolve()
                      );
                    });
                    pdfUrl = await getDownloadURL(storageRef);
                    setPdfTeachers([]);

                    // SADECE KAYDET (GÖNDERME) - CRON İÇİN HAZIRLA
                    const telegramPending = true;
                    const updatedData = { assignments: currentSchedule.assignments, teachers, lessons, pdfUrl, telegramPending, telegramMessage };
                    await FirebaseService.saveSettings({ publishedWeeks: { ...publishedWeeks, [nextWeekStr]: updatedData } });
                    setPublishedWeeks(prev => ({ ...prev, [nextWeekStr]: updatedData }));
                    alert(`${nextWeekStr} için PDF oluşturuldu ve kaydedildi! Pazar saat 18:00'de otomatik gönderilecektir.`);
                  } catch (e) {
                    console.error(e);
                    alert("Hata: " + e);
                    setPdfTeachers([]);
                  }
                  setIsPublishing(false);
                  setPublishingProgress(null);
                  setPublishModalOpen(false);
                }}
                className="w-full text-left p-4 rounded-lg border-2 border-emerald-100 hover:border-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-emerald-900">Gelecek Hafta Pazartesi</div>
                <div className="text-sm text-emerald-700 mt-1">
                  {isPublishing && publishingProgress ? publishingProgress : "Mevcut haftanın programı Cuma'ya kadar çalışmaya devam eder."}
                </div>
              </button>
            </div>

            <div className="mt-4 text-right">
              <button 
                disabled={isPublishing}
                onClick={() => setPublishModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}


      
      {leaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">İzin / Rapor Yönetimi</h3>
            <p className="text-gray-600 mb-6 font-medium text-indigo-700">
              Seçilen Öğretmen: {leaveModal.teacher.name}
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => {
                  processOneDayLeave(leaveModal.teacher);
                  setLeaveModal(null);
                }}
                className="w-full text-left p-4 rounded-lg border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 transition-colors"
              >
                <div className="font-semibold text-orange-900">Günlük Rapor / Kısa İzin (Sadece Bugün)</div>
                <div className="text-sm text-orange-700 mt-1">Sadece bugünkü nöbetleri boşta olan başka bir öğretmene devredilir. (Geçmiş ve gelecek haftalar bozulmaz)</div>
              </button>

              <div className="p-4 rounded-lg border-2 border-red-100 bg-red-50">
                <div className="font-semibold text-red-900 mb-2">Uzun Süreli Rapor / Görevli İzinli</div>
                <div className="text-sm text-red-700 mb-3">Öğretmen belirttiğiniz tarihe kadar sistemden muaf tutulur ve program kalan öğretmenlere yeniden dağıtılır. Tarih dolduğunda sistem yöneticiye hatırlatma mesajı atar.</div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Öğretmenin Dönüş Tarihi:</label>
                <input 
                  type="date" 
                  value={longLeaveDate}
                  onChange={e => setLongLeaveDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-3"
                />
                <button 
                  onClick={() => {
                    processLongLeave(leaveModal.teacher, longLeaveDate);
                    setLeaveModal(null);
                    setLongLeaveDate('');
                  }}
                  className="w-full bg-red-600 text-white py-2 rounded font-medium hover:bg-red-700"
                >
                  Şablonu Güncelle ve Muaf Tut
                </button>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button 
                onClick={() => setLeaveModal(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}



      {telegramSpecificModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{telegramSpecificModal.title}</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Bu değişikliği Telegram grubuna anında PDF (El Programı) ve açıklama ile göndermek ister misiniz?
            </p>

            <textarea 
              value={telegramSpecificModal.message}
              onChange={e => setTelegramSpecificModal(prev => prev ? {...prev, message: e.target.value} : null)}
              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-50 h-36 mb-4"
            />
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setTelegramSpecificModal(null)}
                className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Gönderme (Kapat)
              </button>
              <button 
                onClick={async () => {
                  try {
                    setIsSendingTelegram(true);
                    const weekStr = getWeekString(weekOffset);
                    const ok = await sendTelegramNotification(weekStr, telegramSpecificModal.affectedTeachers, telegramSpecificModal.message);
                    if(ok) alert('Telegram mesajı ve PDF başarıyla gönderildi!');
                    // Note: if !ok, sendTelegramNotification already alerts the specific error.
                    setTelegramSpecificModal(null);
                  } catch (err) {
                    alert('Beklenmeyen Hata: ' + String(err));
                  } finally {
                    setIsSendingTelegram(false);
                  }
                }}
                disabled={isSendingTelegram}
                className="flex-1 py-2 bg-[#0088cc] text-white rounded-lg transition-colors font-medium hover:bg-[#0077b3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingTelegram ? 'Gönderiliyor...' : "Telegram'a Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}




    
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1000px', background: '#fff', zIndex: -100 }}>
        <div ref={hiddenPrintRef} className="p-8 bg-white text-black">
           {pdfTeachers.length > 0 && (
               <>
                   <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{getWeekString(weekOffset)} - Öğretmen El Programları</h2>
                   <TeacherSchedulesPrintView 
                       teachers={pdfTeachers}
                       assignments={currentSchedule.assignments}
                       slots={appSlots}
                       zones={appZones}
                       weekString={getWeekString(weekOffset)}
                       searchTerm=""
                       setSearchTerm={() => {}}
                       hideControls={true}
                   />
               </>
           )}
        </div>
      </div>

    </div>
  );
}

export default App;
