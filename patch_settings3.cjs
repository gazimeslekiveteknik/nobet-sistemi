const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const targetStr = `          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">Nöbet Bölgeleri (Katlar)</h3>
            </div>
            <button onClick={addZone} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Yeni Bölge Ekle
            </button>
          </div>`;

const replacement = `          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Nöbet Bölgeleri (Katlar)</h3>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
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
              </div>
            </div>
            <button onClick={addZone} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors mt-8">
              <Plus className="w-4 h-4" /> Yeni Bölge Ekle
            </button>
          </div>`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/SettingsView.tsx', code);
