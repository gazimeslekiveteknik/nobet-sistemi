import * as XLSX from 'xlsx';
import type { Teacher, Lesson, DayOfWeek } from '../types';

export function parseBilsaExcel(workbook: XLSX.WorkBook): { teachers: Teacher[], lessons: Lesson[] } {
  const teachers: Teacher[] = [];
  const lessons: Lesson[] = [];

  // Bilsa usually outputs everything in the first sheet for teacher schedules.
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to 2D array
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  let currentTeacher: Teacher | null = null;
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

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    // Search for Teacher Name ("Adı Soyadı:")
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim();
      
      if (cellValue.toLowerCase().includes('adı soyadı')) {
        let name = '';
        const match = cellValue.match(/adı soyadı[:\s]*(.*)/i);
        if (match && match[1].trim()) {
           name = match[1].trim();
        }
        
        // If it was split in different cells
        if (!name) {
           for (let offset = 1; offset <= 4; offset++) {
              if (row[colIndex + offset] && String(row[colIndex + offset]).trim() !== '') {
                 name = String(row[colIndex + offset]).trim();
                 break;
              }
           }
        }

        if (name) {
          currentTeacher = {
            id: `T_${teachers.length + 1}_${name.replace(/\s+/g, '')}`,
            name,
            branch: 'Bilinmiyor', // Can be parsed if "Ders" is analyzed
            isExcluded: false,
            historyStats: { totalScore: 0, zoneCounts: {} }
          };
          teachers.push(currentTeacher);
        }
      }
    }

    // Parse Schedule Grid for Current Teacher
    if (currentTeacher) {
      const firstCell = String(row[0] || '').trim().toLowerCase();
      
      if (daysMap[firstCell]) {
        const dayOfWeek = daysMap[firstCell];
        
        // Loop through the periods (usually 1 to 10+, starting from column 1 or 2 depending on formatting)
        // Bilsa usually has merged cells, so we check columns after the day column.
        // Assuming col 1 is period 1, col 2 is period 2, etc. (we might need to skip empty cols)
        let period = 1;
        for (let colIndex = 1; colIndex < row.length; colIndex++) {
           const cellContent = String(row[colIndex] || '').trim();
           if (cellContent && cellContent !== '') {
             // Example content: "10A BL\nBED\nSALON2" or similar depending on export.
             lessons.push({
               id: `L_${currentTeacher.id}_${dayOfWeek}_${period}`,
               day: dayOfWeek,
               period: period,
               className: cellContent.split('\n')[0] || cellContent, // Best effort guess
               teacherId: currentTeacher.id
             });
           }
           period++;
        }
      }
    }
  }

  if (teachers.length === 0) {
    throw new Error('Dosya formatı tanınmadı. "Adı Soyadı:" etiketi bulunamadı. Bu bir Bilsa Excel çıktısı olmayabilir.');
  }

  return { teachers, lessons };
}
