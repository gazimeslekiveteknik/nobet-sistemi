const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldEffect = \`  useEffect(() => {
    FirebaseService.loadSettings().then(settings => {
      if (settings) {
        if (settings.appZones) setAppZones(settings.appZones);
        if (settings.appPeriods) setAppPeriods(settings.appPeriods);
        if (settings.appTimetable) setAppTimetable(settings.appTimetable);
        if (settings.appSlots) setAppSlots(settings.appSlots);
      }
      setIsInitializing(false);
    });
  }, []);\`;

const newEffect = \`  useEffect(() => {
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
      }
      setIsInitializing(false);
    }).catch(err => {
      if (!isMounted) return;
      clearTimeout(fallbackTimeout);
      console.error(err);
      setIsInitializing(false);
    });
    
    return () => { isMounted = false; };
  }, []);\`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/App.tsx', code);
