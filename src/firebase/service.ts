import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import type { Teacher, Lesson, DutyPlan } from '../types';

export interface SaveResult { synced: boolean }
const readLocal = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};
const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};
const deadline = <T,>(operation: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Sunucu yanıt vermedi.')), 8000);
  operation.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
let saveQueue: Promise<unknown> = Promise.resolve();

export const FirebaseService = {
  saveSettings: (settings: Record<string, unknown>): Promise<SaveResult> => {
    const save = async () => {
      const cached = { ...(readLocal('nobet_settings') || {}), ...settings };
      const pending = readLocal('nobet_settings_pending');
      const payload = pending ? cached : settings;
      const localSaved = writeLocal('nobet_settings', cached);
      if (localSaved) writeLocal('nobet_settings_pending', true);
      try {
        // Replace supplied top-level fields only; never erase unrelated settings.
        await deadline(setDoc(doc(db, 'settings', 'global'), payload, { mergeFields: Object.keys(payload) }));
        writeLocal('nobet_settings_pending', false);
        return { synced: true };
      } catch (error) {
        if (!localSaved) throw new Error('Kayıt başarısız: sunucuya ve tarayıcı hafızasına yazılamadı.');
        console.warn('Değişiklikler yalnızca bu cihazda saklandı.', error);
        return { synced: false };
      }
    };
    const next = saveQueue.then(save, save);
    saveQueue = next.catch(() => undefined);
    return next;
  },
  loadSettings: async () => {
    const local = readLocal('nobet_settings');
    // Unsynced local edits must not be replaced by an older server snapshot.
    if (local && readLocal('nobet_settings_pending')) return local;
    try {
      const snap = await deadline(getDoc(doc(db, 'settings', 'global')));
      if (snap.exists()) {
        const data = snap.data();
        writeLocal('nobet_settings', data);
        return data;
      }
      return local;
    } catch (error) {
      if (local) return local;
      throw error;
    }
  },
  saveWeeklyPlan: async (weekId: string, teachers: Teacher[], lessons: Lesson[], plan: DutyPlan): Promise<SaveResult> => {
    const localSaved = writeLocal(`nobet_plan_${weekId}`, { plan, teachers, lessons });
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'dutyPlans', weekId), plan);
      batch.set(doc(db, `dutyPlans/${weekId}/data/teachers`), { list: teachers });
      batch.set(doc(db, `dutyPlans/${weekId}/data/lessons`), { list: lessons });
      await deadline(batch.commit());
      return { synced: true };
    } catch {
      if (!localSaved) throw new Error('Haftalık plan kaydedilemedi.');
      return { synced: false };
    }
  },
  loadWeeklyPlan: async (weekId: string) => {
    try {
      const [plan, teachers, lessons] = await deadline(Promise.all([
        getDoc(doc(db, 'dutyPlans', weekId)), getDoc(doc(db, `dutyPlans/${weekId}/data/teachers`)), getDoc(doc(db, `dutyPlans/${weekId}/data/lessons`)),
      ]));
      if (plan.exists() && teachers.exists() && lessons.exists()) return { plan: plan.data() as DutyPlan, teachers: teachers.data().list as Teacher[], lessons: lessons.data().list as Lesson[] };
    } catch { /* Use the local copy when the server is unavailable. */ }
    return readLocal(`nobet_plan_${weekId}`);
  },
};
