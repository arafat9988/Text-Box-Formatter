const fs = require('fs');
let code = fs.readFileSync('src/utils/parser.ts', 'utf8');

// I need to just write parseQuestions cleanly.
// First, find 'export function parseQuestions' and its end.

let start = code.indexOf('export function parseQuestions');
let end = code.indexOf('export function generateFormattedTableHtml');

if (start !== -1 && end !== -1) {
  let before = code.substring(0, start);
  let after = code.substring(end);
  
  let cleanFunction = `
export function parseQuestions(text: string): QuestionBlock[] {
  let rawLines = text.split('\\n');
  let processedLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    let curr = rawLines[i];
    let isOnlyNum = /^\\s*([০-৯\\d]{1,3})\\s*[\\.\\)و\\|\\-:]?\\s*$/.test(curr);
    if (isOnlyNum && i + 1 < rawLines.length && !/^\\s*[\\(\\（]*[ক-ঘa-d][\\)\\）]/i.test(rawLines[i + 1])) {
      let nextIsOnlyNum = /^\\s*([০-৯\\d]{1,3})\\s*[\\.\\)و\\|\\-:]?\\s*$/.test(rawLines[i + 1]);
      if (!nextIsOnlyNum) {
        processedLines.push(curr + " " + rawLines[i + 1]);
        i++; 
        continue;
      }
    }
    processedLines.push(curr);
  }

  let lines: string[] = [];
  for (let l of processedLines) {
    let multiOptMatches = l.match(/(?:(?:^|\\s+)[\\(\\（]?[ক-ঘa-d][\\)\\）\\.\\-\\:]\\s+|[\\(\\（][ক-ঘa-d][\\)\\）]\\s*)/gi);
    if (multiOptMatches && multiOptMatches.length > 1) {
      let parts = l.split(/(?=(?:^|\\s+)[\\(\\（]?[ক-ঘa-d][\\)\\）\\.\\-\\:]\\s+|[\\(\\（][ক-ঘa-d][\\)\\）]\\s*)/gi).map(p => p.trim()).filter(Boolean);
      lines.push(...parts);
    } else {
      lines.push(l);
    }
  }

  let blocks: QuestionBlock[] = [];
  let currentBlock: QuestionBlock | null = null;
  let pendingHeaderRefs: string[] = [];
  let currentBlockLineIndex = 0;
  let implicitOptStartIdx = -1;
  let lastActiveField: 'question' | 'option0' | 'option1' | 'option2' | 'option3' | 'explanation' = 'question';

  const isQuestionStart = (line: string, cb?: QuestionBlock | null): boolean => {
    if (/^\\s*([০-৯\\d]{1,3})\\s*[\\.\\)و\\|\\-:]\\s*(.*)/.test(line)) return true;
    let match2 = line.match(/^\\s*([০-৯\\d]{1,2})\\s+(.*)/);
    if (match2) {
      let rest = match2[2].trim();
      return /^[A-Z"'\\u0980-\\u09FF\\(\\[\\{]/.test(rest);
    }
    if (cb && (cb.options.filter(Boolean).length >= 2 || cb.explanation.trim().length > 0)) {
      if (/^\\s*([০-৯\\d]{1,3})\\s*[\\.\\)و\\|\\-:]?\\s*$/.test(line)) {
        let numVal = parseInt(convertToEnglishDigits(line.replace(/[^\\d]/g, '')), 10);
        let currNumVal = parseInt(convertToEnglishDigits((cb.questionNumber || '').replace(/[^\\d]/g, '')), 10);
        if (!isNaN(numVal) && (isNaN(currNumVal) || numVal === currNumVal + 1 || numVal > currNumVal)) {
          return true;
        }
      }
    }
    return false;
  };

  const isRefTag = (line: string): boolean => {
    let trimmed = line.trim();
    return /^\\s*[\\(\\（\\[][\\s\\S]*?[\\]\\)\\）]\\s*$/i.test(trimmed) ||
           /^(?:MQB|TB|PB|P|Q|Sec|Chap|Page|Ref|JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA)[\\,\\.\\-\\:\\s]/i.test(trimmed) ||
           /^[A-Za-z]+\\s+[\\d\\.\\-\\/]+\\s+p-?\\d+/i.test(trimmed);
  };

  const isExplicitOption = (line: string): boolean => {
    return /^\\s*[\\(\\（]*([ক-ঘa-dA-D])[\\)\\）\\.\\-\\:]\\s*(.*)/i.test(line);
  };

  const isExplanationStart = (line: string): boolean => {
    return /^\\s*(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|বিশেষ দ্রষ্টব্য)[\\:\\-\\s]/i.test(line);
  };

  const extractQNum = (line: string) => {
    let match = line.match(/^\\s*([০-৯\\d]{1,3})\\s*[\\.\\)و\\|\\-:]?\\s*(.*)/);
    if (!match) return { num: "", rest: line };
    return { num: match[1], rest: match[2] };
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (isQuestionStart(line, currentBlock)) {
      if (currentBlock) {
        if (pendingHeaderRefs.length > 0) {
          currentBlock.explanation = currentBlock.explanation
            ? currentBlock.explanation + " " + pendingHeaderRefs.join(" ")
            : pendingHeaderRefs.join(" ");
          pendingHeaderRefs = [];
        }
        blocks.push(currentBlock);
      }

      let { num, rest } = extractQNum(line);
      let cleanRest = rest;
      let hasTick = /[✓✔\\*√#]/.test(cleanRest) || /background-color/i.test(cleanRest) || /class=["']?highlight/i.test(cleanRest);
      cleanRest = cleanRest.replace(/[✓✔\\*√#]/g, '').trim();

      let blockSubject = "";
      let qText = "";

      if (!cleanRest || isSubjectCodeTag(cleanRest)) {
        blockSubject = cleanRest;
        if (i + 1 < lines.length && !isExplicitOption(lines[i + 1]) && !isRefTag(lines[i + 1])) {
          let nextLine = lines[i + 1].replace(/[✓✔\\*√#]/g, '').trim();
          if (isSubjectCodeTag(nextLine) && !blockSubject) {
            blockSubject = nextLine;
            if (i + 2 < lines.length && !isExplicitOption(lines[i + 2]) && !isRefTag(lines[i + 2])) {
              qText = lines[i + 2].replace(/[✓✔\\*√#]/g, '').trim();
              i += 2;
            } else {
              qText = nextLine;
              i += 1;
            }
          } else {
            qText = nextLine;
            i += 1;
          }
        } else {
          qText = cleanRest;
        }
      } else {
        qText = cleanRest;
      }

      let bracketMatch = qText.match(/(.*?)\\s+([\\[\\(\\\\{][^\\]\\)\\}]+[\\]\\)\\}])\\s*$/);
      let extractedRef = "";
      if (bracketMatch) {
        let potentialRef = bracketMatch[2].replace(/[\\[\\]\\(\\)\\{\\}]/g, '').trim();
        if (/^(?:JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|[ক-ঘA-Za-z0-9\\s\\/\\-\\'\\.\\u0980-\\u09FF]+)$/i.test(potentialRef) && !/^(?:ক|খ|গ|ঘ|ক\\)|খ\\)|গ\\)|ঘ\\)|a\\)|b\\)|c\\)|d\\))/i.test(potentialRef)) {
          qText = bracketMatch[1].trim();
          extractedRef = potentialRef;
        }
      }

      currentBlock = {
        questionNumber: num,
        subjectCode: blockSubject,
        questionText: qText,
        options: ["", "", "", ""],
        reference: extractedRef,
        explanation: "",
        correctAnswerIndex: -1,
        hasTickMark: hasTick
      };

      // lookahead to compute implicitOptStartIdx
      let blockLines = [qText];
      for (let j = i + 1; j < lines.length; j++) {
        if (isQuestionStart(lines[j], { ...currentBlock, options: ["a", "b", "c", "d"] } as any)) break;
        blockLines.push(lines[j]);
      }
      
      let N = blockLines.length;
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
      } else {
        implicitOptStartIdx = -1;
      }
      
      currentBlockLineIndex = 0;
      lastActiveField = "question";

      if (pendingHeaderRefs.length > 0) {
        currentBlock.explanation = pendingHeaderRefs.join(" ");
        pendingHeaderRefs = [];
      }
      continue;
    }

    if (!currentBlock) {
      if (isRefTag(line) || line.startsWith('(') || line.startsWith('[')) {
        pendingHeaderRefs.push(line);
      }
      continue;
    }

    currentBlockLineIndex++;
    let hasTick = /[✓✔\\*√#]/.test(line) || /background-color/i.test(line) || /class=["']?highlight/i.test(line);
    let cleanLine = line.replace(/[✓✔\\*√#]/g, '').trim();

    if (isRefTag(line)) {
      if (currentBlock) {
        currentBlock.reference = cleanLine.replace(/^[\\[\\（\\(]/, '').replace(/[\\]\\）\\)]$/, '').trim();
      }
      continue;
    }

    if (isExplanationStart(cleanLine)) {
      lastActiveField = "explanation";
      currentBlock.explanation = currentBlock.explanation
        ? currentBlock.explanation + "\\n" + cleanLine
        : cleanLine;
      
      let ansMatch = cleanLine.match(/(?:সঠিক উত্তর|উত্তর|Ans|Answer)[:\\s]*[\\(\\（]?([ক-ঘa-d])[\\)\\）]?/i);
      if (ansMatch) {
        let optChar = ansMatch[1].toLowerCase();
        let optIdx = {'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3}[optChar];
        if (optIdx !== undefined) {
          currentBlock.correctAnswerIndex = optIdx;
          currentBlock.hasTickMark = true;
        }
      } else if (hasTick && currentBlock.correctAnswerIndex === -1) {
        currentBlock.hasTickMark = true;
      }
      continue;
    }

    if (isExplicitOption(line)) {
      let match = line.match(/^\\s*[\\(\\（]*([ক-ঘa-dA-D])[\\)\\）\\.\\-\\:]\\s*(.*)/i);
      if (match) {
        let optChar = match[1].toLowerCase();
        let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[optChar];
        if (optIdx !== undefined) {
          lastActiveField = \`option\${optIdx}\` as any;
          let optText = match[2].replace(/[✓✔\\*√#]/g, '').trim();
          currentBlock.options[optIdx] = optText;
          if (hasTick || /[✓✔\\*√#]/.test(match[2])) {
            currentBlock.hasTickMark = true;
            currentBlock.correctAnswerIndex = optIdx;
          }
          continue;
        }
      }
    }

    let singleAnsMatch = cleanLine.match(/^\\s*(?:ans|answer|উত্তর|সঠিক উত্তর)?[\\:\\s]*[\\(\\（]?([ক-ঘa-d])[\\)\\）]?\\s*(\\d*)\\s*$/i);
    if (singleAnsMatch && (currentBlock.options.some(o => o !== "") || singleAnsMatch[0].toLowerCase().includes('ans') || singleAnsMatch[0].includes('উত্তর'))) {
      let char = singleAnsMatch[1].toLowerCase();
      let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[char];
      if (optIdx !== undefined) {
        currentBlock.correctAnswerIndex = optIdx;
        currentBlock.hasTickMark = true;
        continue;
      }
    }

    if (/^\\s*[1১]\\s*$/.test(cleanLine) && currentBlock.options.some(o => o !== "")) {
      continue;
    }

    if (implicitOptStartIdx === -1) {
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
  }

  if (currentBlock) {
    if (pendingHeaderRefs.length > 0) {
      currentBlock.explanation = currentBlock.explanation
        ? currentBlock.explanation + " " + pendingHeaderRefs.join(" ")
        : pendingHeaderRefs.join(" ");
    }
    blocks.push(currentBlock);
  }

  blocks.forEach(b => {
    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        let m = b.options[i].match(/^(.*?)\\s+[\\(\\（]?([ক-ঘa-d])[\\)\\）]?\\s*(\\d*)$/i);
        if (m && m[1].trim()) {
          let char = m[2].toLowerCase();
          let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[char];
          if (optIdx !== undefined) {
            b.options[i] = m[1].trim();
            if (m[3]) {
              b.explanation = b.explanation ? b.explanation + " " + m[3] : m[3];
            }
            if (b.correctAnswerIndex === -1) {
              b.correctAnswerIndex = optIdx;
              b.hasTickMark = true;
            }
          }
        }
      }
    }
    
    // Clean up post-options trailing numbers which often indicate reference or page
    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        b.options[i] = b.options[i].replace(/[✓✔\\*√#]/g, '').trim();
      }
    }
    
    b.questionText = b.questionText.replace(/[✓✔\\*√#]/g, '').trim();
    if (!b.questionText && b.options.some(o => o !== "")) {
      b.questionText = "প্রশ্ন:";
    }
  });

  return blocks;
}
`;
  
  fs.writeFileSync('src/utils/parser.ts', before + cleanFunction + after);
}

