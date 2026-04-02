const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for(const f of files) {
    if(f === 'node_modules' || f === 'find_errors.js' || f ==='.git') continue;
    const p = path.join(dir, f);
    if(fs.statSync(p).isDirectory()) {
      checkDir(p);
    } else if (f.endsWith('.js')) {
      try {
        cp.execSync('node --check ' + p, {stdio: 'pipe'});
      } catch(e) {
        console.log('--- ERROR IN:', p, '---');
        console.log(e.stderr.toString());
      }
    }
  }
}

checkDir(__dirname);
