import type { Zone, Slot } from '../types';
import { Save, AlertCircle } from 'lucide-react';

interface SettingsViewProps {
  zones: Zone[];
  slots: Slot[];
}

export function SettingsView({ zones, slots }: SettingsViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Sistem Ayarları</h2>
        <p className="text-gray-500 mt-1">Okulunuzun nöbet bölgelerini ve saatlerini özelleştirin.</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Nöbet Bölgeleri */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Nöbet Bölgeleri (Katlar)</h3>
          <div className="space-y-3">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <input type="text" defaultValue={z.name} className="flex-1 px-3 py-2 border rounded bg-white" disabled />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Gereken Kişi:</span>
                  <input type="number" defaultValue={z.idealStaff} className="w-16 px-2 py-1 border rounded text-center bg-white" disabled />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Öncelik:</span>
                  <input type="number" defaultValue={z.priority} className="w-16 px-2 py-1 border rounded text-center bg-white" disabled />
                </div>
              </div>
            ))}
            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>Evrensel Sistem: Bu ekran üzerinden yeni bölge (Örn: Ek Bina, Spor Salonu) ekleme özelliği V2 güncellemesiyle aktif edilecektir. Şu an sistem mevcut bölgeleri kullanmaktadır.</p>
            </div>
          </div>
        </section>

        {/* Nöbet Zaman Dilimleri */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Nöbet Zaman Dilimleri</h3>
          <div className="space-y-3">
            {slots.map(s => (
              <div key={s.id} className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <select defaultValue={s.type} className="px-3 py-2 border rounded bg-white" disabled>
                  <option value="OPENING">Açılış Nöbeti</option>
                  <option value="BREAK">Teneffüs Nöbeti</option>
                  <option value="CLOSING">Kapanış Nöbeti</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Başlangıç:</span>
                  <input type="time" defaultValue={s.startTime} className="px-2 py-1 border rounded bg-white" disabled />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Bitiş:</span>
                  <input type="time" defaultValue={s.endTime} className="px-2 py-1 border rounded bg-white" disabled />
                </div>
                {s.zoneSpecificIds && (
                  <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                    Sadece Özel Bölgeler İçin ({s.zoneSpecificIds.join(',')})
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 p-4 bg-amber-50 text-amber-800 rounded-lg flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>Farklı katların farklı saatlerde derse girmesi (Örn: 3. Kat'ın zil saatinin farklı olması) durumuna özel <strong>"Bölgeye Özel Zaman Dilimi"</strong> altyapısı algoritmaya eklenmiş ve 3. Kat için test verisi girilmiştir. Canlı tabloda 3. Kat'a özel satırları görebilirsiniz.</p>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button disabled className="flex items-center gap-2 bg-gray-400 text-white px-6 py-2.5 rounded-lg font-medium cursor-not-allowed">
            <Save className="w-5 h-5" />
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
