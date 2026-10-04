import { bilsaData } from './src/data/bilsaData';
import { calculateAvailability } from './src/algorithm/availability';
import { DayOfWeek, Slot } from './src/types';

const baseSlots = [
  { id: 's1', type: 'OPENING', startTime: '08:10', endTime: '08:30' },
  { id: 's2', type: 'BREAK', afterLesson: 2, startTime: '10:00', endTime: '10:15' },
  { id: 's3', type: 'BREAK', afterLesson: 4, startTime: '11:15', endTime: '11:30' },
  { id: 's4', type: 'BREAK', afterLesson: 6, startTime: '12:30', endTime: '12:45' },
  { id: 's5', type: 'CLOSING', afterLesson: 8, startTime: '15:20', endTime: '15:40' },
];

const mockSlots: Slot[] = [];
[1, 2, 3, 4, 5].forEach(day => {
  baseSlots.forEach(bs => {
     mockSlots.push({ ...bs, id: `${bs.id}_d${day}`, day: day as DayOfWeek } as Slot);
  });
});

const avail = calculateAvailability(bilsaData.teachers as any, bilsaData.lessons as any, mockSlots);
const bilal = bilsaData.teachers.find(t => t.name.includes('BİLAL'));
const tulay = bilsaData.teachers.find(t => t.name.includes('TÜLAY'));

let bilalAvailCount = 0;
let tulayAvailCount = 0;

for(const s of mockSlots) {
  if (avail[bilal.id][s.id].canDuty) bilalAvailCount++;
  if (avail[tulay.id][s.id].canDuty) tulayAvailCount++;
}

console.log("Bilal can duty in", bilalAvailCount, "slots");
console.log("Tülay can duty in", tulayAvailCount, "slots");
