const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update view state
code = code.replace("useState<'plan' | 'import' | 'teachers' | 'reports'>('plan')", "useState<'plan' | 'import' | 'teachers' | 'reports' | 'settings'>('plan')");

// Update settings button
const btnOld = `<button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 font-medium rounded-lg">
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>`;
const btnNew = `<button 
            onClick={() => setCurrentView('settings')}
            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\`}
          >
            <Settings size={20} />
            <span>Ayarlar</span>
          </button>`;
code = code.replace(btnOld, btnNew);

// Add import for Settings component
code = code.replace("import { Analytics } from './components/Analytics';", "import { Analytics } from './components/Analytics';\nimport { SettingsView } from './components/SettingsView';");

// Render Settings component
const renderOld = `{currentView === 'plan' && (`;
const renderNew = `{currentView === 'settings' && (
            <SettingsView 
               zones={mockZones} 
               slots={mockSlots} 
            />
          )}

          {currentView === 'plan' && (`
code = code.replace(renderOld, renderNew);

fs.writeFileSync('src/App.tsx', code);
