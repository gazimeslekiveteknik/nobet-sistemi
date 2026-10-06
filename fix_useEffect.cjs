const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const effectBlock = \`  // Otomatik yedekleme (Herhangi bir ayar, öğretmen veya liste değiştiğinde)
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

code = code.replace(effectBlock, '');

const injectTarget = \`  const [isLocked, setIsLocked] = useState<boolean>(false);\`;

code = code.replace(injectTarget, injectTarget + '\\n\\n' + effectBlock);

fs.writeFileSync('src/App.tsx', code);
