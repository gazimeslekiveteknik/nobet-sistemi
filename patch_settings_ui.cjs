const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const targetUI = \`              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                <input 
                   type="checkbox" 
                   id="genericMode" 
                   checked={genericMode} 
                   onChange={e => handleToggleGenericMode(e.target.checked)} 
                   className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" 
                />
                <div>
                  <label htmlFor="genericMode" className="font-medium text-gray-800 cursor-pointer">Açılış ve Kapanış Nöbetlerini Katlardan Bağımsız Olarak Ata</label>
                  <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                    Bu seçenek aktifken katlara ayrı ayrı açılış/kapanış nöbeti eklenmez. Aşağıdaki listeye otomatik eklenen <b>Tüm Katlar (Açılış)</b> ve <b>(Kapanış)</b> görevlerinden gereken kişi sayısını (ör. 2) ayarlayabilirsiniz.
                  </p>
                </div>
              </div>\`;

const newUI = \`              <div className="mt-4 p-5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 shadow-sm">
                <input 
                   type="checkbox" 
                   id="genericMode" 
                   checked={genericMode} 
                   onChange={e => handleToggleGenericMode(e.target.checked)} 
                   className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" 
                />
                <div className="flex-1">
                  <label htmlFor="genericMode" className="font-bold text-gray-800 cursor-pointer text-lg">Açılış ve Kapanış Nöbetlerini Genel Olarak Ata</label>
                  <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                    Bu seçenek aktifken her kata ayrı ayrı açılış/kapanış görevlisi <b>eklenmez</b>. Tüm katları kontrol edecek genel nöbetçiler belirlenir. Başlangıç/bitiş saati seçilmez, sadece kişi sayısını seçersiniz.
                  </p>
                  
                  {genericMode && (
                    <div className="mt-5 p-4 bg-white border border-blue-100 rounded-lg flex flex-wrap gap-8 items-center shadow-sm">
                       <div className="flex items-center gap-3">
                         <span className="font-semibold text-gray-700">Açılış İçin Gereken Kişi:</span>
                         <input type="number" min="1" max="10" 
                           value={appZones.find(z => z.id === 'z_gen_open')?.idealStaff || 2}
                           onChange={e => {
                              const v = Number(e.target.value);
                              setAppZones(appZones.map(z => z.id === 'z_gen_open' ? {...z, idealStaff: v} : z));
                           }}
                           className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-semibold text-gray-700">Kapanış İçin Gereken Kişi:</span>
                         <input type="number" min="1" max="10" 
                           value={appZones.find(z => z.id === 'z_gen_close')?.idealStaff || 2}
                           onChange={e => {
                              const v = Number(e.target.value);
                              setAppZones(appZones.map(z => z.id === 'z_gen_close' ? {...z, idealStaff: v} : z));
                           }}
                           className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                       </div>
                    </div>
                  )}
                </div>
              </div>\`;

code = code.replace(targetUI, newUI);

// Now filter out the generic zones from the mapped list!
const listTarget = \`{appZones.map((z, idx) => (\`;
const listReplacement = \`{appZones.filter(z => z.id !== 'z_gen_open' && z.id !== 'z_gen_close').map((z) => {
              const idx = appZones.findIndex(orig => orig.id === z.id);
              return (\`;

code = code.replace(listTarget, listReplacement);

// We must also fix the closing parenthesis of the map
const listEndTarget = \`            ))}\`;
const listEndReplacement = \`            );
            })}\`;

code = code.replace(listEndTarget, listEndReplacement);

fs.writeFileSync('src/components/SettingsView.tsx', code);
