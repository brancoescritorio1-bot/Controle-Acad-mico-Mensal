const fs = require('fs');
const path = require('path');

const files = [
  'src/components/ChacaraAccountabilityManager.tsx',
  'src/components/ChacaraManager.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/alert\(/g, 'dialogAlert(');
  fs.writeFileSync(file, content);
});
