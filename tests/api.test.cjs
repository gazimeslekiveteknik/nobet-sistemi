const {test}=require('node:test');
const assert=require('node:assert/strict');
const enc=value=> typeof value==='string'?{stringValue:value}:typeof value==='number'?{doubleValue:value}:typeof value==='boolean'?{booleanValue:value}:Array.isArray(value)?{arrayValue:{values:value.map(enc)}}:{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,enc(v)]))}};
const response=()=>({statusCode:200,body:null,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this},end(){return this}});
const fixture={appSlots:[{id:'a',day:1,type:'BREAK',startTime:'10:00',endTime:'10:15'},{id:'b',day:1,type:'BREAK',startTime:'10:00',endTime:'10:15'}],appZones:[{id:'z1',name:'A'},{id:'z2',name:'B'}],teachers:[{id:'t1',name:'A'},{id:'t2',name:'B'}],lastScheduleAssignments:[{slotId:'a',zoneId:'z1',teacherId:'t1'},{slotId:'b',zoneId:'z2',teacherId:'t2'}]};
async function publishedFixture() {
 const {weekKey,turkeyDate}=await import('../lib/time.js');const date=turkeyDate();if(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);
 return {...fixture,publishedWeeks:{[weekKey(date)]:{assignments:fixture.lastScheduleAssignments,teachers:fixture.teachers,slots:fixture.appSlots,zones:fixture.appZones}}};
}
test('Calendar handles Sunday, month and year boundaries',async()=> {
 const {weekKey,weekLabel}=await import('../lib/time.js');
 assert.equal(weekKey(new Date('2026-10-04T12:00:00Z')),'2026-09-28');
 assert.equal(weekLabel(new Date('2026-10-01T12:00:00Z')),'28 Eylül - 2 Ekim Haftası');
 assert.equal(weekKey(new Date('2027-01-01T12:00:00Z')),'2026-12-28');
});
test('Firestore decoder supports floating point weights',async()=> {const {parseFirestore}=await import('../lib/time.js');assert.equal(parseFirestore({doubleValue:1.5}),1.5)});
test('Kiosk returns every simultaneous region',async()=> {
 const {default:handler}=await import('../api/kiosk-duty.js'); const previous=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>enc(await publishedFixture()).mapValue});
 try{const res=response();await handler({method:'GET',query:{day:'1',time:'10:00'}},res);assert.equal(res.body.items.length,2)}finally{global.fetch=previous}
});
test('Kiosk rejects malformed time',async()=> {
 const {default:handler}=await import('../api/kiosk-duty.js');const previous=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>enc(await publishedFixture()).mapValue});
 try{for(const time of ['25:00','12:99','oops']){const res=response();await handler({method:'GET',query:{day:'1',time}},res);assert.equal(res.statusCode,400)}}finally{global.fetch=previous}
});
test('Kiosk returns empty on weekends',async()=> {
 const {default:handler}=await import('../api/kiosk-duty.js');const previous=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>enc(await publishedFixture()).mapValue});
 try{const res=response();await handler({method:'GET',query:{day:'0',time:'10:00'}},res);assert.deepEqual(res.body.items,[])}finally{global.fetch=previous}
});
test('Cron rejects unauthenticated requests before database access',async()=> {
 const {default:handler}=await import('../api/cron.js');const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-only';
 try{const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,401)}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous}
});
test('Cron fails closed when secret missing',async()=> {
 const {default:handler}=await import('../api/cron.js');const previous=process.env.CRON_SECRET;delete process.env.CRON_SECRET;
 try{const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,503)}finally{if(previous!==undefined)process.env.CRON_SECRET=previous}
});
test('Unpublished draft is never shown as a live plan',async()=> {
 const {default:handler}=await import('../api/kiosk-duty.js');const previous=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>enc(fixture).mapValue});
 try{const res=response();await handler({method:'GET',query:{day:'1',time:'10:00'}},res);assert.equal(res.body.status,'unpublished');assert.deepEqual(res.body.items,[])}finally{global.fetch=previous}
});
test('Notification receipt prevents duplicate Telegram delivery',async()=> {
 const {sendOnce}=await import('../lib/notifications.js'); const previous=global.fetch;let claimed=false,deliveries=0;
 global.fetch=async url=>{if(url.includes('api.telegram.org')){deliveries++;return {ok:true,json:async()=>({ok:true})}}if(claimed)return {ok:false,status:409};claimed=true;return {ok:true,status:200}};
 const args={settingsUrl:'https://example.test/documents/settings/global',token:'test',chatId:'test',dateKey:'2026-10-15T10:00',text:'Reminder'};
 try{assert.equal(await sendOnce(args),true);assert.equal(await sendOnce(args),false);assert.equal(deliveries,1)}finally{global.fetch=previous}
});
test('Telegram rejection releases receipt for retry',async()=> {
 const {sendOnce}=await import('../lib/notifications.js'); const previous=global.fetch;let released=false;
 global.fetch=async(url,options)=>{if(options.method==='DELETE')released=true;return url.includes('api.telegram.org')?{ok:false,json:async()=>({ok:false})}:{ok:true,status:200}};
 try{await assert.rejects(sendOnce({settingsUrl:'https://example.test/documents/settings/global',token:'test',chatId:'test',dateKey:'x',text:'test'}));assert.equal(released,true)}finally{global.fetch=previous}
});
test('Cron sends reminders from saved template when no publication exists',async()=> {
 const {default:handler}=await import('../api/cron.js');
 const RealDate=global.Date, previousFetch=global.fetch, previousSecret=process.env.CRON_SECRET;
 const sent=[];
 global.Date=class extends RealDate {constructor(...args){super(...(args.length?args:['2026-10-12T06:55:00Z']))}static now(){return new RealDate('2026-10-12T06:55:00Z').getTime()}};
 process.env.CRON_SECRET='test-only';
 global.fetch=async(url,options)=>{
  if(url.includes('api.telegram.org')){sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})}}
  if(options?.method==='POST')return {ok:true,status:200};
  return {ok:true,json:async()=>enc({...fixture,telegramToken:'test',telegramChatId:'test'}).mapValue};
 };
 try{const res=response();await handler({method:'GET',headers:{authorization:'Bearer test-only'}},res);
 assert.equal(res.statusCode,200);assert.equal(sent.length,1);assert.match(sent[0].text,/10:00/);assert.match(sent[0].text,/A/);assert.match(sent[0].text,/B/);
 }finally{global.Date=RealDate;global.fetch=previousFetch;if(previousSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previousSecret}
});
test('Cron does not send between reminder times or on weekends',async()=> {
 const {default:handler}=await import('../api/cron.js');
 const RealDate=global.Date, previousFetch=global.fetch, previousSecret=process.env.CRON_SECRET;
 let sent=0;process.env.CRON_SECRET='test-only';
 global.fetch=async(url)=>{if(url.includes('api.telegram.org'))sent++;return {ok:true,json:async()=>enc({...fixture,telegramToken:'test',telegramChatId:'test'}).mapValue}};
 try{for(const time of ['2026-10-12T07:00:00Z','2026-10-17T06:55:00Z']){
 global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[time]))}};
 const res=response();await handler({method:'GET',headers:{authorization:'Bearer test-only'}},res);assert.equal(res.statusCode,200);
 }assert.equal(sent,0);
 }finally{global.Date=RealDate;global.fetch=previousFetch;if(previousSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previousSecret}
});
