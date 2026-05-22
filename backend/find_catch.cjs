const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules') return;
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('catch')) {
        const lines = content.split('\n');
        for (let i=0; i<lines.length; i++) {
          if (lines[i].includes('catch')) {
             results.push(file + ':' + (i+1) + '\n  ' + lines.slice(i, i+4).join('\n  '));
          }
        }
      }
    }
  });
  return results;
}
console.log(walk('.').join('\n\n'));
