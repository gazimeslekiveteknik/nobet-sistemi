const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Printer to lucide-react imports
code = code.replace(/import \{ Calendar, Users, ShieldAlert, FileSpreadsheet, Settings, BarChart3, ChevronLeft, ChevronRight \} from 'lucide-react';/, "import { Calendar, Users, ShieldAlert, FileSpreadsheet, Settings, BarChart3, ChevronLeft, ChevronRight, Printer } from 'lucide-react';");

// 2. Import PrintableView
code = code.replace(/import \{ Analytics \} from '\.\/components\/Analytics';/, "import { Analytics } from './components/Analytics';\\nimport { PrintableView } from './components/PrintableView';");

// 3. Update currentView type
code = code.replace(/const \[currentView, setCurrentView\] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings'>\('plan'\);/, "const [currentView, setCurrentView] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print'>('plan');");

// 4. Add print to sidebar
const oldSidebar = \`<button 
            onClick={() => setCurrentView('reports')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <BarChart3 size={20} />
            <span>Analiz & Raporlar</span>
          </button>\`;

const newSidebar = \`<button 
            onClick={() => setCurrentView('reports')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <BarChart3 size={20} />
            <span>Analiz & Raporlar</span>
          </button>
          <button 
            onClick={() => setCurrentView('print')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Yazdır)</span>
          </button>\`;

code = code.replace(oldSidebar, newSidebar);

// 5. Add PrintableView render
const oldRender = \`          {currentView === 'reports' && (
            <Analytics teachers={teachers} assignments={currentSchedule.assignments} zones={appZones} slots={appSlots} />
          )}\`;

const newRender = \`          {currentView === 'reports' && (
            <Analytics teachers={teachers} assignments={currentSchedule.assignments} zones={appZones} slots={appSlots} />
          )}

          {currentView === 'print' && (
            <PrintableView 
               schedule={currentSchedule} 
               teachers={teachers} 
               zones={appZones} 
               slots={appSlots} 
               weekString={getWeekString(weekOffset)} 
            />
          )}\`;

code = code.replace(oldRender, newRender);

fs.writeFileSync('src/App.tsx', code);
