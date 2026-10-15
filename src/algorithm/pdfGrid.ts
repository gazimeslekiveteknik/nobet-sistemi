export interface PDFCell { str: string; transform: number[] }

// Use printed period numbers as column anchors. Empty columns must retain their number.
export function readPeriodColumns(items: PDFCell[]): { period: number; x: number }[] {
  const numbers = items.filter(item => /^\d{1,2}$/.test(item.str.trim()) && Number(item.str) >= 1 && Number(item.str) <= 20);
  const rows = numbers.map(anchor => numbers.filter(item => Math.abs(item.transform[5] - anchor.transform[5]) < 4)
    .sort((a, b) => a.transform[4] - b.transform[4]));
  const row = rows.sort((a, b) => b.length - a.length).find(cells => cells.length >= 3 && cells.every((cell, i) => Number(cell.str) === i + 1));
  if (!row) throw new Error('PDF ders sütunları güvenilir biçimde okunamadı. Excel çıktısını kullanın.');
  return row.map(cell => ({ period: Number(cell.str), x: cell.transform[4] }));
}

export function lessonsInRow(cells: PDFCell[], columns: { period: number; x: number }[]): { period: number; className: string }[] {
  const grouped = new Map<number, PDFCell[]>();
  for (const cell of cells) {
    const column = columns.reduce((best, candidate) => Math.abs(candidate.x - cell.transform[4]) < Math.abs(best.x - cell.transform[4]) ? candidate : best);
    const spacing = columns.length > 1 ? Math.abs(columns[1].x - columns[0].x) : 50;
    if (Math.abs(column.x - cell.transform[4]) > spacing / 2) continue;
    grouped.set(column.period, [...(grouped.get(column.period) || []), cell]);
  }
  return [...grouped.entries()].map(([period, items]) => ({ period, className: items.sort((a,b) => b.transform[5] - a.transform[5]).map(x => x.str.trim()).filter(Boolean).join(' / ') }));
}
