import fs from 'fs';
const files = [
  'src/MainApp.tsx',
  'src/components/ChacaraManager.tsx',
  'src/components/ChacaraAccountabilityManager.tsx',
  'src/components/ChacaraFinanceDashboard.tsx',
  'src/components/FixedBillsManager.tsx',
  'src/components/ResponsibleManager.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Fix easeOut" }}>> to easeOut" }}>
  content = content.replace(/easeOut" \}\}>/g, 'easeOut" }}>');
  
  fs.writeFileSync(file, content);
});
