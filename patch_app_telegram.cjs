const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add telegram state
code = code.replace(
  "  const [isInitializing, setIsInitializing] = useState(true);",
  "  const [isInitializing, setIsInitializing] = useState(true);\\n  const [telegramToken, setTelegramToken] = useState('');\\n  const [telegramChatId, setTelegramChatId] = useState('');"
);

// 2. Load settings
code = code.replace(
  "        if (settings.lessons) setLessons(settings.lessons);",
  "        if (settings.lessons) setLessons(settings.lessons);\\n        if (settings.telegramToken) setTelegramToken(settings.telegramToken);\\n        if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);"
);

// 3. Save settings
code = code.replace(
  "        lastScheduleAssignments: currentSchedule.assignments",
  "        lastScheduleAssignments: currentSchedule.assignments,\\n        telegramToken, telegramChatId"
);

// 4. Update dependencies array
code = code.replace(
  "lessons, currentSchedule.assignments, isInitializing]);",
  "lessons, currentSchedule.assignments, isInitializing, telegramToken, telegramChatId]);"
);

// 5. Pass them to SettingsView
const oldSettingsView = \`                <SettingsView 
                  appZones={appZones} setAppZones={setAppZones}
                  appPeriods={appPeriods} setAppPeriods={setAppPeriods}
                  appTimetable={appTimetable} setAppTimetable={setAppTimetable}
                  onSave={handleSaveSettings}
                />\`;

const newSettingsView = \`                <SettingsView 
                  appZones={appZones} setAppZones={setAppZones}
                  appPeriods={appPeriods} setAppPeriods={setAppPeriods}
                  appTimetable={appTimetable} setAppTimetable={setAppTimetable}
                  telegramToken={telegramToken} setTelegramToken={setTelegramToken}
                  telegramChatId={telegramChatId} setTelegramChatId={setTelegramChatId}
                  onSave={handleSaveSettings}
                />\`;

code = code.replace(oldSettingsView, newSettingsView);

fs.writeFileSync('src/App.tsx', code);
