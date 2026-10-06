const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add printTab state
code = code.replace(
  "  const [settingsTab, setSettingsTab] = useState<'config' | 'teachers' | 'import'>('config');",
  "  const [settingsTab, setSettingsTab] = useState<'config' | 'teachers' | 'import'>('import');\\n  const [printTab, setPrintTab] = useState<'master' | 'personal'>('master');"
);

// 2. Fix sidebar 'Ayarlar' button to open 'import' first
code = code.replace(
  "onClick={() => { setCurrentView('settings'); setSettingsTab('config'); }}",
  "onClick={() => { setCurrentView('settings'); setSettingsTab('import'); }}"
);

// 3. Remove the two print buttons and add one "Yazdır & Çıktılar"
const oldPrintButtons = \`          <button 
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
          </button>\`;

const newPrintButton = \`          <button 
            onClick={() => { setCurrentView('print'); setPrintTab('master'); }}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Yazdır & Çıktılar</span>
          </button>\`;

code = code.replace(oldPrintButtons, newPrintButton);

// 4. Print layout: hide sidebar
code = code.replace('<div className="w-64 bg-white border-r border-gray-200 flex flex-col">', '<div className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">');
code = code.replace('<div className="flex-1 p-8">', '<div className="flex-1 p-8 print:p-0">');

// 5. Update settings view tab bar to use the stepper layout
const oldSettingsTabs = \`              <div className="flex border-b border-gray-200 gap-6">
                <button 
                  onClick={() => setSettingsTab('config')} 
                  className={\\\`pb-3 px-1 font-medium text-lg border-b-2 transition-colors \${settingsTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\\\`}
                >
                  Program & Bölgeler
                </button>
                <button 
                  onClick={() => setSettingsTab('teachers')} 
                  className={\\\`pb-3 px-1 font-medium text-lg border-b-2 transition-colors \${settingsTab === 'teachers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\\\`}
                >
                  Öğretmenler
                </button>
                <button 
                  onClick={() => setSettingsTab('import')} 
                  className={\\\`pb-3 px-1 font-medium text-lg border-b-2 transition-colors \${settingsTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\\\`}
                >
                  Veri Aktarımı
                </button>
              </div>\`;

const newSettingsTabs = \`              <div className="flex items-center mb-8 border-b border-gray-200 pb-6">
                <button onClick={() => setSettingsTab('import')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={\\\`flex items-center justify-center w-8 h-8 rounded-full font-bold \${settingsTab === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}\\\`}>1</div>
                  <span className={\\\`ml-3 font-medium text-lg \${settingsTab === 'import' ? 'text-indigo-600' : 'text-gray-500'}\\\`}>Veri Aktarımı</span>
                </button>
                <ChevronRight className="w-5 h-5 mx-6 text-gray-400" />
                <button onClick={() => setSettingsTab('teachers')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={\\\`flex items-center justify-center w-8 h-8 rounded-full font-bold \${settingsTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}\\\`}>2</div>
                  <span className={\\\`ml-3 font-medium text-lg \${settingsTab === 'teachers' ? 'text-indigo-600' : 'text-gray-500'}\\\`}>Öğretmenler</span>
                </button>
                <ChevronRight className="w-5 h-5 mx-6 text-gray-400" />
                <button onClick={() => setSettingsTab('config')} className="flex items-center hover:opacity-80 transition-opacity">
                  <div className={\\\`flex items-center justify-center w-8 h-8 rounded-full font-bold \${settingsTab === 'config' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}\\\`}>3</div>
                  <span className={\\\`ml-3 font-medium text-lg \${settingsTab === 'config' ? 'text-indigo-600' : 'text-gray-500'}\\\`}>Program & Bölge Ayarı</span>
                </button>
              </div>\`;

code = code.replace(oldSettingsTabs, newSettingsTabs);


// 6. Update print view to handle Tabs
const oldPrintView = \`          {currentView === 'print' && (
            <PrintableView 
               schedule={currentSchedule} 
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

const newPrintView = \`          {currentView === 'print' && (
            <div className="space-y-6">
              <div className="flex border-b border-gray-200 gap-6 print:hidden">
                <button 
                  onClick={() => setPrintTab('master')} 
                  className={\\\`pb-3 px-1 font-medium text-lg border-b-2 transition-colors \${printTab === 'master' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\\\`}
                >
                  Okul Panosu (Genel)
                </button>
                <button 
                  onClick={() => setPrintTab('personal')} 
                  className={\\\`pb-3 px-1 font-medium text-lg border-b-2 transition-colors \${printTab === 'personal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\\\`}
                >
                  Öğretmen El Programı
                </button>
              </div>

              {printTab === 'master' && (
                <PrintableView 
                  schedule={currentSchedule} 
                  teachers={teachers} 
                  zones={appZones} 
                  slots={appSlots} 
                  weekString={getWeekString(weekOffset)} 
                />
              )}
              {printTab === 'personal' && (
                <TeacherSchedulesPrintView
                  teachers={teachers}
                  assignments={currentSchedule.assignments}
                  slots={appSlots}
                  zones={appZones}
                />
              )}
            </div>
          )}\`;

code = code.replace(oldPrintView, newPrintView);


fs.writeFileSync('src/App.tsx', code);
