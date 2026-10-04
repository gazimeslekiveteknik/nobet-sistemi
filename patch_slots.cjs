const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update baseSlots to include a specific slot for 3. Kat
const newBaseSlots = `const baseSlots = [
  { id: 's1', type: 'OPENING', startTime: '08:40', endTime: '09:00' },
  { id: 's2', type: 'BREAK', afterLesson: 2, startTime: '10:30', endTime: '10:45' },
  { id: 's3', type: 'BREAK', afterLesson: 4, startTime: '12:15', endTime: '12:30' },
  { id: 's4', type: 'BREAK', afterLesson: 6, startTime: '14:00', endTime: '14:15' },
  { id: 's5', type: 'CLOSING', afterLesson: 8, startTime: '17:00', endTime: '17:20' },
  // 3. Kat Özel Saatler
  { id: 's_kat3_1', type: 'OPENING', startTime: '08:00', endTime: '08:20', zoneSpecificIds: ['z4'] },
  { id: 's_kat3_2', type: 'BREAK', afterLesson: 2, startTime: '09:50', endTime: '10:05', zoneSpecificIds: ['z4'] }
];`;

code = code.replace(/const baseSlots = \[\s*\{ id: 's1'[\s\S]*?\];/, newBaseSlots);

fs.writeFileSync('src/App.tsx', code);
