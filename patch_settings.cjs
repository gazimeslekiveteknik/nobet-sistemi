const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const injectGenericLogic = \`
  const genericMode = appZones.some(z => z.id === 'z_gen_open' || z.id === 'z_gen_close');

  const handleToggleGenericMode = (enabled: boolean) => {
     if (enabled) {
        // Add generic zones
        const genOpen = {
           id: 'z_gen_open', name: 'Tüm Katlar (Açılış)', priority: 0, minStaff: 1, idealStaff: 2, riskMultiplier: 1.0, activeSlotTypes: ['OPENING']
        };
        const genClose = {
           id: 'z_gen_close', name: 'Tüm Katlar (Kapanış)', priority: 99, minStaff: 1, idealStaff: 2, riskMultiplier: 1.0, activeSlotTypes: ['CLOSING']
        };
        // Update regular zones to only be active for BREAKS
        const updated = appZones.map(z => ({ ...z, activeSlotTypes: ['BREAK'] as any }));
        setAppZones([...updated, genOpen, genClose]);
     } else {
        // Remove generic zones
        const filtered = appZones.filter(z => z.id !== 'z_gen_open' && z.id !== 'z_gen_close');
        // Reset regular zones to be active for all
        const updated = filtered.map(z => {
           const newZ = { ...z };
           delete newZ.activeSlotTypes;
           return newZ;
        });
        setAppZones(updated);
     }
  };

  const addZone = () => {
\`;

code = code.replace("  const addZone = () => {", injectGenericLogic);

const toggleUI = \`          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Nöbet Bölgeleri (Katlar)</h3>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                <input 
                   type="checkbox" 
                   id="genericMode" 
                   checked={genericMode} 
                   onChange={e => handleToggleGenericMode(e.target.checked)} 
                   className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                />
                <div>
                  <label htmlFor="genericMode" className="font-medium text-gray-800 cursor-pointer">Açılış ve Kapanış Nöbetlerini Genel Bir Görev Olarak Ata</label>
                  <p className="text-sm text-gray-600 mt-1">
                    İşaretlerseniz, açılış ve kapanış için katlara ayrı ayrı nöbetçi eklenmez. Bunun yerine sadece belirlediğiniz sayıda öğretmen görevlendirilir.
                  </p>
                </div>
              </div>
            </div>
            <button onClick={addZone} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Yeni Bölge Ekle
            </button>
          </div>\`;

const oldUI = \`          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Nöbet Bölgeleri (Katlar)</h3>
            </div>
            <button onClick={addZone} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Yeni Bölge Ekle
            </button>
          </div>\`;

code = code.replace(oldUI, toggleUI);

fs.writeFileSync('src/components/SettingsView.tsx', code);
