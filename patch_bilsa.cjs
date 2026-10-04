const fs = require('fs');
let code = fs.readFileSync('src/algorithm/bilsaParser.ts', 'utf8');

const oldLogic = \`      if (cellValue.toLowerCase().includes('adı soyadı:')) {
        let name = cellValue.split('Adı Soyadı:')[1]?.trim();
        // If it was split in different cells
        if (!name && row[colIndex + 1]) {
           name = String(row[colIndex + 1]).trim();
        }

        if (name) {\`;

const newLogic = \`      if (cellValue.toLowerCase().includes('adı soyadı')) {
        let name = '';
        const match = cellValue.match(/adı soyadı[:\s]*(.*)/i);
        if (match && match[1].trim()) {
           name = match[1].trim();
        }
        
        // If it was split in different cells
        if (!name) {
           for (let offset = 1; offset <= 4; offset++) {
              if (row[colIndex + offset] && String(row[colIndex + offset]).trim() !== '') {
                 name = String(row[colIndex + offset]).trim();
                 break;
              }
           }
        }

        if (name) {\`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/algorithm/bilsaParser.ts', code);
