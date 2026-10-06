const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Modify the load block
const loadTarget = \`      if (settings) {
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
        if (settings.teachers) setTeachers(settings.teachers);
        if (settings.lessons) setLessons(settings.lessons);
      }
      setIsInitializing(false);\`;

const loadReplacement = \`      if (settings) {
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
      setIsInitializing(false);\`;

code = code.replace(loadTarget, loadReplacement);

// 2. Modify the save hook
const saveHookTarget = \`  // Otomatik yedekleme (Herhangi bir ayar, öğretmen veya liste değiştiğinde)
  useEffect(() => {
    if (isInitializing) return;
    const timeout = setTimeout(() => {
      FirebaseService.saveSettings({
        appZones, appPeriods, appTimetable, appSlots, teachers, lessons
      }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [appZones, appPeriods, appTimetable, appSlots, teachers, lessons, isInitializing]);\`;

const saveHookReplacement = \`  // Otomatik yedekleme (Herhangi bir ayar, öğretmen veya liste değiştiğinde)
  useEffect(() => {
    if (isInitializing) return;
    const timeout = setTimeout(() => {
      FirebaseService.saveSettings({
        appZones, appPeriods, appTimetable, appSlots, teachers, lessons,
        lastScheduleAssignments: currentSchedule.assignments
      }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [appZones, appPeriods, appTimetable, appSlots, teachers, lessons, currentSchedule.assignments, isInitializing]);\`;

code = code.replace(saveHookTarget, saveHookReplacement);

fs.writeFileSync('src/App.tsx', code);
