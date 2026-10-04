const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const cellOld = `<td 
                              key={zone.id} 
                              className="py-4 px-6 border-l border-gray-100"`;
const cellNew = `<td 
                              key={zone.id} 
                              className={\`py-4 px-6 border-l border-gray-100 \${slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id) ? 'bg-gray-100/50' : ''}\`}`;
code = code.replace(cellOld, cellNew);

const dragStartOld = `onDragStart={(e) => { if (!isLocked) handleDragStart(e, a); }}`;
const dropOld = `onDrop={(e) => {
                                if (isLocked) {
                                  alert('Plan kilitliyken sürükle-bırak yapılamaz!');
                                  return;
                                }
                                handleDrop(e, slot.id, zone.id);
                              }}`;
const dropNew = `onDrop={(e) => {
                                if (isLocked) {
                                  alert('Plan kilitliyken sürükle-bırak yapılamaz!');
                                  return;
                                }
                                if (slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id)) {
                                  alert('Bu zaman dilimi bu bölge için geçerli değil!');
                                  return;
                                }
                                handleDrop(e, slot.id, zone.id);
                              }}`;
code = code.replace(dropOld, dropNew);

const emptyOld = `<div className="h-full w-full flex items-center text-gray-400 text-sm italic border-2 border-dashed border-transparent hover:border-gray-200 rounded-md p-2 transition-colors">
                                    Boş
                                  </div>`;
const emptyNew = `{slot.zoneSpecificIds && !slot.zoneSpecificIds.includes(zone.id) ? (
                                    <div className="h-full w-full flex items-center text-gray-300 text-xs text-center border-2 border-transparent p-2">
                                      Geçerli Değil
                                    </div>
                                  ) : (
                                  <div className="h-full w-full flex items-center text-gray-400 text-sm italic border-2 border-dashed border-transparent hover:border-gray-200 rounded-md p-2 transition-colors">
                                    Boş
                                  </div>
                                  )}`;
code = code.replace(emptyOld, emptyNew);

fs.writeFileSync('src/App.tsx', code);
