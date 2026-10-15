import { createHash } from 'node:crypto';

// A Firestore document claims each message before sending, across server instances.
// Claims are retained after success; failed Telegram responses release the claim.
export async function sendOnce({ settingsUrl, token, chatId, dateKey, text }) {
  const id = createHash('sha256').update(`${chatId}|${dateKey}|${text}`).digest('hex');
  const root = settingsUrl.slice(0, settingsUrl.lastIndexOf('/settings/global'));
  const collection = `${root}/notificationReceipts`;
  const claim = await fetch(`${collection}?documentId=${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { createdAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (claim.status === 409) return false;
  if (!claim.ok) throw new Error('Bildirim tekrar kontrolü kaydedilemedi; veritabanı izinlerini kontrol edin.');
  // Network ambiguity retains the claim: Telegram may already have delivered it.
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      await fetch(`${collection}/${id}`, { method: 'DELETE' });
      throw new Error('Telegram mesajı gönderilemedi.');
    }
    return true;
}
