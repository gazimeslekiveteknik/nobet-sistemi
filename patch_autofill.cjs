const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// 1. Add states for duration and timetable
code = code.replace("const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];", 
\`const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const [lessonDuration, setLessonDuration] = useState(40);
  const [breakDuration, setBreakDuration] = useState(15);
  const [timetable, setTimetable] = useState<Record<string, {start: string, end: string}>>({});\`);

// 2. Add handleTimeChange and handleAutoFill functions
const functions = \`
  const handleTimeChange = (lessonId: number, day: string, field: 'start' | 'end', val: string) => {
    setTimetable(prev => ({
      ...prev,
      [\`\${lessonId}_\${day}\`]: {
        ...(prev[\`\${lessonId}_\${day}\`] || { start: '', end: '' }),
        [field]: val
      }
    }));
  };

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const m = (totalMins % 60).toString().padStart(2, '0');
    return \`\${h}:\${m}\`;
  };

  const handleAutoFill = () => {
    const firstStart = timetable['1_Pazartesi']?.start;
    if (!firstStart) {
      alert('Lütfen Pazartesi 1. Dersin başlangıç saatini girin!');
      return;
    }

    const newTimetable = { ...timetable };
    const startMins = parseTime(firstStart);

    days.forEach(day => {
      let currentMins = startMins; // Assume same start time for all days
      
      lessons.forEach(lesson => {
        const endMins = currentMins + lessonDuration;
        
        newTimetable[\`\${lesson.id}_\${day}\`] = {
          start: formatTime(currentMins),
          end: formatTime(endMins)
        };
        
        currentMins = endMins + breakDuration;
      });
    });

    setTimetable(newTimetable);
  };
\`;

code = code.replace("const addZone = () => {", functions + "\n  const addZone = () => {");

// 3. Update the duration selects to be controlled
code = code.replace('<select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">', 
  '<select value={lessonDuration} onChange={e => setLessonDuration(Number(e.target.value))} className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">');
code = code.replace('<select className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">', 
  '<select value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} className="px-3 py-1.5 border border-blue-200 rounded outline-none text-sm bg-white">');

// 4. Update the AutoFill button onClick
code = code.replace(/onClick=\{\(\) => alert\([\s\S]*?\}\s*className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1\.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"/, 
  \`onClick={handleAutoFill}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"\`);

// 5. Update the inputs to use the timetable state
const inputsOld = \`<input type="time" className="w-full px-1 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500 bg-white" title="Başlangıç Saati" />
                          <span className="text-gray-400">-</span>
                          <input type="time" className="w-full px-1 py-1 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500" title="Bitiş Saati" />\`;
const inputsNew = \`<input type="time" value={timetable[\`\${lesson.id}_\${day}\`]?.start || ''} onChange={e => handleTimeChange(lesson.id, day, 'start', e.target.value)} className="w-full px-1 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500 bg-white" title="Başlangıç Saati" />
                          <span className="text-gray-400">-</span>
                          <input type="time" value={timetable[\`\${lesson.id}_\${day}\`]?.end || ''} onChange={e => handleTimeChange(lesson.id, day, 'end', e.target.value)} className="w-full px-1 py-1 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500" title="Bitiş Saati" />\`;

code = code.replace(new RegExp(inputsOld.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), inputsNew);

fs.writeFileSync('src/components/SettingsView.tsx', code);
