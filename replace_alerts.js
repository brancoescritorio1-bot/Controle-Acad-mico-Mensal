const fs = require('fs');
const path = require('path');

const files = [
  'src/components/ChacaraAccountabilityManager.tsx',
  'src/components/ChacaraFinanceDashboard.tsx',
  'src/components/ChacaraManager.tsx',
  'src/MainApp.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add useDialog import if not exists
  if (!content.includes('useDialog')) {
    if (file === 'src/MainApp.tsx') {
      content = content.replace(
        "import React",
        "import { useDialog } from './components/DialogContext';\nimport React"
      );
    } else {
      content = content.replace(
        "import React",
        "import { useDialog } from './DialogContext';\nimport React"
      );
    }
  }
  
  // Replace confirm and alert
  content = content.replace(/!confirm\(/g, '!(await dialogConfirm(');
  content = content.replace(/!window\.confirm\(/g, '!(await dialogConfirm(');
  content = content.replace(/confirm\(/g, 'await dialogConfirm(');
  content = content.replace(/alert\(/g, 'dialogAlert(');
  
  fs.writeFileSync(file, content);
});
