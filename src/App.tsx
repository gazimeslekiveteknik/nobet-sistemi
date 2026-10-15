import React, { useState, useEffect } from 'react';
import { FirebaseService } from './firebase/service';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { useRef } from 'react';
import { generateSchedule, rotateSchedule } from './algorithm/scheduler';
import { assignmentProblem, validateSchedule } from './algorithm/validation';
import { replaceDailyLeave } from './algorithm/leave';
import type { Teacher, Lesson, Slot, Zone, Assignment, DayOfWeek} from './types';
import { Calendar, ShieldAlert, Settings, BarChart3, ChevronLeft, ChevronRight, Printer, X, Plus } from 'lucide-react';
interface Schedule {
  assignments: Assignment[];
  warnings: string[];
}


type Absences = Record<number, string[]>;
const presentLessons = (lessons: Lesson[], absences: Absences = {}) => lessons.filter(l => !absences[l.day]?.includes(l.teacherId));
interface PublishedWeek { telegramPdf?: { fileId: string; botId: string; caption: string }; absences?: Absences; assignments: Assignment[]; teachers: Teacher[]; lessons: Lesson[]; slots?: Slot[]; zones?: Zone[]; }

interface Snapshot {
  absences: Absences;
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
  const [calendarNow] = useState(() => Date.now());
  const [currentView, setCurrentViewInternal] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print' | 'print-teachers'>('plan');
  const [settingsTab, setSettingsTab] = useState<'config' | 'teachers' | 'import'>('import');
  const [printTab, setPrintTab] = useState<'master' | 'personal' | 'timetable'>('master');
  const [schedulesSearch, setSchedulesSearch] = useState('');
  const [timetablesSearch, setTimetablesSearch] = useState('');

  const setCurrentView = (view: typeof currentView) => {
    if (view !== 'print') { setSchedulesSearch(''); setTimetablesSearch(''); }
    setCurrentViewInternal(view);
  };

  // Load the 35 teachers and 934 lessons parsed from the PDF

    const generatePdfBlob = async (activeTeachers: Teacher[], progressLabel?: string) => {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      let addedPage = false;
      const filteredTeachers = activeTeachers.filter(t => !t.isExcluded);
      for (let i = 0; i < filteredTeachers.length; i++) {
         const teacher = filteredTeachers[i];
         const prefix = progressLabel ? `${progressLabel}: ` : '';
         setPublishingProgress(`${prefix}PDF oluşturuluyor... (${i+1}/${filteredTeachers.length} - ${teacher.name})`);
         await new Promise(r => setTimeout(r, 15)); // let UI update
         const el = hiddenPrintRef.current?.querySelector<HTMLElement>(`[id="teacher-print-${teacher.id}"]`);

         if (el) {
            const imgData = await toJpeg(el, {
               cacheBust: false,
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

      if (!addedPage) throw new Error('PDF için öğretmen çizelgesi oluşturulamadı.');
      return pdf.output('blob');
   };

   const sendTelegramNotification = async (weekStr: string, activeTeachers: Teacher[], msg: string) => {
    if (!telegramToken || !telegramChatId) {
       alert("Telegram ayarları eksik!");
       return false;
    }
    try {
      setPdfContext({ week: weekStr, assignments: currentSchedule.assignments, slots: viewSlots, zones: viewZones });
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
    const curr = new Date(calendarNow);
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
  const weekKey = (offset = 0) => {
    const date = new Date(calendarNow);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const [baseWeekStart, setBaseWeekStart] = useState(() => weekKey());
  const [draftWeeks, setDraftWeeks] = useState<Record<string, Schedule>>({});
  const [weekAbsences, setWeekAbsences] = useState<Record<string, Absences>>({});

  const [history, setHistory] = useState<Record<number, Snapshot[]>>({});
  const [publishedWeeks, setPublishedWeeks] = useState<Record<string, PublishedWeek>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const hiddenPrintRef = useRef<HTMLDivElement>(null);
  const [pdfTeachers, setPdfTeachers] = useState<Teacher[]>([]);
  const [telegramMessage, setTelegramMessage] = useState("Yeni haftalık nöbet programımız yayınlanmıştır. Güncel Öğretmen El Programı (PDF) ektedir.\n\nİyi çalışmalar dileriz.");
  const [sendTelegramPdf, setSendTelegramPdf] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState<string | null>(null);

  const saveHistory = () => {
    const currentHistSched = currentSchedule;
    setHistory(prev => {
      const weekHist = prev[weekOffset] || [];
      return {
        ...prev,
        [weekOffset]: [...weekHist, { schedule: currentHistSched, teachers: JSON.parse(JSON.stringify(teachers)), absences: weekAbsences[weekKey(weekOffset)] || {} }].slice(-20)
      };
    });
  };

  const handleUndo = () => {
      if (isLocked) return;
      const weekHist = history[weekOffset] || [];
      if (weekHist.length === 0) return;

      const lastSnapshot = weekHist[weekHist.length - 1];
      const newHist = weekHist.slice(0, -1);

      setTeachers(lastSnapshot.teachers);
      setWeekAbsences(prev => ({ ...prev, [weekKey(weekOffset)]: lastSnapshot.absences }));
      setDraftWeeks(weeks => ({ ...weeks, [weekKey(weekOffset)]: lastSnapshot.schedule }));
      if (weekOffset === 0) setSchedule(lastSnapshot.schedule);

      setHistory(prev => ({ ...prev, [weekOffset]: newHist }));
  };

  const [isInitializing, setIsInitializing] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const loadedState = useRef('');
  const [pdfContext, setPdfContext] = useState<{week: string; assignments: Assignment[]; slots: Slot[]; zones: Zone[]} | null>(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramArchiveChatId, setTelegramArchiveChatId] = useState('1392839951');
  const [sendImmediately, setSendImmediately] = useState(false);
  const [adminPassword, setAdminPassword] = useState('1234');

  useEffect(() => {
    let isMounted = true;

    FirebaseService.loadSettings().then(settings => {
      if (!isMounted) return;

      if (settings) {
        if (settings.publishedWeeks) setPublishedWeeks(settings.publishedWeeks);
        if (localStorage.getItem('nobet_settings_pending') === 'true') setSaveMessage('Bu cihazda sunucuya aktarılmamış değişiklikler var.');
        if (settings.weekAbsences) setWeekAbsences(settings.weekAbsences);
        if (settings.draftWeeks) setDraftWeeks(settings.draftWeeks);
        if (settings.baseWeekStart) setBaseWeekStart(settings.baseWeekStart);
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
        if (settings.teachers) setTeachers(settings.teachers);
        if (settings.lessons) setLessons(settings.lessons);
        if (settings.telegramToken) setTelegramToken(settings.telegramToken);
        if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
        if (settings.telegramArchiveChatId) setTelegramArchiveChatId(settings.telegramArchiveChatId);
        if (settings.adminPassword) setAdminPassword(settings.adminPassword);

        if (settings.lastScheduleAssignments) {
           setSchedule(prev => ({ ...prev, assignments: settings.lastScheduleAssignments }));
        }
      }
      setIsInitializing(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error(err);
      setLoadError("Kayıtlı veriler yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenileyin. Verilerinizi korumak için otomatik kayıt durduruldu.");
      setIsInitializing(false);
    });

    return () => { isMounted = false; };
  }, []);


  const handleSaveSettings = async () => {
    const newSlots: Slot[] = [];
    const days = [1, 2, 3, 4, 5];
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

    if (!appPeriods.length || appZones.some(z => z.minStaff < 0 || z.idealStaff < z.minStaff || z.riskMultiplier <= 0)) {
      alert('Ders sayısını ve bölge nöbetçi sayılarını kontrol edin. İdeal sayı asgari sayıdan az olamaz.'); return;
    }
    for (const day of dayNames) {
      let previousEnd = '';
      for (const period of appPeriods) {
        const times = appTimetable[`${period.id}_${day}`];
        if (!times?.start || !times?.end || times.start >= times.end || (previousEnd && times.start < previousEnd)) {
          alert(`${day}, ${period.id}. ders: saatler eksik, ters veya çakışıyor.`); return;
        }
        previousEnd = times.end;
      }
    }
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
    const newSchedule = generateSchedule(teachers, effectiveLessons, newSlots, appZones, currentSchedule?.assignments || []);
    updateCurrentSchedule(newSchedule);

    try {
    const saved = await FirebaseService.saveSettings({
      appZones,
      appPeriods,
      appTimetable,
      appSlots: newSlots,
      teachers,
      lessons,
      telegramToken, telegramChatId, telegramArchiveChatId, adminPassword
    });

    alert(saved.synced ? "Ayarlar kaydedildi ve program güncellendi." : "Program güncellendi; ayarlar yalnızca bu cihazda kaydedildi. Sunucu bağlantısını kontrol edin.");
    setCurrentView('plan');
    } catch (error) { alert(error instanceof Error ? error.message : String(error)); }
  };


  const targetWeekKey = weekKey(weekOffset);
  const publishedWeek = publishedWeeks[targetWeekKey] || publishedWeeks[getWeekString(weekOffset)];
  const activeAbsences = weekAbsences[targetWeekKey] || publishedWeek?.absences || {};
  const effectiveLessons = presentLessons(lessons, activeAbsences);
  const rotationOffset = Math.round((Date.parse(targetWeekKey) - Date.parse(baseWeekStart)) / 604800000);
  const computedSchedule = {
    assignments: publishedWeek?.assignments || rotateSchedule(schedule.assignments, rotationOffset, appSlots, appZones, teachers, effectiveLessons),
    warnings: [] as string[],
  };
  const currentSchedule = draftWeeks[targetWeekKey] || computedSchedule;
  const displayedPublished = draftWeeks[targetWeekKey] ? undefined : publishedWeek;
  const viewTeachers = displayedPublished?.teachers || teachers;
  const viewLessons = displayedPublished?.lessons || lessons;
  const viewSlots = displayedPublished?.slots || appSlots;
  const viewZones = displayedPublished?.zones || appZones;
  const currentWarnings = validateSchedule(currentSchedule.assignments, viewTeachers, presentLessons(viewLessons, activeAbsences), viewSlots, viewZones);
  const updateCurrentSchedule = (newSched: typeof schedule | ((prev: typeof schedule) => typeof schedule)) => {
    const resolved = typeof newSched === 'function' ? newSched(currentSchedule) : newSched;
    setDraftWeeks(prev => ({ ...prev, [targetWeekKey]: resolved }));
    if (weekOffset === 0) { setSchedule(resolved); setBaseWeekStart(weekKey()); }
  };

  const [lockOverrides, setLockOverrides] = useState<Record<string, boolean>>({});
  const isLocked = lockOverrides[targetWeekKey] ?? Boolean(publishedWeek);
  const setIsLocked = (locked: boolean) => setLockOverrides(prev => ({ ...prev, [targetWeekKey]: locked }));
  const [addTeacherModal, setAddTeacherModal] = useState<{slotId: string, zoneId: string} | null>(null);
  const [leaveModal, setLeaveModal] = useState<{assignment: Assignment, teacher: Teacher} | null>(null);
  const [telegramSpecificModal, setTelegramSpecificModal] = useState<{title: string, message: string, affectedTeachers: Teacher[]} | null>(null);
  const [longLeaveDate, setLongLeaveDate] = useState<string>('');

  const settingsPayload = { appZones, appPeriods, appTimetable, appSlots, teachers, lessons,
    lastScheduleAssignments: schedule.assignments, publishedWeeks, draftWeeks, weekAbsences, baseWeekStart,
    telegramToken, telegramChatId, telegramArchiveChatId, adminPassword };
  const settingsJSON = JSON.stringify(settingsPayload);
  useEffect(() => {
    if (isInitializing || loadError) return;
    // Loading a page must never write defaults or an empty publication archive.
    if (!loadedState.current) { loadedState.current = settingsJSON; return; }
    if (loadedState.current === settingsJSON) return;
    const timeout = setTimeout(() => {
      setSaveMessage('Kaydediliyor…');
      FirebaseService.saveSettings(JSON.parse(settingsJSON)).then(result => {
        loadedState.current = settingsJSON;
        setSaveMessage(result.synced ? 'Değişiklikler kaydedildi.' : 'Yalnızca bu cihazda kaydedildi; sunucuya aktarılmadı.');
      }).catch(error => setSaveMessage(String(error)));
    }, 1500);
    return () => clearTimeout(timeout);
  }, [settingsJSON, isInitializing, loadError]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (loadedState.current && loadedState.current !== settingsJSON) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [settingsJSON]);

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
    setTimeout(() => setCurrentView('plan'), 1500); // Switch to plan view after showing success
  };

  const handleToggleExclude = (teacherId: string, isExcluded: boolean) => {
    saveHistory();
    const updated = teachers.map(t => t.id === teacherId ? { ...t, isExcluded } : t);
    setTeachers(updated);
    updateCurrentSchedule(generateSchedule(updated, effectiveLessons, appSlots, appZones, currentSchedule.assignments));
  };

  const handleTeacherClick = (assignment: Assignment) => {
    const t = teachers.find(t => t.id === assignment.teacherId);
    if (!t) return;
    setLeaveModal({ assignment, teacher: t });
  };

  const processOneDayLeave = (t: Teacher) => {
    saveHistory();
    setWeekAbsences(prev => ({ ...prev, [targetWeekKey]: { ...activeAbsences, [selectedDay]: [...new Set([...(activeAbsences[selectedDay] || []), t.id])] } }));
    const result = replaceDailyLeave(t.id, selectedDay, currentSchedule.assignments, teachers, effectiveLessons, appSlots, appZones);
    updateCurrentSchedule({ assignments: result.assignments, warnings: [] });
    setTelegramSpecificModal({
      title: 'Günlük Rapor Değişikliği',
      message: `${t.name} için ${getWeekString(weekOffset)}, ${selectedDay}. gün nöbet değişiklikleri:\n\n${result.logs.join('\n')}`,
      affectedTeachers: teachers.filter(x => result.affected.has(x.id)),
    });
  };


  const processLongLeave = (t: Teacher, untilDate: string) => {
    if (!untilDate) {
      alert("Lütfen iznin bitiş (dönüş) tarihini seçiniz!");
      return;
    }
    saveHistory();
    const tempTeachers = teachers.map(x => x.id === t.id ? { ...x, isExcluded: true, excludedUntil: untilDate } : x);
    setTeachers(tempTeachers);

    const newSched = generateSchedule(tempTeachers, effectiveLessons, appSlots, appZones, currentSchedule?.assignments || []);
    updateCurrentSchedule(newSched);

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

    const problem = assignmentProblem({ ...assignment, slotId: targetSlotId, zoneId: targetZoneId }, currentSchedule.assignments, teachers, effectiveLessons, appSlots, appZones);
    if (problem) { alert(problem); return; }

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

  const publishPlan = async (startOffset: number) => {
    setIsPublishing(true);
    try {
      if (sendTelegramPdf && (!telegramToken || !telegramChatId || !telegramArchiveChatId || telegramArchiveChatId.trim() === telegramChatId.trim())) {
        throw new Error('Bot Token, Öğretmenler Grubu ve bunlardan farklı Özel Arşiv Sohbeti ayarlarını tamamlayın.');
      }

      const getWeekDate = (off: number) => {
        const d = new Date(calendarNow);
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7);
        return d;
      };

      const startWeekDate = getWeekDate(startOffset);
      const targetYear = startWeekDate.getMonth() <= 5 ? startWeekDate.getFullYear() : startWeekDate.getFullYear() + 1;
      const juneEnd = new Date(targetYear, 5, 27, 23, 59, 59);

      const targetOffsets: number[] = [];
      let curOff = startOffset;
      while (getWeekDate(curOff) <= juneEnd) {
        targetOffsets.push(curOff);
        curOff++;
        if (targetOffsets.length >= 45) break;
      }
      if (targetOffsets.length === 0) targetOffsets.push(startOffset);

      const totalWeeks = targetOffsets.length;
      let nextPublished = { ...publishedWeeks };

      for (let idx = 0; idx < totalWeeks; idx++) {
        const off = targetOffsets[idx];
        const key = weekKey(off);
        const week = getWeekString(off);
        const progressHeader = `Hafta ${idx + 1}/${totalWeeks} (${week})`;
        setPublishingProgress(`${progressHeader}: Plan hesaplanıyor…`);

        const existing = publishedWeeks[key] || publishedWeeks[week];
        const targetAssignments = off === weekOffset
          ? currentSchedule.assignments
          : draftWeeks[key]?.assignments || existing?.assignments || rotateSchedule(
              schedule.assignments,
              Math.round((Date.parse(key) - Date.parse(baseWeekStart)) / 604800000),
              appSlots,
              appZones,
              teachers,
              presentLessons(lessons, weekAbsences[key])
            );

        const snapshot: PublishedWeek = JSON.parse(JSON.stringify({
          absences: weekAbsences[key] || existing?.absences || {},
          assignments: targetAssignments,
          teachers: draftWeeks[key] ? teachers : existing?.teachers || teachers,
          lessons: draftWeeks[key] ? lessons : existing?.lessons || lessons,
          slots: draftWeeks[key] ? appSlots : existing?.slots || appSlots,
          zones: draftWeeks[key] ? appZones : existing?.zones || appZones
        }));

        const problems = validateSchedule(snapshot.assignments, snapshot.teachers, presentLessons(snapshot.lessons, snapshot.absences), snapshot.slots!, snapshot.zones!);
        if (problems.length && off === startOffset) {
          throw new Error(`${week} için uyarıları giderin:\n` + problems.join('\n'));
        }

        if (sendTelegramPdf) {
          setPdfContext({ week, assignments: snapshot.assignments, slots: snapshot.slots!, zones: snapshot.zones! });
          setPdfTeachers(snapshot.teachers);
          await new Promise(r => setTimeout(r, 60));
          if (document.fonts) await document.fonts.ready;

          const pdfBlob = await generatePdfBlob(snapshot.teachers, progressHeader);
          setPublishingProgress(`${progressHeader}: Arşive yükleniyor…`);

          let uploadedFileId: string | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const form = new FormData();
            form.append('chat_id', telegramArchiveChatId);
            form.append('document', new File([pdfBlob], `${week.replace(/ /g, '_')}_El_Programi.pdf`, { type: 'application/pdf' }));
            form.append('caption', `📦 [Arşiv] ${week} Öğretmen El Programı`);

            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, { method: 'POST', body: form });
            const body = await res.json();

            if (res.ok && body.ok && body.result?.document?.file_id) {
              uploadedFileId = body.result.document.file_id;
              break;
            }

            if (res.status === 429 || body?.parameters?.retry_after) {
              const waitSec = (body?.parameters?.retry_after || 3) + 1;
              setPublishingProgress(`Telegram hız sınırı, ${waitSec} sn bekleniyor…`);
              await new Promise(r => setTimeout(r, waitSec * 1000));
              continue;
            }

            throw new Error(`${week} arşive yüklenemedi: ` + (body.description || res.status));
          }

          if (!uploadedFileId) throw new Error(`${week} için Telegram dosya kimliği alınamadı.`);

          snapshot.telegramPdf = {
            fileId: uploadedFileId,
            botId: telegramToken.split(':')[0],
            caption: telegramMessage
          };

          if (idx === 0 && sendImmediately) {
            setPublishingProgress(`${week}: Gruba gönderiliyor…`);
            await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: telegramChatId, document: uploadedFileId, caption: telegramMessage }),
            });
          }

          // Throttle to respect Telegram rates
          await new Promise(r => setTimeout(r, 1000));
        }

        nextPublished[key] = snapshot;
      }

      setPublishingProgress('Veritabanına kaydediliyor…');
      const saved = await FirebaseService.saveSettings({ ...settingsPayload, publishedWeeks: nextPublished });
      if (!saved.synced) throw new Error('Haftalar oluşturuldu ancak sunucu kaydı tamamlanamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');

      setPublishedWeeks(nextPublished);
      setDraftWeeks(prev => {
        const next = { ...prev };
        targetOffsets.forEach(off => delete next[weekKey(off)]);
        return next;
      });

      if (startOffset === weekOffset) setIsLocked(true);

      alert(`Tüm sezon başarıyla yayınlandı! Toplam ${totalWeeks} haftalık program (Haziran sonuna kadar) rotasyonlu olarak hazırlandı ve arşive kaydedildi.\n\nHer Pazar akşamı saat 18:00'de ilgili haftanın güncel PDF'i otomatik olarak gruba gönderilecektir.`);
      setPublishModalOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setPdfTeachers([]);
      setPdfContext(null);
      setIsPublishing(false);
      setPublishingProgress(null);
    }
  };

  // Only show slots for the selected day in the table
  const currentDaySlots = viewSlots.filter(s => s.day === selectedDay);

  if (loadError) return <div className="p-8 text-red-700">{loadError}<button className="block mt-4 underline" onClick={() => window.location.reload()}>Yeniden dene</button></div>;
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
          {saveMessage && <p role="status" className="text-sm text-indigo-700 mb-3 print:hidden">{saveMessage}<button className="ml-3 underline" onClick={async () => {
            try { const result = await FirebaseService.saveSettings(settingsPayload); setSaveMessage(result.synced ? 'Değişiklikler sunucuya kaydedildi.' : 'Yalnızca bu cihazda kaydedildi.'); }
            catch (error) { setSaveMessage(String(error)); }
          }}>Kaydı yeniden dene</button></p>}


          {currentView === 'reports' && (
            <Analytics teachers={teachers} assignments={currentSchedule.assignments} zones={viewZones} slots={viewSlots} />
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
                  teachers={viewTeachers}
                  zones={viewZones}
                  slots={viewSlots}
                  weekString={getWeekString(weekOffset)}
                />
              )}
              {printTab === 'personal' && (
                <TeacherSchedulesPrintView
                  teachers={viewTeachers}
                  assignments={currentSchedule.assignments}
                  slots={viewSlots}
                  zones={viewZones}
                  weekString={getWeekString(weekOffset)}
                  searchTerm={schedulesSearch}
                  setSearchTerm={setSchedulesSearch}
                />
              )}
              {printTab === 'timetable' && (
                <TeacherTimetablesPrintView
                  teachers={viewTeachers}
                  lessons={viewLessons}
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
                  telegramArchiveChatId={telegramArchiveChatId} setTelegramArchiveChatId={setTelegramArchiveChatId}
                  adminPassword={adminPassword} setAdminPassword={setAdminPassword}
                  onSave={handleSaveSettings}
                />
              )}

              {settingsTab === 'teachers' && (
                <TeacherList
                  teachers={teachers}
                  schedule={currentSchedule}
                  slots={viewSlots}
                  zones={viewZones}
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
                    disabled={isLocked || !(history[weekOffset] && history[weekOffset].length > 0)}
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
                       const newSched = generateSchedule(teachers, effectiveLessons, appSlots, appZones, currentSchedule?.assignments || []);
                       updateCurrentSchedule(newSched);
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

          {currentWarnings.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-amber-800 mb-1">Algoritma Uyarıları</h3>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    {currentWarnings.map((w, i) => <li key={i}>{w}</li>)}
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
                  {viewZones.map(z => (
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
                    {viewZones.map(zone => {
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
                              const t = viewTeachers.find(t => t.id === a.teacherId);
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
                {teachers.filter(t => !assignmentProblem({ id: 'new-candidate', teacherId: t.id, slotId: addTeacherModal.slotId, zoneId: addTeacherModal.zoneId, isManual: true }, currentSchedule.assignments, teachers, effectiveLessons, appSlots, appZones)).map(t => {
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
              Program kaydedilir. PDF özel arşivde hazırlanır ve ilgili haftadan önceki pazar Türkiye saatiyle 18.00’de gruba gönderilir. Geçmiş veya başlamış haftalar için anlık gönderimi seçin.
            </p>

            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTelegramPdf}
                  onChange={e => setSendTelegramPdf(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>PDF’i sakla ve pazar 18.00 gönderimini hazırla</span>
              </label>

              {sendTelegramPdf && <label className="block text-sm mb-3"><input type="checkbox" checked={sendImmediately} onChange={e => setSendImmediately(e.target.checked)} /> Yayınlarken de gruba gönder (B seçeneği)</label>}
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
                onClick={() => publishPlan(weekOffset)}
                className="w-full text-left p-4 rounded-lg border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-indigo-900">Hemen Şimdi (Mevcut Haftayı Ez)</div>
                <div className="text-sm text-indigo-700 mt-1">
                  {isPublishing && publishingProgress ? publishingProgress : "Acil durum değişiklikleri için uygundur."}
                </div>
              </button>

              <button
                disabled={isPublishing}
                onClick={() => publishPlan(weekOffset + 1)}
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
                   <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{pdfContext?.week || getWeekString(weekOffset)} - Öğretmen El Programları</h2>
                   <TeacherSchedulesPrintView
                       teachers={pdfTeachers}
                       assignments={pdfContext?.assignments || currentSchedule.assignments}
                       slots={pdfContext?.slots || viewSlots}
                       zones={pdfContext?.zones || viewZones}
                       weekString={pdfContext?.week || getWeekString(weekOffset)}
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
