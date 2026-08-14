const fs = require('fs');
let code = fs.readFileSync('src/utils/parser.ts', 'utf8');

// we want to remove the old fallback code starting around line 356.
// Let's just find "    if (hasExplicitOptions || isExplicitFuture) {"
// and remove everything down to "    }" before "  }" (end of loop).

let badBlockStart = code.indexOf("    if (hasExplicitOptions || isExplicitFuture) {");
if (badBlockStart !== -1) {
  let before = code.substring(0, badBlockStart);
  let afterStr = "    } else {\n      let emptyOptIdx = currentBlock.options.findIndex(o => o === \"\");";
  let afterStart = code.indexOf(afterStr, badBlockStart);
  
  if (afterStart !== -1) {
     let afterBlockEnd = code.indexOf("      }\n    }\n  }", afterStart);
     if (afterBlockEnd !== -1) {
        code = before + code.substring(afterBlockEnd + 14); // skipping the braces
     }
  }
}

fs.writeFileSync('src/utils/parser.ts', code);
