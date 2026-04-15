const fs = require('fs');
const path = require('path');

const file = 'src/MainApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/if \(!\(await dialogConfirm\('Tem certeza\?'\)\) return;/g, "if (!(await dialogConfirm('Tem certeza?'))) return;");
content = content.replace(/if \(!\(await dialogConfirm\('Tem certeza que deseja apagar esta parcela\?'\)\) return;/g, "if (!(await dialogConfirm('Tem certeza que deseja apagar esta parcela?'))) return;");

fs.writeFileSync(file, content);
