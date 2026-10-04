const xlsx = require('xlsx');
const wb = xlsx.readFile('../öğretmen el programı deneme.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<30; i++) {
   console.log(\`Row \${i}:\`, data[i]);
}
