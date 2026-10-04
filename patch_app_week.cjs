const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update imports to include ChevronLeft, ChevronRight
code = code.replace("import { Download, Upload, Users, Calendar, LayoutDashboard, FileSpreadsheet, Settings } from 'lucide-react';", "import { Download, Upload, Users, Calendar, LayoutDashboard, FileSpreadsheet, Settings, ChevronLeft, ChevronRight } from 'lucide-react';");

// 2. Add weekOffset state
const stateOld = `const [selectedDay, setSelectedDay] = useState<number>(1);`;
const stateNew = `const [selectedDay, setSelectedDay] = useState<number>(1);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [weekSchedules, setWeekSchedules] = useState<Record<number, typeof schedule>>({ 0: schedule });

  const currentSchedule = weekSchedules[weekOffset] || schedule;
  const updateCurrentSchedule = (newSched: typeof schedule) => {
    setWeekSchedules(prev => ({ ...prev, [weekOffset]: newSched }));
    setSchedule(newSched);
  };
`;
code = code.replace(stateOld, stateNew);

// 3. Update getWeekString to accept offset
const weekStringOld = `const getWeekString = () => {
    const curr = new Date();`;
const weekStringNew = `const getWeekString = (offset = 0) => {
    const curr = new Date();
    curr.setDate(curr.getDate() + (offset * 7));`;
code = code.replace(weekStringOld, weekStringNew);

// 4. Update the Title area to include arrows
const titleOld = `<h1 className="text-3xl font-bold text-gray-900">Nöbet Planı <span className="text-lg font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full ml-3 align-middle">{getWeekString()}</span></h1>`;
const titleNew = `<div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Nöbet Planı</h1>
                    <div className="flex items-center bg-indigo-50 rounded-full p-1 border border-indigo-100 shadow-sm">
                      <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Önceki Hafta"><ChevronLeft className="w-5 h-5" /></button>
                      <span className="text-sm font-medium text-indigo-700 px-4 min-w-[140px] text-center">{getWeekString(weekOffset)}</span>
                      <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors" title="Sonraki Hafta"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                  </div>`;
code = code.replace(titleOld, titleNew);

// 5. Replace references of schedule.assignments to currentSchedule.assignments
code = code.replace(/schedule\.assignments/g, 'currentSchedule.assignments');
// Fix the setSchedule(generateSchedule(...)) line in the Yeniden Optimize Et button
code = code.replace("setSchedule(generateSchedule(teachers, lessons, mockSlots, mockZones, currentSchedule.assignments));", "updateCurrentSchedule(generateSchedule(teachers, lessons, mockSlots, mockZones, currentSchedule.assignments));");

// In handleDrop, it calls setSchedule(prev => ...) we need to fix it:
code = code.replace("setSchedule(prev => ({", "updateCurrentSchedule({");
code = code.replace("assignments: prev.assignments.map", "assignments: currentSchedule.assignments.map");
code = code.replace("assignments: [...prev.assignments,", "assignments: [...currentSchedule.assignments,");
code = code.replace("warnings: prev.warnings", "warnings: currentSchedule.warnings");

// Wait, the setSchedule(prev => ...) replacement might be tricky. Let's just use regex for handleDrop replacement.
// Actually, it's safer to just replace all `setSchedule` with `updateCurrentSchedule` except the initialization.
// Let's do it simply by replacing `setSchedule(` with `updateCurrentSchedule(` and defining updateCurrentSchedule to accept both function and object.
const updateCurrentSchedDefOld = `const updateCurrentSchedule = (newSched: typeof schedule) => {`;
const updateCurrentSchedDefNew = `const updateCurrentSchedule = (newSched: typeof schedule | ((prev: typeof schedule) => typeof schedule)) => {
    const resolved = typeof newSched === 'function' ? newSched(currentSchedule) : newSched;
    setWeekSchedules(prev => ({ ...prev, [weekOffset]: resolved }));
    setSchedule(resolved);
  };`;
code = code.replace(updateCurrentSchedDefOld, updateCurrentSchedDefNew);

code = code.replace(/setSchedule\(/g, 'updateCurrentSchedule(');
// Revert the initial useState one
code = code.replace("const [schedule, updateCurrentSchedule] = useState", "const [schedule, setSchedule] = useState");

fs.writeFileSync('src/App.tsx', code);
