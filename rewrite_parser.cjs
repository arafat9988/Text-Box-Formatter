const fs = require('fs');
let code = fs.readFileSync('src/utils/parser.ts', 'utf8');

// 1. Add top-level variables
code = code.replace(
  "  let hasExplicitOptions = false;",
  "  let hasExplicitOptions = false;\n  let implicitOptStartIdx = -1;\n  let currentBlockLineIndex = 0;"
);

// 2. Add lookahead logic inside the `if (isQuestionStart(line, currentBlock)) {` block
let lookaheadLogic = `
      if (pendingHeaderRefs.length > 0) {
        currentBlock.explanation = pendingHeaderRefs.join(" ");
        pendingHeaderRefs = [];
      }

      let blockLines = [qText];
      for (let j = i + 1; j < lines.length; j++) {
        if (isQuestionStart(lines[j], { ...currentBlock, options: ["a", "b", "c", "d"] } as any)) break;
        blockLines.push(lines[j]);
      }
      
      let N = blockLines.length;
      implicitOptStartIdx = -1;
      let hasExplicitInBlock = blockLines.some(l => isExplicitOption(l));
      
      if (!hasExplicitInBlock && N >= 5) {
        let tickIdx = blockLines.findIndex(l => /[✓✔\\*√#]/.test(l));
        let validStarts = [];
        for (let s = 1; s <= N - 4; s++) {
          if (tickIdx !== -1 && (s > tickIdx || s + 3 < tickIdx)) continue;
          validStarts.push(s);
        }
        if (validStarts.length > 0) {
          let bestStart = validStarts[0];
          let maxScore = -1;
          for (let s of validStarts) {
            let score = 0;
            let lastQLine = blockLines[s - 1].trim();
            if (lastQLine.match(/(\\?|\\]|\\.|\\-|:)$/)) score += 2;
            if (lastQLine.match(/\\]$/)) score += 2;
            if (s + 4 < N) {
              let firstExplLine = blockLines[s + 4].trim();
              if (firstExplLine.match(/^(ব্যাখ্যা|উত্তর|Ans|Explanation)/i)) score += 3;
            }
            if (score > maxScore) {
              maxScore = score;
              bestStart = s;
            }
          }
          implicitOptStartIdx = bestStart;
        } else {
          implicitOptStartIdx = 1;
        }
      } else if (!hasExplicitInBlock) {
        implicitOptStartIdx = 1;
      }
      currentBlockLineIndex = 0;
      continue;
    }

    currentBlockLineIndex++;
`;

code = code.replace(
  `      if (pendingHeaderRefs.length > 0) {\n        currentBlock.explanation = pendingHeaderRefs.join(" ");\n        pendingHeaderRefs = [];\n      }\n      continue;\n    }`,
  lookaheadLogic
);


// 3. Replace the `isExplicitFuture` and fallback logic
let oldLogicRegex = /    let isExplicitFuture = false;[\s\S]*?    }\n/g;

let newFallbackLogic = `
    if (hasExplicitOptions || implicitOptStartIdx === -1) {
      if (lastActiveField === 'question') {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + "\\n" + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (lastActiveField.startsWith('option')) {
        let optIdx = parseInt(lastActiveField.replace('option', ''));
        currentBlock.options[optIdx] = currentBlock.options[optIdx] ? currentBlock.options[optIdx] + "\\n" + cleanLine : cleanLine;
        if (hasTick) {
          currentBlock.hasTickMark = true;
          currentBlock.correctAnswerIndex = optIdx;
        }
      } else if (lastActiveField === 'explanation') {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + "\\n" + cleanLine : cleanLine;
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    } else {
      if (currentBlockLineIndex < implicitOptStartIdx) {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + "\\n" + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (currentBlockLineIndex >= implicitOptStartIdx && currentBlockLineIndex < implicitOptStartIdx + 4) {
        let optIdx = currentBlockLineIndex - implicitOptStartIdx;
        currentBlock.options[optIdx] = cleanLine;
        lastActiveField = \`option\${optIdx}\` as any;
        if (hasTick) {
          currentBlock.hasTickMark = true;
          currentBlock.correctAnswerIndex = optIdx;
        }
      } else {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + "\\n" + cleanLine : cleanLine;
        lastActiveField = 'explanation';
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    }
`;

code = code.replace(oldLogicRegex, newFallbackLogic);

fs.writeFileSync('src/utils/parser.ts', code);
