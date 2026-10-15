import { sendOnce } from '../lib/notifications.js';
import { turkeyDate, publishedPlan, parseFirestore } from '../lib/time.js';
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET yapılandırılmalı.' });
  if (req.headers?.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const PROJECT_ID = 'nobetprogrami-764d6';
    
    // 1. Fetch settings
    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/global`;
    const settingsRes = await fetch(settingsUrl);
    if (!settingsRes.ok) throw new Error(`Veritabanı okunamadı (${settingsRes.status}).`);
    const settingsData = await settingsRes.json();
    
    if (!settingsData.fields) return res.status(200).json({ message: 'No settings found' });
    
    const settings = parseFirestore({ mapValue: { fields: settingsData.fields } });
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || settings.telegramToken;
    

    
    // 2. Time Logic
    const trtDate = turkeyDate();
    
    const currentDay = trtDate.getUTCDay(); // 0=Sun..6=Sat
    const hoursStr = String(trtDate.getUTCHours()).padStart(2, '0');
    const minsStr = String(trtDate.getUTCMinutes()).padStart(2, '0');
    const currentTime = `${hoursStr}:${minsStr}`;

    let assignments = settings.lastScheduleAssignments || [];
    let teachers = settings.teachers || [];
    let zones = settings.appZones || [];
    let slots = settings.appSlots || [];
    const publicationDate = new Date(trtDate);
    if (publicationDate.getUTCDay() === 0) publicationDate.setUTCDate(publicationDate.getUTCDate() + 1);
    const pub = publishedPlan(settings, publicationDate);
    if (pub) {
      assignments = pub.assignments || [];
      teachers = pub.teachers || [];
      zones = pub.zones || zones;
      slots = pub.slots || slots;
    }

    const telegramChatId = process.env.TELEGRAM_CHAT_ID || settings.telegramChatId;
    if (!telegramToken || !telegramChatId) return res.status(200).json({ message: 'Telegram setup incomplete' });
    
    
    


    const sendTg = (text) => sendOnce({ settingsUrl, token: telegramToken, chatId: telegramChatId,
      dateKey: trtDate.toISOString().slice(0, 16), text });

    let didSomething = false;

    // --- FEATURE 1: TOMORROW OPENING REMINDER AT 18:00 ---
    // Runs on Sunday(0), Mon(1), Tue(2), Wed(3), Thu(4)
    if (currentTime === '18:00' && currentDay >= 0 && currentDay <= 4) {
       const nextDay = currentDay === 0 ? 1 : currentDay + 1; // Sun->Mon, Mon->Tue...
       const openingSlots = slots.filter(s => s.day === nextDay && s.type === 'OPENING');
       
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
               didSomething = await sendTg(msg) || didSomething;
           }
       }
    }

    // --- FEATURE 2: 5-MIN EARLY NORMAL BREAK REMINDER ---
    // Only runs Mon-Fri
    if (currentDay >= 1 && currentDay <= 5) {
        const targetDate = new Date(trtDate.getTime() + 5 * 60 * 1000);
        const targetTime = `${String(targetDate.getUTCHours()).padStart(2, '0')}:${String(targetDate.getUTCMinutes()).padStart(2, '0')}`;
        
        const activeSlots = slots.filter(s => s.day === currentDay && s.startTime === targetTime);
        
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
                didSomething = await sendTg(msg) || didSomething;
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
           didSomething = await sendTg(msg) || didSomething;
       }
    }

    return res.status(200).json({ message: didSomething ? 'Messages sent' : 'No action needed at this time' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
