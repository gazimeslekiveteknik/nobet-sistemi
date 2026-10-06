const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Define Snapshot type
code = code.replace("import type { Teacher, Lesson, Slot, Zone, Assignment, DayOfWeek } from './types';", "import type { Teacher, Lesson, Slot, Zone, Assignment, DayOfWeek, Schedule } from './types';\\n\\ninterface Snapshot {\\n  schedule: Schedule;\\n  teachers: Teacher[];\\n}");

// 2. Add history state and functions
const stateInjection = \`  const [weekSchedules, setWeekSchedules] = useState<Record<number, typeof schedule>>({ 0: schedule });

  const [history, setHistory] = useState<Record<number, Snapshot[]>>({});

  const saveHistory = () => {
    setHistory(prev => {
      const weekHist = prev[weekOffset] || [];
      return {
        ...prev,
        [weekOffset]: [...weekHist, { schedule: currentSchedule, teachers: JSON.parse(JSON.stringify(teachers)) }].slice(-20)
      };
    });
  };

  const handleUndo = () => {
    setHistory(prev => {
      const weekHist = prev[weekOffset] || [];
      if (weekHist.length === 0) return prev;
      
      const lastSnapshot = weekHist[weekHist.length - 1];
      const newHist = weekHist.slice(0, -1);
      
      setTeachers(lastSnapshot.teachers);
      setWeekSchedules(weeks => ({ ...weeks, [weekOffset]: lastSnapshot.schedule }));
      setSchedule(lastSnapshot.schedule);
      
      return { ...prev, [weekOffset]: newHist };
    });
  };\`;

code = code.replace(/  const \[weekSchedules, setWeekSchedules\] = useState<Record<number, typeof schedule>>\(\{ 0: schedule \}\);/, stateInjection);

// 3. Inject saveHistory() into actions
// a) Settings Save
code = code.replace(/const handleSaveSettings = async \(\) => \{/, "const handleSaveSettings = async () => {\\n    saveHistory();");
// b) handleToggleExclude
code = code.replace(/const handleToggleExclude = \(teacherId: string, isExcluded: boolean\) => \{/, "const handleToggleExclude = (teacherId: string, isExcluded: boolean) => {\\n    saveHistory();");
// c) optimize
code = code.replace(/const optimize = \(\) => \{/, "const optimize = () => {\\n    saveHistory();");
// d) handleSwap
code = code.replace(/const handleSwap = \(a1: Assignment, a2: Assignment\) => \{/, "const handleSwap = (a1: Assignment, a2: Assignment) => {\\n    saveHistory();");

// 4. Add Undo button to the UI (in the header of Haftalık Plan)
const headerOld = \`<div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">\`;

const headerNew = \`<div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handleUndo}
                disabled={!(history[weekOffset] && history[weekOffset].length > 0)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Geri Al"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                Geri Al
              </button>
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">\`;

code = code.replace(headerOld, headerNew);

fs.writeFileSync('src/App.tsx', code);
