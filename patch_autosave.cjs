const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Modify loadSettings block
const loadTarget = \`      if (settings) {
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
      }
      setIsInitializing(false);\`;

const loadReplacement = \`      if (settings) {
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
        if (settings.teachers) setTeachers(settings.teachers);
        if (settings.lessons) setLessons(settings.lessons);
      }
      setIsInitializing(false);\`;

code = code.replace(loadTarget, loadReplacement);

// 2. Add debounced useEffect for auto-saving settings
const autoSaveHook = \`
  // Auto-save settings when they change
  useEffect(() => {
    if (isInitializing) return;
    
    const timeout = setTimeout(() => {
      FirebaseService.saveSettings({
        appZones, appPeriods, appTimetable, appSlots, teachers, lessons
      });
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [appZones, appPeriods, appTimetable, appSlots, teachers, lessons, isInitializing]);
\`;

// Inject after setIsInitializing(false);
code = code.replace("setIsInitializing(false);\\n    });\\n  }, []);", "setIsInitializing(false);\\n    });\\n  }, []);\\n" + autoSaveHook);

// 3. Update handleSaveSettings manual save (just to be safe)
const manualSaveTarget = \`    await FirebaseService.saveSettings({
      appZones,
      appPeriods,
      appTimetable,
      appSlots: newSlots
    });\`;

const manualSaveReplacement = \`    await FirebaseService.saveSettings({
      appZones,
      appPeriods,
      appTimetable,
      appSlots: newSlots,
      teachers,
      lessons
    });\`;

code = code.replace(manualSaveTarget, manualSaveReplacement);

fs.writeFileSync('src/App.tsx', code);
