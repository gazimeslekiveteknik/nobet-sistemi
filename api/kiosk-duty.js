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

    const currentDay = trtDate.getDay(); // 0=Pazar, 1=Pzt, ..., 5=Cuma, 6=Cmt
    const currentMins = (trtDate.getHours() * 60) + trtDate.getMinutes();

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

    // Determine target slot:
    // 1. Is there an active slot right now? (startTime - 5 mins <= currentMins <= endTime + 5 mins)
    // 2. If not, pick the NEXT upcoming slot today.
    // 3. If school day ended, show the last slot of today.
    let selectedSlot = null;
    let slotStatus = 'upcoming';

    for (const slot of todaySlots) {
      const sStart = timeToMins(slot.startTime);
      const sEnd = timeToMins(slot.endTime);

      // Active interval: Starts showing 5 mins before start, lasts until 5 mins after end
      if (currentMins >= (sStart - 5) && currentMins <= (sEnd + 5)) {
        selectedSlot = slot;
        slotStatus = 'active';
        break;
      }
    }

    if (!selectedSlot) {
      // Find next upcoming slot today
      for (const slot of todaySlots) {
        const sStart = timeToMins(slot.startTime);
        if (sStart > currentMins) {
          selectedSlot = slot;
          slotStatus = 'next';
          break;
        }
      }
    }

    // If still none, all slots today have passed -> show the last slot
    if (!selectedSlot && todaySlots.length > 0) {
      selectedSlot = todaySlots[todaySlots.length - 1];
      slotStatus = 'passed';
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
