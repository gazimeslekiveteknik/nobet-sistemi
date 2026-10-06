const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// 1. Update props
const oldProps = \`  appTimetable: Record<string, {start: string, end: string}>;
  setAppTimetable: (t: any) => void;
  onSave: () => void;
}\`;

const newProps = \`  appTimetable: Record<string, {start: string, end: string}>;
  setAppTimetable: (t: any) => void;
  telegramToken: string;
  setTelegramToken: (s: string) => void;
  telegramChatId: string;
  setTelegramChatId: (s: string) => void;
  onSave: () => void;
}\`;

code = code.replace(oldProps, newProps);

// 2. Update signature
const oldSig = "export function SettingsView({ appZones, setAppZones, appPeriods, setAppPeriods, appTimetable, setAppTimetable, onSave }: SettingsProps) {";
const newSig = "import { Send } from 'lucide-react';\\nexport function SettingsView({ appZones, setAppZones, appPeriods, setAppPeriods, appTimetable, setAppTimetable, telegramToken, setTelegramToken, telegramChatId, setTelegramChatId, onSave }: SettingsProps) {";
code = code.replace(oldSig, newSig);

// 3. Add telegram test logic
const testLogic = \`
  const testTelegram = async () => {
    if (!telegramToken) {
      alert("Lütfen önce Bot Token'ı girin.");
      return;
    }
    try {
      const res = await fetch(\\\`https://api.telegram.org/bot\${telegramToken}/getUpdates\\\`);
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        const chat = data.result[data.result.length - 1].message?.chat;
        if (chat) {
          setTelegramChatId(chat.id.toString());
          alert(\\\`Grup bulundu: \${chat.title || chat.first_name || 'Bilinmiyor'}. Chat ID: \${chat.id}\\\`);
        } else {
          alert("Gruptan son mesaj alınamadı. Lütfen gruba bir mesaj yazıp tekrar deneyin.");
        }
      } else {
        alert("Henüz bota bir mesaj gelmemiş. Lütfen Telegram grubunuza 'deneme' yazıp tekrar tıklayın.");
      }
    } catch (e) {
      alert("Bağlantı hatası: Telegram API'sine ulaşılamadı.");
    }
  };
\`;

code = code.replace("  const parseTime = (timeStr: string) => {", testLogic + "\\n  const parseTime = (timeStr: string) => {");

// 4. Add UI section before the save button block or at the end
const uiSection = \`
        {/* TELEGRAM ENTEGRASYONU */}
        <section className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Telegram Otomatik Bildirim Entegrasyonu</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Öğretmenler grubuna her nöbet saatinde otomatik bildirim gitmesi için Telegram Bot API bilgilerini girin. 
            Botfather'dan aldığınız Token'ı yapıştırın, gruba bir deneme mesajı yazın ve "Test Et ve Grubu Bul" butonuna basın.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telegram Bot Token</label>
              <input 
                type="text" 
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="Örn: 8079043852:AAFjL3..." 
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grup Chat ID (Otomatik Bulunur)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Test butonuna basınca dolar..." 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button 
                  onClick={testTelegram}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors"
                >
                  Grubu Bul
                </button>
              </div>
            </div>
          </div>
        </section>
\`;

code = code.replace("      <div className=\"p-8 space-y-12\">", "      <div className=\"p-8 space-y-12\">" + uiSection);

fs.writeFileSync('src/components/SettingsView.tsx', code);
