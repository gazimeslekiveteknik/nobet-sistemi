export const turkeyDate = (date = new Date()) => new Date(date.getTime() + 3 * 3600000);
export function weekKey(date) {
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
export function weekLabel(date) {
  const monday = new Date(weekKey(date) + 'T12:00:00Z');
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return monday.getUTCMonth() === friday.getUTCMonth()
    ? `${monday.getUTCDate()} - ${friday.getUTCDate()} ${months[monday.getUTCMonth()]} Haftası`
    : `${monday.getUTCDate()} ${months[monday.getUTCMonth()]} - ${friday.getUTCDate()} ${months[friday.getUTCMonth()]} Haftası`;
}
export function publishedPlan(settings, date) {
  return settings.publishedWeeks?.[weekKey(date)] || settings.publishedWeeks?.[weekLabel(date)];
}
export function parseFirestore(field) {
  if (!field || field.nullValue !== undefined) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.arrayValue) return (field.arrayValue.values || []).map(parseFirestore);
  if (field.mapValue) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, parseFirestore(value)]));
  return null;
}
