const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const stateOld = `  const [teachers, setTeachers] = useState<Teacher[]>(bilsaData.teachers as Teacher[]);
  const [lessons, setLessons] = useState<Lesson[]>(bilsaData.lessons as Lesson[]);
  const [schedule, setSchedule] = useState(() => generateSchedule(bilsaData.teachers as Teacher[], bilsaData.lessons as Lesson[], mockSlots, mockZones));
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [weekSchedules, setWeekSchedules] = useState<Record<number, typeof schedule>>({ 0: schedule });`;

const stateNew = `  const [teachers, setTeachers] = useState<Teacher[]>(bilsaData.teachers as Teacher[]);
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

  const handleSaveSettings = () => {
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
       const firstStart = appTimetable[\`1_\${dayName}\`]?.start;
       if (firstStart) {
          const [h,m] = firstStart.split(':').map(Number);
          let totalMins = h * 60 + m - 20; // 20 mins before
          const openStart = \`\${Math.floor(totalMins / 60).toString().padStart(2, '0')}:\${(totalMins % 60).toString().padStart(2, '0')}\`;
          
          newSlots.push({
             id: \`s_open_d\${dayNum}\`,
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
          const currEnd = appTimetable[\`\${curr.id}_\${dayName}\`]?.end;
          const nextStart = appTimetable[\`\${next.id}_\${dayName}\`]?.start;
          
          if (currEnd && nextStart && currEnd !== nextStart) {
             newSlots.push({
               id: \`s_break_\${curr.id}_d\${dayNum}\`,
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
       const lastEnd = appTimetable[\`\${lastPeriod.id}_\${dayName}\`]?.end;
       if (lastEnd) {
          const [h,m] = lastEnd.split(':').map(Number);
          let totalMins = h * 60 + m + 20; // 20 mins after
          const closeEnd = \`\${Math.floor(totalMins / 60).toString().padStart(2, '0')}:\${(totalMins % 60).toString().padStart(2, '0')}\`;
          
          newSlots.push({
             id: \`s_close_d\${dayNum}\`,
             day: dayNum as any,
             type: 'CLOSING',
             startTime: lastEnd,
             endTime: closeEnd
          });
       }
    });

    setAppSlots(newSlots);
    
    // Regenerate schedule with new slots and zones
    const newSchedule = generateSchedule(teachers, lessons, newSlots, appZones, currentSchedule?.assignments || []);
    updateCurrentSchedule(newSchedule);
    
    alert("Ayarlar başarıyla kaydedildi ve Nöbet Programı yeni saatlere göre yeniden oluşturuldu!");
    setCurrentView('plan');
  };`;

code = code.replace(stateOld, stateNew);

code = code.replace(/mockSlots/g, 'appSlots');
code = code.replace(/mockZones/g, 'appZones');
code = code.replace(/appSlots, appZones, currentSchedule\.assignments/g, 'appSlots, appZones, currentSchedule?.assignments || []');
// Ensure the initial useState still uses mockSlots/mockZones for bootstrap before the first render
code = code.replace('const [schedule, setSchedule] = useState(() => generateSchedule(bilsaData.teachers as Teacher[], bilsaData.lessons as Lesson[], appSlots, appZones));', 'const [schedule, setSchedule] = useState(() => generateSchedule(bilsaData.teachers as Teacher[], bilsaData.lessons as Lesson[], mockSlots, mockZones));');
code = code.replace('const [appZones, setAppZones] = useState<Zone[]>(appZones);', 'const [appZones, setAppZones] = useState<Zone[]>(mockZones);');
code = code.replace('const [appSlots, setAppSlots] = useState<Slot[]>(appSlots);', 'const [appSlots, setAppSlots] = useState<Slot[]>(mockSlots);');

const settingsOld = `<SettingsView />`;
const settingsNew = `<SettingsView 
              appZones={appZones} setAppZones={setAppZones}
              appPeriods={appPeriods} setAppPeriods={setAppPeriods}
              appTimetable={appTimetable} setAppTimetable={setAppTimetable}
              onSave={handleSaveSettings}
            />`;
code = code.replace(settingsOld, settingsNew);

fs.writeFileSync('src/App.tsx', code);
