const data = require('./eslint.json');
data.forEach(f => {
  if(f.messages) {
    f.messages.filter(m => m.ruleId === 'no-undef').forEach(m => {
      console.log(`${f.filePath}:${m.line} - ${m.message}`);
    });
  }
});
