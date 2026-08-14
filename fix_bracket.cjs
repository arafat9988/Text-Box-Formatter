const fs = require('fs');
let text = fs.readFileSync('src/utils/parser.ts', 'utf8');
let lines = text.split('\n');

// Find where brackets go negative
let brackets = 0;
let problemLine = -1;
for(let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let c of line) {
    if(c==='{') brackets++;
    if(c==='}') {
      brackets--;
      if (brackets < 0 && problemLine === -1) {
        problemLine = i;
      }
    }
  }
}

if (problemLine !== -1) {
  lines.splice(problemLine, 1);
  fs.writeFileSync('src/utils/parser.ts', lines.join('\n'));
}
