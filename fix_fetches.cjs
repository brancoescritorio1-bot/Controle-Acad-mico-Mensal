const fs = require('fs');
const path = require('path');

const file = 'src/MainApp.tsx';
let content = fs.readFileSync(file, 'utf8');

// Helper to replace standard fetch pattern
const replaceFetch = (funcName, setterName, defaultVal) => {
  const regex = new RegExp(`const ${funcName} = async \\(\\) => \\{\\s*try \\{\\s*const res = await fetchWithAuth\\((.*?)\\);\\s*const data = await res\\.json\\(\\);\\s*${setterName}\\((.*?)\\);\\s*\\} catch \\(e\\) \\{\\s*console\\.error\\(.*?\\);\\s*${setterName}\\(.*?\\);\\s*\\}\\s*\\};`, 'g');
  
  content = content.replace(regex, `const ${funcName} = async () => {
    try {
      const res = await fetchWithAuth($1);
      if (res.ok) {
        const data = await res.json();
        ${setterName}($2);
      } else {
        console.error("Error in ${funcName}:", res.status, await res.text().catch(()=>''));
        ${setterName}(${defaultVal});
      }
    } catch (e) {
      console.error("Error fetching in ${funcName}:", e);
      ${setterName}(${defaultVal});
    }
  };`);
};

replaceFetch('fetchPeriods', 'setPeriods', '[]');
replaceFetch('fetchSubjects', 'setSubjects', '[]');
replaceFetch('fetchChacaraBills', 'setChacaraBills', '[]');
replaceFetch('fetchPersonalTasks', 'setPersonalTasks', '[]');
replaceFetch('fetchClients', 'setClients', '[]');
replaceFetch('fetchClientSales', 'setClientSales', '[]');

fs.writeFileSync(file, content);
