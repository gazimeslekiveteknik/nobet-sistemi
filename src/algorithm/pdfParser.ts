import * as pdfjsLib from 'pdfjs-dist';
import type { Teacher, Lesson, DayOfWeek } from '../types';

// In Vite, we can load the worker like this
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const daysMap: Record<string, DayOfWeek> = {
  'pazartesi': 1,
  'salı': 2,
  'sali': 2,
  'çarşamba': 3,
  'carsamba': 3,
  'perşembe': 4,
  'persembe': 4,
  'cuma': 5
};

export async function parseBilsaPDF(arrayBuffer: ArrayBuffer): Promise<{ teachers: Teacher[], lessons: Lesson[] }> {
  const teachers: Teacher[] = [];
  const lessons: Lesson[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      // Sort items by Y descending (top to bottom), then X ascending (left to right)
      items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
          return b.transform[5] - a.transform[5]; // Y desc
        }
        return a.transform[4] - b.transform[4]; // X asc
      });

      let teacherName = '';
      
      // Heuristic extraction
      for (let i = 0; i < items.length; i++) {
        const text = items[i].str.trim();
        if (text === 'Adı Soyadı:') {
          // The next item is usually the name
          if (items[i+1]) {
             teacherName = items[i+1].str.trim();
             // Sometimes it includes "Eğitici Kol"
             if (teacherName.includes('Eğitici')) {
                teacherName = teacherName.split('Eğitici')[0].trim();
             }
          }
          break;
        }
      }

      if (!teacherName) continue; // Not a valid Bilsa page

      const teacherId = `T_pdf_${pageNum}_${teacherName.replace(/\s+/g, '')}`;
      teachers.push({
        id: teacherId,
        name: teacherName,
        branch: 'Bilinmiyor',
        isExcluded: false,
        historyStats: { totalScore: 0, zoneCounts: {} }
      });

      // Simple heuristic for lessons:
      // We look for day names on the left side (low X)
      // Then find items in the same Y range (with some tolerance)
      // Then sort them by X to determine period
      
      const dayGroups: Record<number, any[]> = {};
      
      let currentDay: DayOfWeek | null = null;
      let currentDayY = 0;

      for (const item of items) {
         const text = item.str.trim().toLowerCase();
         const y = item.transform[5];
         const x = item.transform[4];

         // Is this a day name?
         if (x < 100 && daysMap[text]) {
            currentDay = daysMap[text];
            currentDayY = y;
            dayGroups[currentDay] = [];
            continue;
         }

         if (currentDay && Math.abs(y - currentDayY) < 30 && x > 100) {
            // It's a lesson cell on this day
            if (item.str.trim().length > 1) { // Skip empty
               dayGroups[currentDay].push(item);
            }
         }
      }

      // Reconstruct lessons
      for (const day of [1, 2, 3, 4, 5]) {
         if (dayGroups[day]) {
            const cells = dayGroups[day];
            // We group items that have similar X coordinates
            cells.sort((a, b) => a.transform[4] - b.transform[4]);
            
            // X coordinates usually jump by ~50-60 pixels per column in A4 PDF
            // This is a naive grouping
            let period = 1;
            let lastX = -1;
            
            for (const cell of cells) {
               if (lastX === -1 || cell.transform[4] - lastX > 30) {
                  // New period
                  lessons.push({
                     id: `L_${teacherId}_${day}_${period}`,
                     day: day as DayOfWeek,
                     period: period,
                     className: cell.str.trim(),
                     teacherId: teacherId
                  });
                  period++;
                  lastX = cell.transform[4];
               }
            }
         }
      }
    }

  } catch (err) {
    console.error("PDF Parsing error:", err);
    throw new Error("PDF dosyası okunamadı. Lütfen Bilsa çıktısı olduğundan emin olun.");
  }

  if (teachers.length === 0) {
     throw new Error("Bu PDF'te öğretmen programı bulunamadı.");
  }

  return { teachers, lessons };
}
