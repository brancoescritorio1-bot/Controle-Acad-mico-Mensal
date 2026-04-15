const fs = require('fs');
const path = require('path');

const file = 'src/MainApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/!confirm\(/g, '!(await dialogConfirm(');
content = content.replace(/!window\.confirm\(/g, '!(await dialogConfirm(');
content = content.replace(/confirm\(/g, 'await dialogConfirm(');
content = content.replace(/alert\(/g, 'dialogAlert(');

fs.writeFileSync(file, content);
