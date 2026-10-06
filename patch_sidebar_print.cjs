const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = \`          <button 
            onClick={() => setCurrentView('print')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Okul Panosu)</span>
          </button>

          <button 
            onClick={() => setCurrentView('print-teachers')}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print-teachers' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çizelge (Öğretmen El)</span>
          </button>\`;

const replacement = \`          <button 
            onClick={() => { setCurrentView('print'); setPrintTab('master'); }}
            className={\\\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${currentView === 'print' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 font-medium'}\\\`}
          >
            <Printer size={20} />
            <span>Çıktılar & Çizelgeler</span>
          </button>\`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
