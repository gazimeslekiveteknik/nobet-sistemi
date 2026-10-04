import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { Teacher, Lesson, DutyPlan } from '../types';

export const FirebaseService = {
  // Save the entire state (Teachers + Lessons + Schedule) for a specific week
  saveWeeklyPlan: async (weekId: string, teachers: Teacher[], lessons: Lesson[], plan: DutyPlan) => {
    try {
      // Save Plan
      const planRef = doc(db, 'dutyPlans', weekId);
      await setDoc(planRef, plan);

      // Save Teachers State for that week (so history is preserved)
      const teachersRef = doc(db, `dutyPlans/${weekId}/data/teachers`);
      await setDoc(teachersRef, { list: teachers });

      // Save Lessons State
      const lessonsRef = doc(db, `dutyPlans/${weekId}/data/lessons`);
      await setDoc(lessonsRef, { list: lessons });

      return true;
    } catch (error) {
      console.error("Error saving plan: ", error);
      throw error;
    }
  },

  loadWeeklyPlan: async (weekId: string) => {
    try {
      const planSnap = await getDoc(doc(db, 'dutyPlans', weekId));
      const teachersSnap = await getDoc(doc(db, `dutyPlans/${weekId}/data/teachers`));
      const lessonsSnap = await getDoc(doc(db, `dutyPlans/${weekId}/data/lessons`));

      if (planSnap.exists() && teachersSnap.exists() && lessonsSnap.exists()) {
        return {
          plan: planSnap.data() as DutyPlan,
          teachers: teachersSnap.data().list as Teacher[],
          lessons: lessonsSnap.data().list as Lesson[]
        };
      }
      return null;
    } catch (error) {
      console.error("Error loading plan: ", error);
      throw error;
    }
  }
};
