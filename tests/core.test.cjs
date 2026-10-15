const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}, cache = {}) {
  const name = path.resolve(__dirname, '..', file);
  if (cache[name]) return cache[name].exports;
  const module = { exports: {} }; cache[name] = module;
  const source = ts.transpileModule(fs.readFileSync(name, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require','module','exports',source)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(name), id + '.ts')), mocks, cache);
    return require(id);
  }, module, module.exports);
  return module.exports;
}
const { generateSchedule, rotateSchedule } = load('src/algorithm/scheduler.ts');
const { calculateAvailability } = load('src/algorithm/availability.ts');
const { assignmentProblem, validateSchedule } = load('src/algorithm/validation.ts');
const { replaceDailyLeave } = load('src/algorithm/leave.ts');
const { readPeriodColumns, lessonsInRow } = load('src/algorithm/pdfGrid.ts');
const teacher = id => ({ id, name:id, isExcluded:false, historyStats:{ totalScore:0, zoneCounts:{} } });
const teachers = ['A','B','C'].map(teacher);
const zone = {id:'z',name:'Bahçe',priority:1,minStaff:1,idealStaff:1,riskMultiplier:1};
const opening = {id:'open',day:1,type:'OPENING',startTime:'08:40',endTime:'09:00'};
const closing = {id:'close',day:1,type:'CLOSING',afterLesson:8,startTime:'16:00',endTime:'16:20'};
const lesson = (teacherId,period,day=1) => ({id:`${teacherId}_${period}_${day}`, teacherId,period,day,className:'10A'});
const assignment = (teacherId,slotId,id=teacherId+slotId,isManual=false) => ({id,teacherId,slotId,zoneId:'z',isManual});

test('Opening requires first lesson, not second',()=> {
 assert.equal(calculateAvailability(teachers,[lesson('A',2)],[opening]).A.open.canDuty,false);
});
test('No lessons that day means unavailable',()=>assert.equal(calculateAvailability(teachers,[],[opening]).B.open.canDuty,false));
test('Excluded teacher cannot receive duty',()=>assert.equal(generateSchedule([{...teacher('A'),isExcluded:true}],[lesson('A',1)],[opening],[zone]).assignments.length,0));
test('Manual assignment preserved',()=>assert.equal(generateSchedule(teachers,[lesson('A',1),lesson('B',1)],[opening],[zone],[assignment('B','open','manual',true)]).assignments[0].id,'manual'));
test('Invalid manual assignment removed and explained',()=> {
 const result=generateSchedule(teachers,[lesson('A',1)],[opening],[zone],[assignment('B','open','bad',true)]);
 assert.equal(result.assignments.some(a=>a.teacherId==='B'),false); assert.ok(result.warnings.length);
});
test('Overlapping distinct slots cannot double-book a teacher',()=> {
 const slots=[opening,{...opening,id:'other',startTime:'08:50',endTime:'09:10'}];
 assert.equal(generateSchedule([teacher('A')],[lesson('A',1)],slots,[zone]).assignments.length,1);
});
test('Minimum staff honored for opening duties',()=>assert.equal(generateSchedule(teachers,teachers.map(t=>lesson(t.id,1)),[opening],[{...zone,minStaff:2,idealStaff:2}]).assignments.length,2));
test('Rotating teachers with different hours preserves availability',()=> {
 const lessons=[lesson('A',1),lesson('B',8)]; const slots=[opening,closing];
 const rotated=rotateSchedule([assignment('A','open'),assignment('B','close')],1,slots,[zone],teachers,lessons);
 assert.deepEqual(validateSchedule(rotated,teachers,lessons,slots,[zone]),[]);
});
test('Compatible roles rotate, including negative offsets',()=> {
 const slots=[opening,closing],lessons=teachers.flatMap(t=>[lesson(t.id,1),lesson(t.id,8)]);
 const base=[assignment('A','open'),assignment('B','close')];
 for(const offset of [-3,-1,1,3]) { const rotated=rotateSchedule(base,offset,slots,[zone],teachers,lessons); assert.equal(rotated.find(a=>a.slotId==='open').teacherId,'B'); assert.deepEqual(validateSchedule(rotated,teachers,lessons,slots,[zone]),[]); }
});
test('Manual role stays fixed in rotation',()=> {
 const lessons=teachers.flatMap(t=>[lesson(t.id,1),lesson(t.id,8)]);
 assert.equal(rotateSchedule([assignment('A','open','manual',true),assignment('B','close')],1,[opening,closing],[zone],teachers,lessons).find(a=>a.slotId==='open').teacherId,'A');
});
test('Manual duplicate or inactive region rejected',()=> {
 const a=assignment('A','open'); assert.ok(assignmentProblem({...a,id:'another'},[a],teachers,[lesson('A',1)],[opening],[zone]));
 assert.ok(assignmentProblem(a,[],teachers,[lesson('A',1)],[opening],[{...zone,activeSlotTypes:['BREAK']}]));
});
test('Leave selects only teachers who are present and eligible',()=> {
 const result=replaceDailyLeave('A',1,[assignment('A','open')],teachers,[lesson('A',1),lesson('B',8),lesson('C',1)],[opening],[zone]);
 assert.equal(result.assignments[0].teacherId,'C');
});
test('Leave without replacement clears absent teacher and reports vacancy',()=> {
 const result=replaceDailyLeave('A',1,[assignment('A','open')],teachers,[lesson('A',1)],[opening],[zone]);
 assert.equal(result.assignments.length,0); assert.match(result.logs[0],/boş/);
});
test('Leave does not exchange an ineligible future duty',()=> {
 const later={...closing,id:'later',day:2};
 const result=replaceDailyLeave('A',1,[assignment('A','open'),assignment('B','later')],teachers,[lesson('A',1),lesson('B',1),lesson('B',8,2)],[opening,later],[zone]);
 assert.equal(result.assignments.find(a=>a.slotId==='later').teacherId,'B');
});
test('Schedule output deterministic for same inputs',()=> {
 const input=[teachers,teachers.map(t=>lesson(t.id,1)),[opening],[zone]];
 assert.deepEqual(generateSchedule(...input),generateSchedule(...input));
});
const cell=(str,x,y=700)=>({str,transform:[1,0,0,1,x,y]});
test('PDF preserves empty first two periods',()=> {
 const columns=readPeriodColumns([cell('1',110),cell('2',160),cell('3',210),cell('4',260)]);
 assert.equal(lessonsInRow([cell('10A',210,600)],columns)[0].period,3);
});
test('PDF combines multiple lines in same period',()=> {
 const columns=readPeriodColumns([cell('1',110),cell('2',160),cell('3',210)]);
 assert.equal(lessonsInRow([cell('10A',160,600),cell('MAT',160,590)],columns).length,1);
});
test('Ambiguous PDF columns fail instead of inventing periods',()=>assert.throws(()=>readPeriodColumns([cell('10A',110)])));
test('Excel with names but no lessons fails',()=> {
 const XLSX=require('xlsx');const {parseBilsaExcel}=load('src/algorithm/bilsaParser.ts');
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Adı Soyadı: Test']]));assert.throws(()=>parseBilsaExcel(book));
});
test('Excel keeps blank periods',()=> {
 const XLSX=require('xlsx');const {parseBilsaExcel}=load('src/algorithm/bilsaParser.ts');
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Adı Soyadı: Test'],['Pazartesi',null,null,'10A']]));assert.equal(parseBilsaExcel(book).lessons[0].period,3);
});

function serviceHarness({remote={}, failRemote=false, failLocal=false}={}) {
 const memory=new Map();let remoteData={...remote};
 global.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>{if(failLocal)throw Error('quota');memory.set(key,value)}};
 const mock={doc:(_, ...parts)=>parts.join('/'),getDoc:async()=>{if(failRemote)throw Error('offline');return {exists:()=>true,data:()=>remoteData}},setDoc:async(_,value,options)=>{if(failRemote)throw Error('offline');remoteData=options?.mergeFields?{...remoteData,...value}:value;}};
 const {FirebaseService}=load('src/firebase/service.ts',{'firebase/firestore':mock,'./config':{db:{}}});
 return {service:FirebaseService,memory,getRemote:()=>remoteData};
}
test('Partial settings save preserves unrelated fields',async()=> {
 const h=serviceHarness({remote:{teachers:['A'],telegramChatId:'test'}});
 await h.service.saveSettings({publishedWeeks:{week:{assignments:[]}}}); assert.deepEqual(h.getRemote().teachers,['A']);
});
test('Offline save reports local-only and preserves unsynced edits on load',async()=> {
 const h=serviceHarness({failRemote:true}); const old=console.warn;console.warn=()=>{};
 try {assert.equal((await h.service.saveSettings({teachers:['new']})).synced,false);assert.deepEqual((await h.service.loadSettings()).teachers,['new']);}finally{console.warn=old}
});
test('Failure of both stores is surfaced',async()=> {
 const h=serviceHarness({failRemote:true,failLocal:true});await assert.rejects(h.service.saveSettings({teachers:[]}));
});
test('Missing remote and local data does not silently use defaults after read failure',async()=> {
 const h=serviceHarness({failRemote:true});await assert.rejects(h.service.loadSettings());
});
test('Published archive loaded intact',async()=> {
 const h=serviceHarness({remote:{publishedWeeks:{'2026-10-12':{assignments:['saved']}}}});assert.ok((await h.service.loadSettings()).publishedWeeks['2026-10-12']);
});
