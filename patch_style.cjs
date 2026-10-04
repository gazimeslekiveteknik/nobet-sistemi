const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableView.tsx', 'utf8');

const oldStyle = \`        <style>
          {\\\`
            @media print {
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              #print-area { position: absolute; left: 0; top: 0; width: 100%; }
              @page { size: landscape; margin: 10mm; }
            }
          \\\`}
        </style>\`;

const newStyle = \`        <style dangerouslySetInnerHTML={{__html: \\\`
            @media print {
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              #print-area { position: absolute; left: 0; top: 0; width: 100%; }
              @page { size: landscape; margin: 10mm; }
            }
        \\\`}} />\`;

code = code.replace(oldStyle, newStyle);
fs.writeFileSync('src/components/PrintableView.tsx', code);
