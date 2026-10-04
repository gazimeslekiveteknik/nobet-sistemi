const fs = require('fs');

let code = fs.readFileSync('src/firebase/service.ts', 'utf8');

const newSettingsMethods = \`  saveSettings: async (settings: any) => {
    // ALWAYS save to localStorage first for instant offline persistence
    try {
       localStorage.setItem('nobet_settings', JSON.stringify(settings));
    } catch(e) {}
    
    // Attempt Firebase
    try {
      const ref = doc(db, 'settings', 'global');
      await setDoc(ref, settings);
      return true;
    } catch (error) {
      console.warn("Firebase'e kaydedilemedi, yerel hafıza (localStorage) kullanılacak.", error);
      return true; // Pretend success because we saved locally
    }
  },

  loadSettings: async () => {
    // Attempt Firebase first
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const data = snap.data();
        localStorage.setItem('nobet_settings', JSON.stringify(data)); // cache it
        return data;
      }
    } catch (error) {
      console.warn("Firebase'den okunamadı, yerel hafızaya bakılıyor.", error);
    }
    
    // Fallback to LocalStorage
    try {
       const localData = localStorage.getItem('nobet_settings');
       if (localData) return JSON.parse(localData);
    } catch(e) {}
    
    return null;
  },\`;

code = code.replace(/saveSettings: async \([\s\S]*?loadSettings: async \(\) => {[\s\S]*?return null;\n    }\n  },/, newSettingsMethods);

fs.writeFileSync('src/firebase/service.ts', code);
