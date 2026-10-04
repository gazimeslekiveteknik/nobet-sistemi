const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const lockBtn = `
                  <button 
                    onClick={() => setIsLocked(!isLocked)}
                    className={\`px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 \${
                      isLocked 
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }\`}
                  >
                    {isLocked ? '🔒 Plan Kilitli (Korumada)' : '🔓 Planı Kilitle'}
                  </button>
`;

const reoptBtnOld = `<button 
                    onClick={() => setSchedule(generateSchedule(teachers, lessons, mockSlots, mockZones, schedule.assignments))}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Yeniden Optimize Et
                  </button>`;

const reoptBtnNew = `<button 
                    onClick={() => {
                       if (isLocked) {
                          alert('Bu plan kilitlenmiş! Yanlışlıkla bozulmaması için yeniden optimize etme işlemi engellendi. İşlem yapmak için kilidi açın.');
                          return;
                       }
                       setSchedule(generateSchedule(teachers, lessons, mockSlots, mockZones, schedule.assignments));
                    }}
                    className={\`text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm \${
                      isLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }\`}
                  >
                    Yeniden Optimize Et
                  </button>`;

code = code.replace(reoptBtnOld, lockBtn + '\n' + reoptBtnNew);

const dragStartOld = `onDragStart={(e) => handleDragStart(e, a)}`;
const dragStartNew = `onDragStart={(e) => { if (!isLocked) handleDragStart(e, a); }}`;
code = code.replace(dragStartOld, dragStartNew);

const dropOld = `onDrop={(e) => handleDrop(e, slot.id, zone.id)}`;
const dropNew = `onDrop={(e) => {
                                if (isLocked) {
                                  alert('Plan kilitliyken sürükle-bırak yapılamaz!');
                                  return;
                                }
                                handleDrop(e, slot.id, zone.id);
                              }}`;
code = code.replace(dropOld, dropNew);

const clickOld = `onClick={() => handleTeacherClick(a)}`;
const clickNew = `onClick={() => {
                                        if (isLocked) {
                                           alert('Plan kilitliyken raporlama işlemi yapılamaz!');
                                           return;
                                        }
                                        handleTeacherClick(a);
                                      }}`;
code = code.replace(clickOld, clickNew);


fs.writeFileSync('src/App.tsx', code);
