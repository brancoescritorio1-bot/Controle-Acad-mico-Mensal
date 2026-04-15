const fs = require('fs');
const path = require('path');

const files = [
  'src/MainApp.tsx',
  'src/components/ResponsibleManager.tsx',
  'src/components/ChacaraAccountabilityManager.tsx',
  'src/components/ChacaraFinanceDashboard.tsx',
  'src/components/ChacaraManager.tsx',
  'src/App.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace `await res.json()` with `await res.json().catch(() => ({}))` when it's assigned to err or errorData
  content = content.replace(/const (err|errorData) = await res\.json\(\);/g, 'const $1 = await res.json().catch(() => ({ message: res.statusText }));');
  
  fs.writeFileSync(file, content);
});
