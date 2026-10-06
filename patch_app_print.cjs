const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import
code = code.replace("import { PrintableView } from './components/PrintableView';", "import { PrintableView } from './components/PrintableView';\\nimport { TeacherSchedulesPrintView } from './components/TeacherSchedulesPrintView';");

// 2. Add to Union Type
code = code.replace("useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print'>('plan')", "useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print' | 'print-teachers'>('plan')");

// 3. Add to Sidebar
const sidebarTarget = \`          <button 
            onClick={() => setCurrentView('print')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Yazdır)</span>
          </button>\`;

const sidebarReplacement = \`          <button 
            onClick={() => setCurrentView('print')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Yazdır)</span>
          </button>
          <button 
            onClick={() => setCurrentView('print-teachers')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print-teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Kişisel Çizelgeler</span>
          </button>\`;

code = code.replace(sidebarTarget, sidebarReplacement);

// 4. Add Render logic
const renderTarget = \`          {currentView === 'print' && (
            <PrintableView 
               assignments={currentSchedule.assignments} 
               teachers={teachers} 
               zones={appZones} 
               slots={appSlots} 
               weekString={getWeekString(weekOffset)} 
            />
          )}\`;

const renderReplacement = \`          {currentView === 'print' && (
            <PrintableView 
               assignments={currentSchedule.assignments} 
               teachers={teachers} 
               zones={appZones} 
               slots={appSlots} 
               weekString={getWeekString(weekOffset)} 
            />
          )}

          {currentView === 'print-teachers' && (
            <TeacherSchedulesPrintView
               teachers={teachers}
               assignments={currentSchedule.assignments}
               slots={appSlots}
               zones={appZones}
            />
          )}\`;

code = code.replace(renderTarget, renderReplacement);

fs.writeFileSync('src/App.tsx', code);
