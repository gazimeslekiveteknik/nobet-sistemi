const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const weekStringCode = `
  const getWeekString = () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // First day is the day of the month - the day of the week
    const last = first + 4; // Friday
    
    const startDate = new Date(curr.setDate(first));
    const endDate = new Date(curr.setDate(last));
    
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    if (startDate.getMonth() === endDate.getMonth()) {
       return \`\${startDate.getDate()} - \${endDate.getDate()} \${months[startDate.getMonth()]} Haftası\`;
    } else {
       return \`\${startDate.getDate()} \${months[startDate.getMonth()]} - \${endDate.getDate()} \${months[endDate.getMonth()]} Haftası\`;
    }
  };

`;

code = code.replace("const daysList = [", weekStringCode + "  const daysList = [");

const titleOld = `<h1 className="text-3xl font-bold text-gray-900">Haftalık Nöbet Planı</h1>`;
const titleNew = `<h1 className="text-3xl font-bold text-gray-900">Nöbet Planı <span className="text-lg font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full ml-3 align-middle">{getWeekString()}</span></h1>`;

code = code.replace(titleOld, titleNew);

fs.writeFileSync('src/App.tsx', code);
