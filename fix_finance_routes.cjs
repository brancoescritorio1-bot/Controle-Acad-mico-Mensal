const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const endpoints = ['categories', 'accounts', 'transactions', 'responsibles'];
for (const ep of endpoints) {
  content = content.replace(
    new RegExp(`app\\.get\\("/api/finance/${ep}", async \\(req, res\\) => {([\\s\\S]*?)res\\.json\\((.*?)\\);\\s*}\\);`, 'g'),
    `app.get("/api/finance/${ep}", async (req, res) => { try { $1 res.json($2); } catch (err: any) { res.status(500).json({ error: err.message }); } });`
  );
}

fs.writeFileSync('server.ts', content);
