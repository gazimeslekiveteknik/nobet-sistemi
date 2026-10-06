export default async function handler(req, res) {
  try {
    const PROJECT_ID = 'nobetprogrami-764d6';
    
    // 1. Fetch settings from Firestore REST API
    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/global`;
    const settingsRes = await fetch(settingsUrl);
    const settingsData = await settingsRes.json();
    
    if (!settingsData.fields) {
      return res.status(200).json({ message: 'No settings found' });
    }
    
    // Helper to parse Firestore JSON
    const parseFirestore = (field) => {
      if (!field) return null;
      if (field.stringValue !== undefined) return field.stringValue;
      if (field.integerValue !== undefined) return Number(field.integerValue);
      if (field.booleanValue !== undefined) return field.booleanValue;
      if (field.arrayValue) return field.arrayValue.values ? field.arrayValue.values.map(parseFirestore) : [];
      if (field.mapValue) {
        const obj = {};
        for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
          obj[k] = parseFirestore(v);
        }
        return obj;
      }
      // If it's a JSON string saved as stringValue
      if (typeof field === 'string' && field.startsWith('{') || field.startsWith('[')) {
          try { return JSON.parse(field); } catch(e) {}
      }
      return field;
    };
    
    const settingsStr = parseFirestore(settingsData.fields.data);
    let settings = {};
    try {
       settings = JSON.parse(settingsStr);
    } catch(e) {
       return res.status(500).json({ error: 'Failed to parse settings' });
    }
    
    const telegramToken = settings.telegramToken;
    const telegramChatId = settings.telegramChatId;
    
    if (!telegramToken || !telegramChatId) {
       return res.status(200).json({ message: 'Telegram setup incomplete' });
    }
    
    // 2. Check current time in TRT (UTC+3)
    const now = new Date();
    // Add 3 hours for Turkey time if server is UTC (Vercel functions are UTC)
    const trtOffset = 3 * 60 * 60 * 1000;
    const trtDate = new Date(now.getTime() + trtOffset);
    
    const currentDay = trtDate.getDay(); // 0 = Sun, 1 = Mon ... 5 = Fri
    if (currentDay === 0 || currentDay === 6) {
       return res.status(200).json({ message: 'Hafta sonu' });
    }
    
    // Mesajların 5 dakika önce gitmesi için, şu anki saate 5 dakika EKLİYORUZ.
    // Örn: Saat 10:25 ise, +5 dk eklenip 10:30 yuvası aranır ve bulunur.
    const targetDate = new Date(trtDate.getTime() + 5 * 60 * 1000);
    
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    const targetTime = `${hours}:${minutes}`;
    
    // 3. Find matching slots (that START in exactly 5 minutes)
    const activeSlots = (settings.appSlots || []).filter(s => s.day === currentDay && s.startTime === targetTime);
    
    if (activeSlots.length === 0) {
       return res.status(200).json({ message: `No active slots starting at ${targetTime}` });
    }
    
    // 4. Find assignments for these slots
    const assignments = settings.lastScheduleAssignments || [];
    const teachers = settings.teachers || [];
    const zones = settings.appZones || [];
    
    let messageText = `🔔 *Nöbet Hatırlatması*\n*🕒 Teneffüs / Görev Saati:* ${targetTime}\n\n`;
    let foundAny = false;
    
    for (const slot of activeSlots) {
       // Group assignments by zone for this slot
       const slotAssignments = assignments.filter(a => a.slotId === slot.id);
       if (slotAssignments.length === 0) continue;
       
       const slotZoneMap = {};
       slotAssignments.forEach(a => {
           if (!slotZoneMap[a.zoneId]) slotZoneMap[a.zoneId] = [];
           const teacher = teachers.find(t => t.id === a.teacherId);
           if (teacher) slotZoneMap[a.zoneId].push(teacher.name);
       });
       
       const slotLabel = slot.type === 'OPENING' ? 'Açılış Nöbeti' : (slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : `${slot.afterLesson}. Ders Sonu`);
       messageText += `🕒 *${slotLabel}*\n`;
       
       for (const zoneId of Object.keys(slotZoneMap)) {
           const zone = zones.find(z => z.id === zoneId);
           const zoneName = zone ? zone.name : 'Bilinmeyen Bölge';
           messageText += `📍 *${zoneName}:* ${slotZoneMap[zoneId].join(', ')}\n`;
           foundAny = true;
       }
       messageText += `\n`;
    }
    
    if (!foundAny) {
       return res.status(200).json({ message: 'No assignments found for slot' });
    }
    
    // 5. Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const tgRes = await fetch(telegramUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           chat_id: telegramChatId,
           text: messageText,
           parse_mode: 'Markdown'
       })
    });
    
    const tgData = await tgRes.json();
    return res.status(200).json({ success: true, tgResponse: tgData });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
