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

  // Find all <motion.something and modify their initial/animate/exit/transition
  content = content.replace(/x:\s*20/g, "x: 10").replace(/x:\s*-20/g, "x: -10");

  const regex = /(<motion\.[a-z]+[^>]*?exit=\{[^}]+\})([^>]*?)>/g;
  content = content.replace(regex, (match, p1, p2) => {
    if (p2.includes('transition=')) {
      return match.replace(/transition=\{[^}]+\}/, 'transition={{ duration: 0.15, ease: "easeOut" }}');
    } else {
      return `${p1} transition={{ duration: 0.15, ease: "easeOut" }} ${p2}>`;
    }
  });

  fs.writeFileSync(file, content);
});
