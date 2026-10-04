import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { Teacher, Lesson, DutyPlan } from '../types';

export const FirebaseService = {
  saveSettings: async (settings: any) => {
    // 1. Her zaman tarayıcı hafızasına (Offline) kaydet
    try {
       localStorage.setItem('nobet_settings', JSON.stringify(settings));
    } catch(e) {}
    
    // 2. Firebase'e kaydetmeyi dene
    try {
      const ref = doc(db, 'settings', 'global');
      await setDoc(ref, settings);
      return true;
    } catch (error) {
      console.warn("Firebase hatası, yerel hafıza devrede.", error);
      return true; // We saved locally, so it's a success
    }
  },

  loadSettings: async () => {
    // 1. Önce Firebase'den dene
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const data = snap.data();
        localStorage.setItem('nobet_settings', JSON.stringify(data)); // Senkronize et
        return data;
      }
    } catch (error) {
      console.warn("Firebase okunamadı, yerel hafızaya geçiliyor.", error);
    }
    
    // 2. Firebase çalışmazsa tarayıcı hafızasından oku
    try {
       const localData = localStorage.getItem('nobet_settings');
       if (localData) return JSON.parse(localData);
    } catch(e) {}
    
    return null;
  },

  // Save the entire state (Teachers + Lessons + Schedule) for a specific week
  saveWeeklyPlan: async (weekId: string, teachers: Teacher[], lessons: Lesson[], plan: DutyPlan) => {
    const payload = { plan, teachers, lessons };
    
    // 1. Offline kaydet
    try {
      localStorage.setItem(`nobet_plan_${weekId}`, JSON.stringify(payload));
    } catch(e) {}
    
    // 2. Firebase kaydet
    try {
      const planRef = doc(db, 'dutyPlans', weekId);
      await setDoc(planRef, plan);
      const teachersRef = doc(db, `dutyPlans/${weekId}/data/teachers`);
      await setDoc(teachersRef, { list: teachers });
      const lessonsRef = doc(db, `dutyPlans/${weekId}/data/lessons`);
      await setDoc(lessonsRef, { list: lessons });
      return true;
    } catch (error) {
      console.warn("Firebase'e kaydedilemedi, yerel hafıza devrede.", error);
      return true;
    }
  },

  loadWeeklyPlan: async (weekId: string) => {
    // 1. Firebase dene
    try {
      const planSnap = await getDoc(doc(db, 'dutyPlans', weekId));
      const teachersSnap = await getDoc(doc(db, `dutyPlans/${weekId}/data/teachers`));
      const lessonsSnap = await getDoc(doc(db, `dutyPlans/${weekId}/data/lessons`));

      if (planSnap.exists() && teachersSnap.exists() && lessonsSnap.exists()) {
        const payload = {
          plan: planSnap.data() as DutyPlan,
          teachers: teachersSnap.data().list as Teacher[],
          lessons: lessonsSnap.data().list as Lesson[]
        };
        localStorage.setItem(`nobet_plan_${weekId}`, JSON.stringify(payload)); // Cache
        return payload;
      }
    } catch (error) {
      console.warn("Firebase okunamadı, yerel hafızaya geçiliyor.", error);
    }
    
    // 2. Offline'dan oku
    try {
      const localData = localStorage.getItem(`nobet_plan_${weekId}`);
      if (localData) return JSON.parse(localData);
    } catch(e) {}
    
    return null;
  }
};
