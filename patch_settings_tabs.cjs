const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = \`          {currentView === 'import' && (
            <ExcelImport onDataImported={handleDataImported} />
          )}

          {currentView === 'teachers' && (
            <TeacherList 
              teachers={teachers} 
              schedule={currentSchedule} 
              slots={appSlots} 
              zones={appZones} 
              onToggleExclude={handleToggleExclude} 
            />
          )}\`;

code = code.replace(target1, "");

const target2 = \`          {currentView === 'settings' && (
            <SettingsView 
              appZones={appZones} setAppZones={setAppZones}
              appPeriods={appPeriods} setAppPeriods={setAppPeriods}
              appTimetable={appTimetable} setAppTimetable={setAppTimetable}
              onSave={handleSaveSettings}
            />
          )}\`;

const replacement2 = \`          {currentView === 'settings' && (
            <div className="space-y-6">
              <div className="flex border-b border-gray-200 gap-6">
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
              </div>
              
              {settingsTab === 'config' && (
                <SettingsView 
                  appZones={appZones} setAppZones={setAppZones}
                  appPeriods={appPeriods} setAppPeriods={setAppPeriods}
                  appTimetable={appTimetable} setAppTimetable={setAppTimetable}
                  onSave={handleSaveSettings}
                />
              )}

              {settingsTab === 'teachers' && (
                <TeacherList 
                  teachers={teachers} 
                  schedule={currentSchedule} 
                  slots={appSlots} 
                  zones={appZones} 
                  onToggleExclude={handleToggleExclude} 
                />
              )}

              {settingsTab === 'import' && (
                <ExcelImport onDataImported={handleDataImported} />
              )}
            </div>
          )}\`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
