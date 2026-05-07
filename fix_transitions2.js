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

  // Fix transition={{ ... }}} to transition={{ ... }}>
  content = content.replace(/transition=\{\{ duration: 0\.15, ease: "easeOut" \}\}\}/g, 'transition={{ duration: 0.15, ease: "easeOut" }}>');

  // And also fix <motion.div ... exit={{...} transition={{...}} }
  content = content.replace(/exit=\{\{([^}]+)\}\s+transition=\{\{([^}]+)\}\}\s*\}/g, 'exit={{$1}} transition={{$2}}');
  
  // also specifically fix exit={{ opacity: 0, x: -10 } transition=... }}> if it exists
  content = content.replace(/exit=\{\{ opacity: 0, x: -10 \} transition/g, 'exit={{ opacity: 0, x: -10 }} transition');
  content = content.replace(/exit=\{\{ opacity: 0, scale: 0.95 \} transition/g, 'exit={{ opacity: 0, scale: 0.95 }} transition');
  
  fs.writeFileSync(file, content);
});
