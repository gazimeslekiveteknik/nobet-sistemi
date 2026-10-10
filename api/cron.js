export default async function handler(req, res) {
  try {
    const PROJECT_ID = 'nobetprogrami-764d6';
    
    // 1. Fetch settings
    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/global`;
    const settingsRes = await fetch(settingsUrl);
    const settingsData = await settingsRes.json();
    
    if (!settingsData.fields) return res.status(200).json({ message: 'No settings found' });
    
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
    const telegramToken = settings.telegramToken;
    

    
    const getWeekString = (dateObj) => {
      const curr = new Date(dateObj);
      const first = curr.getDate() - curr.getDay() + 1;
      const last = first + 4;
      const startDate = new Date(curr.setDate(first));
      const endDate = new Date(curr.setDate(last));
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      if (startDate.getMonth() === endDate.getMonth()) {
         return `${startDate.getDate()} - ${endDate.getDate()} ${months[startDate.getMonth()]} Haftası`;
      }
      return `${startDate.getDate()} ${months[startDate.getMonth()]} - ${endDate.getDate()} ${months[endDate.getMonth()]} Haftası`;
    };

    // 2. Time Logic
    const now = new Date();
    const trtOffset = 3 * 60 * 60 * 1000;
    const trtDate = new Date(now.getTime() + trtOffset);
    
    const currentDay = trtDate.getDay(); // 0=Sun..6=Sat
    const hoursStr = String(trtDate.getHours()).padStart(2, '0');
    const minsStr = String(trtDate.getMinutes()).padStart(2, '0');
    const currentTime = `${hoursStr}:${minsStr}`;

    const currentWeekStr = getWeekString(trtDate);
    if (settings.publishedWeeks && settings.publishedWeeks[currentWeekStr]) {
       const pub = settings.publishedWeeks[currentWeekStr];
       if (pub.assignments) assignments = pub.assignments;
       if (pub.teachers) teachers = pub.teachers;
    }
    const telegramChatId = settings.telegramChatId;
    if (!telegramToken || !telegramChatId) return res.status(200).json({ message: 'Telegram setup incomplete' });
    
    
    
    const assignments = settings.lastScheduleAssignments || [];
    const teachers = settings.teachers || [];
    const zones = settings.appZones || [];

    const sendTg = async (text) => {
        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        await fetch(telegramUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'Markdown' })
        });
    };

    let didSomething = false;

    // --- FEATURE 1: TOMORROW OPENING REMINDER AT 18:00 ---
    // Runs on Sunday(0), Mon(1), Tue(2), Wed(3), Thu(4)
    if (currentTime === '18:00' && currentDay >= 0 && currentDay <= 4) {
       const nextDay = currentDay === 0 ? 1 : currentDay + 1; // Sun->Mon, Mon->Tue...
       const openingSlots = (settings.appSlots || []).filter(s => s.day === nextDay && s.type === 'OPENING');
       
       if (openingSlots.length > 0) {
           let msg = `🌅 *Yarının Açılış Nöbetçileri Dikkatine*\n\nYarın sabah ilk ders zilinden önce açılış nöbeti görevleriniz bulunmaktadır. Nöbet yerinize *20 dakika erken* geçmeniz önemle rica olunur.\n\n`;
           
           let hasOpening = false;
           for (const slot of openingSlots) {
               const slotAssignments = assignments.filter(a => a.slotId === slot.id);
               if (slotAssignments.length === 0) continue;
               
               const slotZoneMap = {};
               slotAssignments.forEach(a => {
                   if (!slotZoneMap[a.zoneId]) slotZoneMap[a.zoneId] = [];
                   const teacher = teachers.find(t => t.id === a.teacherId);
                   if (teacher) slotZoneMap[a.zoneId].push(teacher.name);
               });
               
               for (const zoneId of Object.keys(slotZoneMap)) {
                   const zone = zones.find(z => z.id === zoneId);
                   const zoneName = zone ? zone.name : 'Bilinmeyen Bölge';
                   msg += `📍 *${zoneName}:* ${slotZoneMap[zoneId].join(', ')}\n`;
                   hasOpening = true;
               }
           }
           
           if (hasOpening) {
               msg += `\nHayırlı akşamlar dileriz.`;
               await sendTg(msg);
               didSomething = true;
           }
       }
    }

    // --- FEATURE 2: 5-MIN EARLY NORMAL BREAK REMINDER ---
    // Only runs Mon-Fri
    if (currentDay >= 1 && currentDay <= 5) {
        const targetDate = new Date(trtDate.getTime() + 5 * 60 * 1000);
        const targetTime = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
        
        const activeSlots = (settings.appSlots || []).filter(s => s.day === currentDay && s.startTime === targetTime);
        
        if (activeSlots.length > 0) {
            let msg = `🔔 *Nöbet Hatırlatması*\n*🕒 Görev Saati:* ${targetTime}\n\n`;
            let hasDuty = false;
            
            for (const slot of activeSlots) {
               const slotAssignments = assignments.filter(a => a.slotId === slot.id);
               if (slotAssignments.length === 0) continue;
               
               const slotZoneMap = {};
               slotAssignments.forEach(a => {
                   if (!slotZoneMap[a.zoneId]) slotZoneMap[a.zoneId] = [];
                   const teacher = teachers.find(t => t.id === a.teacherId);
                   if (teacher) slotZoneMap[a.zoneId].push(teacher.name);
               });
               
               const slotLabel = slot.type === 'OPENING' ? 'Açılış Nöbeti' : (slot.type === 'CLOSING' ? 'Kapanış Nöbeti' : `${slot.afterLesson}. Ders Sonu`);
               msg += `🕒 *${slotLabel}*\n`;
               
               for (const zoneId of Object.keys(slotZoneMap)) {
                   const zone = zones.find(z => z.id === zoneId);
                   const zoneName = zone ? zone.name : 'Bilinmeyen Bölge';
                   msg += `📍 *${zoneName}:* ${slotZoneMap[zoneId].join(', ')}\n`;
                   hasDuty = true;
               }
               msg += `\n`;
            }
            
            if (hasDuty) {
                await sendTg(msg);
                didSomething = true;
            }
        }
    }
    
    
    // --- FEATURE 3: RETURN FROM LONG LEAVE REMINDER ---
    // Check if any teacher's excludedUntil is tomorrow. Run this check daily at 16:00
    if (currentTime === '16:00') {
       const tomorrow = new Date(trtDate.getTime() + 24 * 60 * 60 * 1000);
       const tomorrowStr = tomorrow.toISOString().split('T')[0];
       
       const returningTeachers = (settings.teachers || []).filter(t => t.isExcluded && t.excludedUntil === tomorrowStr);
       if (returningTeachers.length > 0) {
           const names = returningTeachers.map(t => t.name).join(', ');
           const msg = `ℹ️ *Sistem Hatırlatması*\n\n${names} isimli öğretmenlerimizin izin süresi yarın itibarıyla dolmaktadır.\n\nYönetici paneline giriş yapıp şablon programı kontrol etmeyi ve gerekirse 'Yeniden Optimize Et' butonu ile güncellemeyi unutmayınız.`;
           await sendTg(msg);
           didSomething = true;
       }
    }

    return res.status(200).json({ message: didSomething ? 'Messages sent' : 'No action needed at this time' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
