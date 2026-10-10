export default async function handler(req, res) {
  // Enable CORS so the TV Kiosk can fetch from any domain/local file
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const PROJECT_ID = 'nobetprogrami-764d6';
    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/global`;
    const settingsRes = await fetch(settingsUrl);
    const settingsData = await settingsRes.json();

    if (!settingsData.fields) {
      return res.status(200).json({ status: 'empty', items: [], message: 'No settings in database' });
    }

    const parseFirestore = (field) => {
      if (!field) return null;
      if (field.stringValue !== undefined) return field.stringValue;
      if (field.integerValue !== undefined) return Number(field.integerValue);
      if (field.booleanValue !== undefined) return field.booleanValue;
      if (field.arrayValue) return field.arrayValue.values ? field.arrayValue.values.map(parseFirestore) : [];
      if (field.mapValue) {
        const obj = {};
        for (const [k, v] of Object.entries(field.mapValue.fields || {})) obj[k] = parseFirestore(v);
        return obj;
      }
      return field;
    };

    const settings = parseFirestore({ mapValue: { fields: settingsData.fields } });
    const assignments = settings.lastScheduleAssignments || [];
    const teachers = settings.teachers || [];
    const zones = settings.appZones || [];
    const slots = settings.appSlots || [];

    // Current time in Turkey (UTC+3)
    const now = new Date();
    const trtOffset = 3 * 60 * 60 * 1000;
    const trtDate = new Date(now.getTime() + trtOffset);

    const currentDay = 1; // 🚨 TEST MODE FORCED TO MONDAY
    const currentMins = (10 * 60) + 30; // 🚨 TEST MODE FORCED TO 10:30

    const timeToMins = (tStr) => {
      if (!tStr || !tStr.includes(':')) return 0;
      const [h, m] = tStr.split(':').map(Number);
      return (h * 60) + m;
    };

    // Filter today's slots (Mon-Fri)
    const todaySlots = slots.filter(s => s.day === currentDay);

    if (todaySlots.length === 0 || currentDay === 0 || currentDay === 6) {
      return res.status(200).json({
        status: 'weekend_or_empty',
        day: currentDay,
        time: `${String(trtDate.getHours()).padStart(2, '0')}:${String(trtDate.getMinutes()).padStart(2, '0')}`,
        slotInfo: 'Hafta sonu veya plan bulunamadı',
        items: []
      });
    }

    // Sort today's slots chronologically
    todaySlots.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

    // KURAL (USER İSTEĞİ):
    // 1. Bir slotun ekranda görünme başlangıcı: slot.startTime - 5 dk (Telegram mesajının atıldığı tam an!)
    // 2. Bir slotun ekranda kalma bitişi: Bir sonraki slotun başlangıcından 5 dk öncesine kadar!
    //    (Örnek: 1. teneffüs bittikten sonra 2. ders boyunca ekranda kalmaya devam eder, ta ki 2. teneffüse 5 dk kalana kadar!)
    // 3. Günün ilk slotundan önceki saatlerde (sabah erkenden): İlk slot (Açılış) gösterilir.
    // 4. Günün son slotu (Kapanış): Günün sonuna kadar ekranda kalır.

    let selectedSlot = null;
    let slotStatus = 'normal';

    for (let i = 0; i < todaySlots.length; i++) {
      const slot = todaySlots[i];
      const slotThreshold = timeToMins(slot.startTime) - 5; // Teneffüse 5 dk kala geçiş anı
      
      const nextSlot = todaySlots[i + 1];
      const nextThreshold = nextSlot ? (timeToMins(nextSlot.startTime) - 5) : 24 * 60; // Bir sonrakine 5 dk kalana kadar

      // Eğer sabah ilk slotun 5 dk öncesinden daha erkense, ilk slotu göster
      if (i === 0 && currentMins < slotThreshold) {
        selectedSlot = slot;
        slotStatus = 'morning_preview';
        break;
      }

      // Aktif aralık: Bu slotun 5 dk öncesi ile sonraki slotun 5 dk öncesi arası
      if (currentMins >= slotThreshold && currentMins < nextThreshold) {
        selectedSlot = slot;
        slotStatus = currentMins <= (timeToMins(slot.endTime) + 5) ? 'active_duty' : 'lesson_continuation';
        break;
      }
    }

    // Güvenlik yedeği (eğer bir şekilde seçilmediyse son slot)
    if (!selectedSlot && todaySlots.length > 0) {
      selectedSlot = todaySlots[todaySlots.length - 1];
      slotStatus = 'day_end';
    }

    if (!selectedSlot) {
      return res.status(200).json({ status: 'no_slot', items: [] });
    }

    // Get assignments for this slot
    const slotAssignments = assignments.filter(a => a.slotId === selectedSlot.id);

    // Group by zone
    const zoneMap = {};
    slotAssignments.forEach(a => {
      const teacher = teachers.find(t => t.id === a.teacherId);
      if (!teacher) return;
      const zone = zones.find(z => z.id === a.zoneId);
      const zoneName = zone ? zone.name : 'Genel';

      if (!zoneMap[zoneName]) zoneMap[zoneName] = [];
      if (!zoneMap[zoneName].includes(teacher.name)) {
        zoneMap[zoneName].push(teacher.name);
      }
    });

    // Format directly for Kiosk: [{ name: "Dilek Kılıç", loc: "Bahçe" }]
    const items = [];
    Object.keys(zoneMap).forEach(loc => {
      items.push({
        name: zoneMap[loc].join(' & '),
        loc: loc
      });
    });

    const slotLabel = selectedSlot.type === 'OPENING' 
      ? 'Açılış Nöbeti' 
      : (selectedSlot.type === 'CLOSING' ? 'Kapanış Nöbeti' : `${selectedSlot.afterLesson || ''}. Ders Sonu`);

    return res.status(200).json({
      status: 'ok',
      slotStatus,
      slotLabel,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      currentTime: `${String(trtDate.getHours()).padStart(2, '0')}:${String(trtDate.getMinutes()).padStart(2, '0')}`,
      items
    });

  } catch (error) {
    console.error('Kiosk API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
