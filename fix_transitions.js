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

  // Fix the broken } transition={{ ...
  // It looks like:
  // exit={{ opacity: 0, x: -10 } transition={{ duration: 0.15, ease: "easeOut" }} }>
  // and sometimes
  // exit={{ opacity: 0, scale: 0.95 } transition={{ duration: 0.15, ease: "easeOut" }} }>
  
  content = content.replace(/\} transition=\{\{ duration: 0\.15, ease: "easeOut" \}\} \}>/g, '}} transition={{ duration: 0.15, ease: "easeOut" }}>');

  // Fix any potential occurrences of y: -10
  content = content.replace(/\} transition=\{\{ duration: 0\.15, ease: "easeOut" \}\} transition=\{\{ duration: 0\.15, ease: "easeOut" \}\}>/g, '}} transition={{ duration: 0.15, ease: "easeOut" }}>');

  content = content.replace(/\} transition=\{\{ duration: 0\.15, ease: "easeOut" \}\} transition=\{(.+?)\}>/g, '}} transition={{ duration: 0.15, ease: "easeOut" }}>');
  
  fs.writeFileSync(file, content);
});
