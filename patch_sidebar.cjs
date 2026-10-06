const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove old views from the currentView union if needed, but it's easier to just keep them in type to avoid TS errors
// We'll just add the settingsTab state
code = code.replace("  const [currentView, setCurrentView] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print' | 'print-teachers'>('plan');", 
  "  const [currentView, setCurrentView] = useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings' | 'print' | 'print-teachers'>('plan');\\n  const [settingsTab, setSettingsTab] = useState<'config' | 'teachers' | 'import'>('config');");

// 2. Rewrite the Sidebar navigation
const sidebarTarget = \`        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentView('plan')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'plan' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Calendar size={20} />
            <span>Haftalık Plan</span>
          </button>
          <button 
            onClick={() => setCurrentView('teachers')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Users size={20} />
            <span>Öğretmenler</span>
          </button>
          <button 
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
          </button>
          <button 
            onClick={() => setCurrentView('print-teachers')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print-teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Kişisel Çizelgeler</span>
          </button>
          <button 
            onClick={() => setCurrentView('import')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'import' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <FileSpreadsheet size={20} />
            <span>Veri Aktarımı</span>
          </button>
          <button 
            onClick={() => setCurrentView('settings')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>
        </nav>\`;

const sidebarReplacement = \`        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentView('plan')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'plan' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Calendar size={20} />
            <span>Haftalık Plan</span>
          </button>
          
          <button 
            onClick={() => { setCurrentView('settings'); setSettingsTab('config'); }}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>

          <button 
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
            <span>Çizelge (Okul Panosu)</span>
          </button>

          <button 
            onClick={() => setCurrentView('print-teachers')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print-teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Öğretmen El)</span>
          </button>
        </nav>\`;

code = code.replace(sidebarTarget, sidebarReplacement);

fs.writeFileSync('src/App.tsx', code);
