const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const date=new Date();date.setDate(date.getDate()-((date.getDay()+6)%7));const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const teachers=['A','B'].map(id=>({id,name:'Teacher '+id,branch:'Test',isExcluded:false,historyStats:{totalScore:0,zoneCounts:{}}}));
 const slots=[{id:'o',day:1,type:'OPENING',startTime:'08:40',endTime:'09:00'}];
 const zones=[{id:'z',name:'Bahçe',priority:1,minStaff:1,idealStaff:1,riskMultiplier:1}];
 const lessons=teachers.map(t=>({id:t.id,teacherId:t.id,day:1,period:1,className:'10A'}));
 const assignments=[{id:'a',teacherId:'A',slotId:'o',zoneId:'z',isManual:true}];
 const fixture={teachers,lessons,appSlots:slots,appZones:zones,lastScheduleAssignments:assignments,baseWeekStart:key,publishedWeeks:{[key]:{teachers,lessons,slots,zones,assignments}}};
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(!url.startsWith('http://127.0.0.1:5173'))return route.abort();
  if(url.includes('/src/firebase/service.ts'))return route.fulfill({contentType:'application/javascript',body:`export const FirebaseService={loadSettings:async()=>(${JSON.stringify(fixture)}),saveSettings:async(s)=>{window.__saved=s;window.__saves=(window.__saves||0)+1;return {synced:true}}};`});
  return route.continue();
 });
 await page.goto('http://127.0.0.1:5173');await page.getByText('Teacher A',{exact:true}).waitFor();
 await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>window.__saves||0),0,'Opening must not write to server');
 await page.getByRole('button',{name:'🔒 Plan Kilitli (Korumada)'}).click();
 await page.getByRole('button',{name:'Yeniden Optimize Et'}).click();
 await page.waitForTimeout(1700);assert.ok(await page.evaluate(()=>window.__saved.publishedWeeks));
 assert.equal(await page.evaluate(()=>window.__saved.draftWeeks[Object.keys(window.__saved.draftWeeks)[0]].assignments[0].isManual),true);
 await page.getByRole('button',{name:'Programı Yayınla (Kilitle)'}).click();
 await page.getByRole('checkbox').uncheck();
 page.on('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Gelecek Hafta Pazartesi'}).click();
 await page.waitForTimeout(200);
 const published=await page.evaluate(()=>window.__saved.publishedWeeks);assert.equal(Object.keys(published).length,2);
 for(const record of Object.values(published)){assert.ok(record.slots);assert.ok(record.zones)}
 assert.deepEqual(errors,[]);console.log('UI PASS: load without save, published lock, preserve manual optimization, next-week publication without Telegram, immutable slots/zones.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
