const fs = require('fs');

let code = fs.readFileSync('src/firebase/service.ts', 'utf8');

const newMethods = \`
  saveSettings: async (settings: any) => {
    try {
      const ref = doc(db, 'settings', 'global');
      await setDoc(ref, settings);
      return true;
    } catch (error) {
      console.error("Error saving settings: ", error);
      throw error;
    }
  },

  loadSettings: async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error) {
      console.error("Error loading settings: ", error);
      return null;
    }
  },
\`;

code = code.replace(
  'saveWeeklyPlan: async',
  newMethods + '\n  saveWeeklyPlan: async'
);

fs.writeFileSync('src/firebase/service.ts', code);
