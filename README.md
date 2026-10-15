# NöbetAI — 0.1.0

Öğretmen ders programlarından haftalık nöbet çizelgesi üretir. React/TypeScript yönetim ekranı, Firebase kayıtları, Telegram bildirimleri ve TV kiosk servisi içerir.

## Çalıştırma

```sh
npm ci
npm run dev
npm run build
npm test
npm run lint
```

`npm test` canlı Firebase veya Telegram kullanmadan planlama, izin, rotasyon, PDF/Excel sütunları, kayıt hataları ve servisleri sınar. `lint` uygulama, servis, ortak modül ve testleri denetler; kökteki eski tek seferlik `patch_*` / `fix_*` betikleri uygulamanın parçası değildir ve otomatik çalıştırılmamalıdır.

## Bu sürümde

- Yayımlanmış haftalar yüklenir; ekran açılması tek başına otomatik kayıt başlatmaz.
- Kısmi kayıtlar diğer üst seviye ayarları silmez. Kayıt başarısı sunucu/yerel olarak ayrılır; iki kayıt da başarısızsa hata gösterilir.
- Haftalar ISO pazartesi tarihiyle saklanır. Eski Türkçe hafta etiketleri okunmaya devam eder.
- Haftalık taslaklar ve günlük izinler kalıcıdır. Yayınlar öğretmen, ders, saat ve bölgeleriyle birlikte anlık kopya içerir.
- Yeniden optimizasyon geçerli manuel atamaları korur. Geçersiz manuel atamalar kaldırılır; eksik kadrolar ekranda belirtilir.
- Rotasyon yalnız aynı gün için aynı uygunluk profiline sahip roller arasında yapılır. Manuel roller sabit kalır.
- İzin değişimlerinde uygun yedek ve uygun karşı nöbet aranır. Yedek yoksa izinli öğretmen görevde bırakılmaz; boşluk bildirilir.
- Aynı veya çakışan saatlerde çift atama ve etkin olmayan bölgeye atama engellenir.
- Gelecek hafta yayını hedef haftanın planını ve PDF başlığını kullanır. Telegram seçeneği kapalıysa gönderim yapılmaz. Hatalı Telegram yanıtı başarı sayılmaz.
- PDF okuyucu ders numarası sütunlarını kullanır; belirsiz dosyalarda saat tahmin etmek yerine hata verir.
- TV servisi eşzamanlı bölgeleri birlikte gösterir. Yayınlanmamış taslakları canlı plan olarak sunmaz. Kiosk boş cevapta eski canlı listeyi temizler.

## Yayına almadan önce gereken yapılandırma

Bu çalışma canlı ortama dağıtım yapmaz ve mevcut Firebase kurallarını değiştirmez.

1. Zamanlanmış `/api/cron` çağrısına sunucu ortamında `CRON_SECRET` tanımlayın. İstek `Authorization: Bearer <secret>` başlığı taşımalıdır. Eksik ayar 503, yanlış kimlik 401 döndürür.
2. Sunucu bildirimlerinde `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` ortam değişkenleri desteklenir. Geçiş uyumluluğu için mevcut ayarlardaki değerler yedek olarak okunur.
3. Tekrarlanan mesajları önlemek için servis `notificationReceipts` koleksiyonuna kayıt oluşturur. Sunucunun bu koleksiyonda oluşturma ve başarısız gönderimde silme yetkisi gerekir. Bu yetkiyi herkese açık kurallarla vermeyin; üretimde sunucu kimliği ve uygun Firebase yetkilendirmesi kurun. İzin yoksa mesaj gönderilmez ve hata döner.
4. Mevcut yönetici şifresi yalnız ekran kilididir; gerçek kullanıcı kimlik doğrulaması değildir. Firebase Auth, sunucu kimliği ve Firestore güvenlik kurallarının birlikte devreye alınması gerekir. Tarayıcıdaki mevcut Telegram gönderimi bot anahtarını istemciye yükler; anahtarın tamamen sunucuya taşınması bu geçişle birlikte yapılmalıdır.
5. Sohbette veya Git bağlantı adresinde bulunan erişim anahtarlarını iptal edin. Yeni anahtarları kaynak dosyalarına veya Git bağlantı adresine yazmayın.

Telegram'a yapılan isteğin sonucu ağ kesintisi nedeniyle belirsiz kalırsa tekrar kaydı korunur; çift gönderim yerine manuel kontrol tercih edilir. Başarılı kayıtların temizlenmesi için sunucuda saklama politikası uygulanmalıdır.

## Bilinen sınırlar

- Canlı Firebase yetkileri ve Telegram teslimatı yerel testlerle doğrulanmaz.
- Ayarlar ve yayın arşivi hâlâ mevcut `settings/global` belgesindedir. Çok sayıda haftada belge büyüklüğü ve eşzamanlı çok kullanıcı düzenleme sınırları vardır; sonraki mimari aşama haftalık belgeler ve sürüm kontrollü kayıt olmalıdır.
- PDF yerleşimi değişebilir. Uygulama desteklemediği sütun düzenini reddeder; sonuçlar yayınlanmadan önce kontrol edilmelidir.
- Geçmiş toplam yük puanlarının otomatik dönem muhasebesi mevcut değildir. Rotasyon ve haftalık ağırlık dengesi uygulanır; kapsamlı geçmiş adalet raporu olarak yorumlanmamalıdır.
- Uzun izin dönüşü otomatik muafiyet kaldırmaz; mevcut yönetici kontrolü ve hatırlatma akışı korunmuştur.
- PDF/Excel araçlarının aynı pakette olması nedeniyle derlemede büyük paket uyarısı görülebilir.
- Eski Türkçe hafta anahtarlarında yıl yoktur. Yeni kayıtlar tarih anahtarı kullanır; eski kayıtların hangi yıla ait olduğu otomatik varsayılmaz.

TV ekranı kaynakları bu deponun üstündeki `tv-kiosk` klasöründedir ve ayrı yayımlanır.

## Tarayıcı senaryosu

Yerel sunucu 127.0.0.1:5173 üzerinde çalışırken `node tests/ui-smoke.cjs` çalıştırılabilir. Playwright kurulu olmalıdır; farklı konum için `PLAYWRIGHT_MODULE`, mevcut Chrome çalıştırılabilir dosyası için `CHROME_EXECUTABLE` kullanılabilir. Test, Firebase servisini sahte verilerle değiştirir ve yerel sunucu dışındaki ağ isteklerini engeller. Açılışta yazma yapılmaması, yayın kilidi, manuel atama ve gelecek hafta yayını doğrulanır.
