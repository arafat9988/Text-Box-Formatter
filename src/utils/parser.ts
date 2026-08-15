/**
 * Question Parser and 8-Box Table Generator
 */

import { convertToEnglishDigits, formatHtmlTextPiece, unicodeToBijoy, isEnglishWord } from './bijoy';
import { localRuleBasedTranslate } from './translate';

export interface QuestionBlock {
  questionNumber: string;
  subjectCode?: string;
  questionText: string;
  options: [string, string, string, string];
  reference?: string;
  outsideRefBefore?: string;
  outsideRefAfter?: string;
  explanation: string;
  correctAnswerIndex: number; // 0, 1, 2, 3 or -1
  hasTickMark: boolean;
}

export function isSubjectCodeTag(text: string): boolean {
  if (!text) return false;
  let trimmed = text.trim();
  if (!trimmed || trimmed.length > 30) return false;
  if (/[।\?\!\:\-\–]/.test(trimmed)) return false;
  if (/^(?:GK|Ban|Eng|Phy|Chem|Math|Bio|ICT|GS|GK_Bangladesh|[A-Z0-9_-]{2,10}|জিকে|বাংলা|ইংরেজি|পদার্থ|রসায়ন|গণিত|জীববিজ্ঞান|আইসিটি|সাধারণ জ্ঞান)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isPageBookRefTag(line: string): boolean {
  if (!line) return false;
  let trimmed = line.trim();
  if (!trimmed) return false;
  if (/^(?:MQB|TB|PB|Page|Sec|Chap|Ref|INT)[\,\.\-\:\s]/i.test(trimmed)) return true;
  if (/^[PQ][\,\.\-\:\s\d]/i.test(trimmed)) return true;
  if (/^(?:ou|বা|or)?\s*(?:Q|q|Question|Prob|Probable)[\,\.\-\:\s\d]/i.test(trimmed)) return true;
  if (/^[A-Za-z0-9_-]+\s*,\s*page\s*[:\-]/i.test(trimmed)) return true;
  if (/^[A-Za-z0-9_-]+\s*,\s*p[\.]?\s*[:\-]/i.test(trimmed)) return true;
  if (/^[A-Za-z0-9_-]+\s+[\d\.\-\/]+\s+p-?\d+/i.test(trimmed)) return true;
  if (/^(?:মাস্টার|কোশ্চেন|প্রশ্ন)\s*(?:কোশ্চেন|ব্যাংক|বই|গাইড)/i.test(trimmed)) return true;
  if (/^(?:কোশ্চেন|প্রশ্ন)\s*ব্যাংক/i.test(trimmed)) return true;
  if (/^(?:পেজ|পৃষ্ঠা|পৃ|P|Page)\s*[\-:\s]*\d+/i.test(trimmed)) return true;
  return false;
}

export function cleanMergeReferenceLines(rawRef: string): string {
  if (!rawRef) return "";
  let lines = rawRef.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  if (lines.length === 1) {
    return lines[0].replace(/\s+/g, ' ').trim();
  }

  let merged = lines[0];
  for (let i = 1; i < lines.length; i++) {
    let next = lines[i];
    if (!next) continue;
    if (/[,\;:\-\/]$/.test(merged) || /^[,\;:\-\/]/.test(next)) {
      merged = `${merged} ${next}`;
    } else {
      merged = `${merged} ${next}`;
    }
  }
  return merged.replace(/\s+/g, ' ').trim();
}

export function cleanExplanationText(text: string): string {
  if (!text) return "";
  let s = text.trim();
  let prev = "";
  // Repeatedly strip leading explanation markers (e.g. "ব্যাখ্যা:", "Exp:", "Expl:", "Explanation:", "বিবরণ:", "Note:", etc.)
  while (s !== prev) {
    prev = s;
    s = s.replace(/^\s*(?:ব্যাখ্যা|ব্যাখ্যাঃ|উত্তরের\s*ব্যাখ্যা|উত্তরের\s*ব্যাখ্যাঃ|Explanation|Expla|Expl|Exp|বিবরণ|Note|Ans|Answer|সঠিক\s*উত্তর|উত্তর|বিশেষ\s*দ্রষ্টব্য|জেনে\s*রাখো|জেনে\s*রাখা\s*ভালো)[\:\-\—\.\s]*\s*/gi, '').trim();
  }
  return s;
}

/* ================= HELPER: REPAIR IMPLICIT OPTIONS ================= */
export function repairImplicitOptions(b: QuestionBlock): void {
  // Strip trailing "সঠিক উত্তর: [উত্তর]" or "উত্তর: ..." attached to options
  for (let i = 0; i < 4; i++) {
    let opt = b.options[i] || '';
    let ansInlineMatch = opt.match(/(?:\s+|\b)(?:সঠিক উত্তর|উত্তর|Ans|Answer)\s*[:\-]?\s*[\(\（\[]?([ক-ঘa-d])[\)\）\]]?(.*)/i);
    if (ansInlineMatch) {
      let optChar = ansInlineMatch[1].toLowerCase();
      let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[optChar];
      if (optIdx !== undefined) {
        b.correctAnswerIndex = optIdx;
        b.hasTickMark = true;
      }
      b.options[i] = opt.replace(/(?:\s+|\b)(?:সঠিক উত্তর|উত্তর|Ans|Answer)\s*[:\-]?\s*[\(\（\[]?[ক-ঘa-d][\)\）\]]?.*$/i, '').trim();
    }
  }

  // If options[3] is empty and explanation is a short non-explanation word/phrase without explanation markers
  if ((!b.options[3] || !b.options[3].trim()) && b.explanation && b.explanation.trim()) {
    let exp = b.explanation.trim();
    let isRealExpl = /^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|বিবরণ|কারণ)[\:\-\—\s]/i.test(exp) || exp.includes('।') || exp.length > 60;
    if (!isRealExpl) {
      let emptyIdx = b.options.findIndex(o => !o || !o.trim());
      if (emptyIdx !== -1) {
        b.options[emptyIdx] = exp;
        b.explanation = "";
      }
    }
  }

  const rawOpts = b.options.map(o => (o || '').trim());
  const filledCount = rawOpts.filter(Boolean).length;

  if (filledCount === 4) {
    return;
  }

  // Collect tokens from existing options
  let allTokens: { text: string; hasTick: boolean }[] = [];

  for (let i = 0; i < 4; i++) {
    const raw = b.options[i] || '';
    if (!raw.trim()) continue;

    let parts = raw.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        const hasT = /[✓✔\*√#]/.test(p) || (b.correctAnswerIndex === i && parts.length === 1);
        const clean = p.replace(/[✓✔\*√#]/g, '').trim();
        if (clean) allTokens.push({ text: clean, hasTick: hasT });
      }
    } else {
      const hasT = /[✓✔\*√#]/.test(raw) || (b.correctAnswerIndex === i);
      const clean = raw.replace(/[✓✔\*√#]/g, '').trim();
      if (clean) allTokens.push({ text: clean, hasTick: hasT });
    }
  }

  // If we have fewer than 4 tokens, try splitting tokens with multiple single-spaced words
  if (allTokens.length < 4 && allTokens.length > 0) {
    if (allTokens.length === 3) {
      let splitDone = false;
      for (let tIdx = 0; tIdx < allTokens.length; tIdx++) {
        const words = allTokens[tIdx].text.split(/\s+/).filter(Boolean);
        if (words.length === 2) {
          const newTokens = [
            ...allTokens.slice(0, tIdx),
            { text: words[0], hasTick: allTokens[tIdx].hasTick },
            { text: words[1], hasTick: false },
            ...allTokens.slice(tIdx + 1)
          ];
          allTokens = newTokens;
          splitDone = true;
          break;
        }
      }
      if (!splitDone) {
        for (let tIdx = 0; tIdx < allTokens.length; tIdx++) {
          const words = allTokens[tIdx].text.split(/\s+/).filter(Boolean);
          if (words.length > 2) {
            const newTokens = [
              ...allTokens.slice(0, tIdx),
              { text: words[0], hasTick: allTokens[tIdx].hasTick },
              { text: words.slice(1).join(' '), hasTick: false },
              ...allTokens.slice(tIdx + 1)
            ];
            allTokens = newTokens;
            break;
          }
        }
      }
    } else if (allTokens.length === 2) {
      let token0Words = allTokens[0].text.split(/\s+/).filter(Boolean);
      let token1Words = allTokens[1].text.split(/\s+/).filter(Boolean);
      if (token0Words.length >= 2 && token1Words.length >= 2) {
        allTokens = [
          { text: token0Words[0], hasTick: allTokens[0].hasTick },
          { text: token0Words.slice(1).join(' '), hasTick: false },
          { text: token1Words[0], hasTick: allTokens[1].hasTick },
          { text: token1Words.slice(1).join(' '), hasTick: false }
        ];
      } else if (token0Words.length === 3 && token1Words.length === 1) {
        allTokens = [
          { text: token0Words[0], hasTick: allTokens[0].hasTick },
          { text: token0Words[1], hasTick: false },
          { text: token0Words[2], hasTick: false },
          { text: allTokens[1].text, hasTick: allTokens[1].hasTick }
        ];
      } else if (token0Words.length === 1 && token1Words.length === 3) {
        allTokens = [
          { text: allTokens[0].text, hasTick: allTokens[0].hasTick },
          { text: token1Words[0], hasTick: allTokens[1].hasTick },
          { text: token1Words[1], hasTick: false },
          { text: token1Words[2], hasTick: false }
        ];
      }
    } else if (allTokens.length === 1) {
      let words = allTokens[0].text.split(/\s+/).filter(Boolean);
      if (words.length === 4) {
        allTokens = [
          { text: words[0], hasTick: allTokens[0].hasTick },
          { text: words[1], hasTick: false },
          { text: words[2], hasTick: false },
          { text: words[3], hasTick: false }
        ];
      }
    }
  }

  // Populate b.options with allTokens
  if (allTokens.length >= 2) {
    for (let i = 0; i < 4; i++) {
      if (i < allTokens.length) {
        b.options[i] = allTokens[i].text.replace(/[✓✔\*√#]/g, '').trim();
        if (allTokens[i].hasTick) {
          b.correctAnswerIndex = i;
          b.hasTickMark = true;
        }
      } else {
        b.options[i] = "";
      }
    }
  }
}

/* ================= STANDARD PARSER (For Text Box Formatter & Converter) ================= */
export function parseQuestions(text: string): QuestionBlock[] {
  let rawLines = text.split('\n');
  let processedLines: string[] = [];

  const checkIsRefTag = (line: string): boolean => {
    if (!line) return false;
    let trimmed = line.trim();
    if (!trimmed) return false;
    if (/[।\?]/.test(trimmed)) return false;
    if (/^\s*[\(\（\[]\s*(?:[ক-ঘa-d1-4১-৪0-4]|0?[1-4]|0?[১-৪]|i{1,3}|iv)\s*[\)\）\]]\s*$/i.test(trimmed)) return false;
    if (isPageBookRefTag(trimmed)) return true;
    if (/^\s*[\(\（\[][\s\S]*?[\]\)\）]\s*$/i.test(trimmed)) {
      let inner = trimmed.replace(/^[\[\(\（]/, '').replace(/[\]\)\）]$/, '').trim();
      if (/(?:JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস)/i.test(inner)) {
        return true;
      }
    }
    if (/^(?:MQB|TB|PB|Sec|Chap|Page|Ref|JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|INT)[\,\.\-\:\s]/i.test(trimmed) && !/[।\?]/.test(trimmed)) return true;
    if (/^[PQ][\,\.\-\:\s]/.test(trimmed) && !/[।\?]/.test(trimmed)) return true;
    if (/^(?:p|page|prob|probable|vol|ch|chap|sec|set|পেজ|পৃষ্ঠা|পৃ|ন)\b[\s\.\-\:]*\d+/i.test(trimmed)) return true;
    if (/^(?:মাস্টার|কোশ্চেন|প্রশ্ন)\s*(?:কোশ্চেন|ব্যাংক|বই|গাইড)/i.test(trimmed)) return true;
    if (/^(?:কোশ্চেন|প্রশ্ন)\s*ব্যাংক/i.test(trimmed)) return true;
    return false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    let curr = rawLines[i];
    let isOnlyNum = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(curr);
    if (isOnlyNum && i + 1 < rawLines.length && !/^\s*[\(\（]*[ক-ঘa-d][\)\）]/i.test(rawLines[i + 1])) {
      let nextIsOnlyNum = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(rawLines[i + 1]);
      if (!nextIsOnlyNum) {
        if (checkIsRefTag(rawLines[i + 1])) {
          let k = i + 1;
          let refLines: string[] = [];
          while (k < rawLines.length && checkIsRefTag(rawLines[k])) {
            refLines.push(rawLines[k]);
            k++;
          }
          if (k < rawLines.length && !/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(rawLines[k])) {
            processedLines.push(...refLines);
            processedLines.push(curr + " " + rawLines[k]);
            i = k;
            continue;
          }
        } else {
          processedLines.push(curr + " " + rawLines[i + 1]);
          i++; 
          continue;
        }
      }
    }
    processedLines.push(curr);
  }

  let lines: string[] = [];
  for (let l of processedLines) {
    let trimmed = l.trim();
    let multiOptMatches = trimmed.match(/(?:(?:^|\s+)[\(\（\[]?[ক-ঘa-d][\)\）\]\.\:]\s+|[\(\（\[][ক-ঘa-d][\)\）\]]\s*)/gi);
    if (multiOptMatches && multiOptMatches.length > 1) {
      let parts = trimmed.split(/(?=(?:^|\s+)[\(\（\[]?[ক-ঘa-d][\)\）\]\.\:]\s+|[\(\（\[][ক-ঘa-d][\)\）\]]\s*)/gi).map(p => p.trim()).filter(Boolean);
      lines.push(...parts);
    } else {
      let isQStart = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]\s*(.*)/.test(trimmed);
      let tabOrSpaceParts = trimmed.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (!isQStart && !checkIsRefTag(trimmed) && tabOrSpaceParts.length >= 2 && tabOrSpaceParts.length <= 4) {
        if (tabOrSpaceParts.every(p => p.length < 60 && !/[।\?]/.test(p))) {
          lines.push(...tabOrSpaceParts);
          continue;
        }
      }
      lines.push(l);
    }
  }

  let blocks: QuestionBlock[] = [];
  let currentBlock: QuestionBlock | null = null;
  let pendingHeaderRefs: string[] = [];
  let currentBlockLineIndex = 0;
  let implicitOptStartIdx = -1;
  let lastActiveField: 'question' | 'option0' | 'option1' | 'option2' | 'option3' | 'explanation' = 'question';

  const isExplicitOption = (line: string): boolean => {
    return /^\s*[\(\（\[]*([ক-ঘa-dA-D])[\)\）\]\.\:]\s*(.*)/i.test(line);
  };

  const isQuestionStart = (line: string, cb?: QuestionBlock | null): boolean => {
    let match1 = line.match(/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]\s*(.*)/);
    if (match1) {
      return true;
    }
    let match2 = line.match(/^\s*([০-৯\d]{1,2})\s+(.*)/);
    if (match2) {
      let rest = match2[2].trim();
      return /^[A-Z"'\u0980-\u09FF\(\[\{]/.test(rest);
    }
    if (cb && (cb.options.filter(Boolean).length >= 2 || cb.explanation.trim().length > 0)) {
      if (/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(line)) {
        let numVal = parseInt(convertToEnglishDigits(line.replace(/[^\d]/g, '')), 10);
        let currNumVal = parseInt(convertToEnglishDigits((cb.questionNumber || '').replace(/[^\d]/g, '')), 10);
        if (!isNaN(numVal) && !isNaN(currNumVal) && numVal === currNumVal + 1) {
          return true;
        }
      }
    }
    return false;
  };

  const isRefTag = (line: string): boolean => {
    return checkIsRefTag(line);
  };

  const isExplanationStart = (line: string): boolean => {
    return /^\s*(?:ব্যাখ্যা|ব্যাখ্যাঃ|উত্তরের\s*ব্যাখ্যা|উত্তরের\s*ব্যাখ্যাঃ|Explanation|Expla|Expl|Exp|বিবরণ|Note|Ans|Answer|সঠিক\s*উত্তর|উত্তর|বিশেষ\s*দ্রষ্টব্য|জেনে\s*রাখো|জেনে\s*রাখা\s*ভালো)[\:\-\—\.\s]/i.test(line);
  };

  const extractQNum = (line: string) => {
    let match = line.match(/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*(.*)/);
    if (!match) return { num: "", rest: line };
    return { num: match[1], rest: match[2] };
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (isQuestionStart(line, currentBlock)) {
      if (currentBlock) {
        if (pendingHeaderRefs.length > 0) {
          currentBlock.outsideRefAfter = currentBlock.outsideRefAfter
            ? currentBlock.outsideRefAfter + "\n" + pendingHeaderRefs.join("\n")
            : pendingHeaderRefs.join("\n");
          pendingHeaderRefs = [];
        }
        blocks.push(currentBlock);
      }

      let { num, rest } = extractQNum(line);
      let cleanRest = rest;
      let hasTick = /[✓✔\*√#]/.test(cleanRest) || /background-color/i.test(cleanRest) || /class=["']?highlight/i.test(cleanRest);
      cleanRest = cleanRest.replace(/[✓✔\*√#]/g, '').trim();

      let blockSubject = "";
      let qText = "";

      if (!cleanRest || isSubjectCodeTag(cleanRest)) {
        blockSubject = cleanRest;
        if (i + 1 < lines.length && !isExplicitOption(lines[i + 1]) && !isRefTag(lines[i + 1])) {
          let nextLine = lines[i + 1].replace(/[✓✔\*√#]/g, '').trim();
          if (isSubjectCodeTag(nextLine) && !blockSubject) {
            blockSubject = nextLine;
            if (i + 2 < lines.length && !isExplicitOption(lines[i + 2]) && !isRefTag(lines[i + 2])) {
              qText = lines[i + 2].replace(/[✓✔\*√#]/g, '').trim();
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
      } else if (checkIsRefTag(cleanRest)) {
        pendingHeaderRefs.push(cleanRest);
        qText = "";
      } else {
        qText = cleanRest;
      }

      let bracketMatch = qText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      if (!bracketMatch) {
        bracketMatch = qText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      }
      let extractedRef = "";
      if (bracketMatch) {
        let potentialRef = bracketMatch[2].replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();
        if (potentialRef && !/^(?:ক|খ|গ|ঘ|ক\)|খ\)|গ\)|ঘ\)|a\)|b\)|c\)|d\))/i.test(potentialRef)) {
          qText = bracketMatch[1].trim();
          extractedRef = potentialRef;
        }
      }

      let initialRefBefore = "";
      if (pendingHeaderRefs.length > 0) {
        initialRefBefore = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
        pendingHeaderRefs = [];
      }

      currentBlock = {
        questionNumber: num,
        subjectCode: blockSubject,
        questionText: qText,
        options: ["", "", "", ""],
        reference: extractedRef,
        outsideRefBefore: initialRefBefore,
        outsideRefAfter: "",
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
        let tickIdx = blockLines.findIndex(l => /[✓✔\*√#]/.test(l));
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
            if (lastQLine.match(/(\?|\]|\.|\-|:)$/)) score += 2;
            if (lastQLine.match(/\]$/)) score += 2;
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
      continue;
    }

    if (!currentBlock) {
      if (line.trim()) {
        pendingHeaderRefs.push(line.trim());
      }
      continue;
    }

    currentBlockLineIndex++;
    let hasTick = /[✓✔\*√#]/.test(line) || /background-color/i.test(line) || /class=["']?highlight/i.test(line);
    let cleanLine = line.replace(/[✓✔\*√#]/g, '').trim();

    if (isRefTag(line)) {
      if (currentBlock) {
        let cleanRef = cleanLine.replace(/^[\[\（\(]/, '').replace(/[\]\）\)]$/, '').trim();
        if (isPageBookRefTag(cleanLine) || /^(?:MQB|TB|PB|P|Page|Sec|Chap|Ref)[\,\.\-\:\s]/i.test(cleanLine)) {
          if (lastActiveField === 'explanation' || currentBlock.options.some(o => o !== "")) {
            currentBlock.outsideRefAfter = currentBlock.outsideRefAfter ? cleanMergeReferenceLines(currentBlock.outsideRefAfter + " " + cleanRef) : cleanRef;
          } else {
            currentBlock.outsideRefBefore = currentBlock.outsideRefBefore ? cleanMergeReferenceLines(currentBlock.outsideRefBefore + " " + cleanRef) : cleanRef;
          }
        } else {
          currentBlock.reference = cleanMergeReferenceLines(currentBlock.reference ? currentBlock.reference + " " + cleanRef : cleanRef);
        }
      }
      continue;
    }

    if (isExplanationStart(cleanLine) || /^\s*[\(\（\[]?(?:[ক-ঘa-d])[\)\）\]]\s*$/i.test(cleanLine)) {
      let ansMatch = cleanLine.match(/(?:সঠিক উত্তর|উত্তর|Ans|Answer|প্রশ্ন)[:\s]*[\(\（\[]?([ক-ঘa-d])[\)\）\]]?/i) || cleanLine.match(/^\s*[\(\（\[]?([ক-ঘa-d])[\)\）\]]?\s*$/i);
      let isOnlyAnsTag = false;
      if (ansMatch) {
        let optChar = ansMatch[1].toLowerCase();
        let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[optChar];
        if (optIdx !== undefined) {
          currentBlock.correctAnswerIndex = optIdx;
          currentBlock.hasTickMark = true;
        }
        let remainingText = cleanLine.replace(/^(?:সঠিক উত্তর|উত্তর|Ans|Answer|প্রশ্ন)[:\s]*[\(\（\[]?[ক-ঘa-d][\)\）\]]?/i, '').replace(/^[\(\（\[]?[ক-ঘa-d][\)\）\]]?$/i, '').trim();
        if (!remainingText) {
          isOnlyAnsTag = true;
        }
      } else if (hasTick && currentBlock.correctAnswerIndex === -1) {
        currentBlock.hasTickMark = true;
      }

      if (!isOnlyAnsTag) {
        lastActiveField = "explanation";
        currentBlock.explanation = currentBlock.explanation
          ? currentBlock.explanation + " " + cleanLine
          : cleanLine;
      }
      continue;
    }

    if (isExplicitOption(line)) {
      let match = line.match(/^\s*[\(\（\[]*([ক-ঘa-dA-D])[\)\）\]\.\:]\s*(.*)/i);
      if (match) {
        let optChar = match[1].toLowerCase();
        let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[optChar];
        if (optIdx !== undefined) {
          lastActiveField = `option${optIdx}` as any;
          let optText = match[2].replace(/[✓✔\*√#]/g, '').trim();
          if (match[2].includes('✓') || match[2].includes('✔') || match[2].includes('*') || match[2].includes('√')) {
            currentBlock.correctAnswerIndex = optIdx;
            currentBlock.hasTickMark = true;
          }
          if (!currentBlock.options[optIdx]) {
            currentBlock.options[optIdx] = optText;
          } else {
            currentBlock.options[optIdx] += " " + optText;
          }
          continue;
        }
      }
    }

    if (/^\s*[1১]\s*$/.test(cleanLine) && currentBlock.options.some(o => o !== "")) {
      continue;
    }

    if (implicitOptStartIdx === -1) {
      if (lastActiveField === 'question') {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + " " + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (lastActiveField.startsWith('option')) {
        let optIdx = parseInt(lastActiveField.replace('option', ''));
        if (optIdx === 3 && (currentBlock.options[3].trim().length > 0 || currentBlock.options.every(Boolean))) {
          lastActiveField = 'explanation';
          currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
          if (hasTick && currentBlock.correctAnswerIndex === -1) {
            currentBlock.hasTickMark = true;
          }
        } else {
          currentBlock.options[optIdx] = currentBlock.options[optIdx] ? currentBlock.options[optIdx] + " " + cleanLine : cleanLine;
          if (hasTick) {
            currentBlock.hasTickMark = true;
            currentBlock.correctAnswerIndex = optIdx;
          }
        }
      } else if (lastActiveField === 'explanation') {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    } else {
      if (currentBlockLineIndex < implicitOptStartIdx) {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + " " + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (currentBlockLineIndex >= implicitOptStartIdx && currentBlockLineIndex < implicitOptStartIdx + 4) {
        let optIdx = currentBlockLineIndex - implicitOptStartIdx;
        currentBlock.options[optIdx] = cleanLine;
        lastActiveField = `option${optIdx}` as any;
        if (hasTick) {
          currentBlock.hasTickMark = true;
          currentBlock.correctAnswerIndex = optIdx;
        }
      } else {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
        lastActiveField = 'explanation';
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    }
  }

  if (currentBlock) {
    if (pendingHeaderRefs.length > 0) {
      let mergedPending = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
      currentBlock.outsideRefAfter = currentBlock.outsideRefAfter
        ? cleanMergeReferenceLines(currentBlock.outsideRefAfter + " " + mergedPending)
        : mergedPending;
      pendingHeaderRefs = [];
    }
    blocks.push(currentBlock);
  } else if (pendingHeaderRefs.length > 0 && blocks.length > 0) {
    let mergedPending = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
    blocks[blocks.length - 1].outsideRefAfter = blocks[blocks.length - 1].outsideRefAfter
      ? cleanMergeReferenceLines(blocks[blocks.length - 1].outsideRefAfter + " " + mergedPending)
      : mergedPending;
    pendingHeaderRefs = [];
  }

  blocks.forEach(b => {
    // 1. Clean trailing bracketed reference tag from question text
    if (b.questionText) {
      let refTagMatch = b.questionText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      if (refTagMatch) {
        b.questionText = refTagMatch[1].trim();
        let refText = refTagMatch[2].replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();
        b.reference = b.reference ? b.reference + "; " + refText : refText;
      }
    }

    // 2. Clean options and extract stray reference fragments
    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        let optVal = b.options[i];
        if (optVal.includes(']') && (optVal.includes('JU') || optVal.includes('DU') || optVal.includes('RU') || optVal.includes('CU') || /['\d]{2,}/.test(optVal))) {
          let closeBracketIdx = optVal.lastIndexOf(']');
          let refPart = optVal.substring(0, closeBracketIdx + 1).replace(/[\[\]]/g, '').trim();
          let cleanOpt = optVal.substring(closeBracketIdx + 1).trim();
          if (cleanOpt) {
            b.options[i] = cleanOpt;
            if (refPart) {
              b.reference = b.reference ? b.reference + "; " + refPart : refPart;
            }
          }
        }

        let m = b.options[i].match(/^(.*?)\s+[\(\（]?([ক-ঘa-d])[\)\）]?\s*(\d*)$/i);
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

    // Automatically repair and separate merged/implicit options into individual boxes
    repairImplicitOptions(b);

    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        b.options[i] = b.options[i].replace(/[✓✔\*√#]/g, '').trim();
      }
    }
    
    b.questionText = (b.questionText || "").replace(/[✓✔\*√#]/g, '').trim();
    if (b.explanation) {
      b.explanation = cleanExplanationText(b.explanation);
    }
  });

  // Post-processing cleanup
  let cleanedBlocks: QuestionBlock[] = [];
  for (let idx = 0; idx < blocks.length; idx++) {
    let b = blocks[idx];
    let hasNoOptions = b.options.every(o => !o.trim());
    let isQTextRef = isPageBookRefTag(b.questionText) || checkIsRefTag(b.questionText);
    let hasNoNum = !b.questionNumber.trim();

    if (hasNoNum && hasNoOptions && (isQTextRef || !b.questionText.trim())) {
      let refVal = (b.questionText || "").trim();
      if (b.outsideRefBefore) refVal = b.outsideRefBefore + (refVal ? "\n" + refVal : "");
      if (b.outsideRefAfter) refVal = (refVal ? refVal + "\n" : "") + b.outsideRefAfter;

      if (cleanedBlocks.length > 0 && refVal) {
        cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter = cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter
          ? cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter + "\n" + refVal
          : refVal;
      } else if (idx + 1 < blocks.length && refVal) {
        blocks[idx + 1].outsideRefBefore = blocks[idx + 1].outsideRefBefore
          ? refVal + "\n" + blocks[idx + 1].outsideRefBefore
          : refVal;
      }
    } else {
      cleanedBlocks.push(b);
    }
  }

  return cleanedBlocks;
}

/* ================= ENHANCED VERSION PARSER (For Version Tab Only) ================= */
export function parseVersionQuestions(text: string): QuestionBlock[] {
  let rawLines = text.split('\n');
  let processedLines: string[] = [];

  const checkIsRefTag = (line: string): boolean => {
    if (!line) return false;
    let trimmed = line.trim();
    if (!trimmed) return false;
    if (/[।\?]/.test(trimmed)) return false;
    if (/^\s*[\(\（\[]\s*(?:[ক-ঘa-d1-4১-৪0-4]|0?[1-4]|0?[১-৪]|i{1,3}|iv)\s*[\)\）\]]\s*$/i.test(trimmed)) return false;
    if (isPageBookRefTag(trimmed)) return true;
    if (/^\s*[\(\（\[][\s\S]*?[\]\)\）]\s*$/i.test(trimmed)) {
      let inner = trimmed.replace(/^[\[\(\（]/, '').replace(/[\]\)\）]$/, '').trim();
      if (/(?:JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস)/i.test(inner)) {
        return true;
      }
    }
    if (/(?:MQB|TB|PB|Sec|Chap|Page|Ref|JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA)[\,\.\-\:\s]/i.test(trimmed) && !/[।\?]/.test(trimmed)) return true;
    if (/\b[PQ][\,\.\-\:\s]/.test(trimmed) && !/[।\?]/.test(trimmed)) return true;
    if (/\b(?:p|page|prob|probable|vol|ch|chap|sec|set)\b[\s\.\-\:]*\d+/i.test(trimmed)) return true;
    return false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    let curr = rawLines[i];
    let isOnlyNum = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(curr);
    if (isOnlyNum && i + 1 < rawLines.length && !/^\s*[\(\（]*[ক-ঘa-d][\)\）]/i.test(rawLines[i + 1])) {
      let nextIsOnlyNum = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(rawLines[i + 1]);
      if (!nextIsOnlyNum) {
        if (checkIsRefTag(rawLines[i + 1])) {
          let k = i + 1;
          let refLines: string[] = [];
          while (k < rawLines.length && checkIsRefTag(rawLines[k])) {
            refLines.push(rawLines[k]);
            k++;
          }
          if (k < rawLines.length && !/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(rawLines[k])) {
            processedLines.push(...refLines);
            processedLines.push(curr + " " + rawLines[k]);
            i = k;
            continue;
          }
        } else {
          processedLines.push(curr + " " + rawLines[i + 1]);
          i++; 
          continue;
        }
      }
    }
    processedLines.push(curr);
  }

  let lines: string[] = [];
  for (let l of processedLines) {
    let trimmed = l.trim();
    let multiOptMatches = trimmed.match(/(?:(?:^|\s+)[\(\（\[]?(?:[ক-ঘa-d]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)[\)\）\]\.\:]\s+|[\(\（\[](?:[ক-ঘa-d]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)[\)\）\]]\s*)/gi);
    if (multiOptMatches && multiOptMatches.length > 1) {
      let parts = trimmed.split(/(?=(?:^|\s+)[\(\（\[]?(?:[ক-ঘa-d]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)[\)\）\]\.\:]\s+|[\(\（\[](?:[ক-ঘa-d]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)[\)\）\]]\s*)/gi).map(p => p.trim()).filter(Boolean);
      lines.push(...parts);
    } else {
      let isQStart = /^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]\s*(.*)/.test(trimmed);
      let tabOrSpaceParts = trimmed.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (!isQStart && !checkIsRefTag(trimmed) && tabOrSpaceParts.length >= 2 && tabOrSpaceParts.length <= 4) {
        if (tabOrSpaceParts.every(p => p.length < 60 && !/[।\?]/.test(p))) {
          lines.push(...tabOrSpaceParts);
          continue;
        }
      }
      lines.push(l);
    }
  }

  let blocks: QuestionBlock[] = [];
  let currentBlock: QuestionBlock | null = null;
  let pendingHeaderRefs: string[] = [];
  let currentBlockLineIndex = 0;
  let implicitOptStartIdx = -1;
  let lastActiveField: 'question' | 'option0' | 'option1' | 'option2' | 'option3' | 'explanation' = 'question';

  const getOptionIndex = (charStr: string): number | undefined => {
    if (!charStr) return undefined;
    let lower = charStr.toLowerCase().trim();
    const map: Record<string, number> = {
      'ক': 0, 'a': 0, '1': 0, '01': 0, '১': 0, '০১': 0, 'i': 0,
      'খ': 1, 'b': 1, '2': 1, '02': 1, '২': 1, '০২': 1, 'ii': 1,
      'গ': 2, 'c': 2, '3': 2, '03': 2, '৩': 2, '০৩': 2, 'iii': 2,
      'ঘ': 3, 'd': 3, '4': 3, '04': 3, '৪': 3, '০৪': 3, 'iv': 3,
    };
    return map[lower];
  };

  const isExplicitOption = (line: string): boolean => {
    if (!line) return false;
    let match = line.match(/^\s*[\(\（\[]?\s*([ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)\s*[\)\）\]\.\-\:\s]\s*(.*)/i);
    if (!match) return false;
    let idx = getOptionIndex(match[1]);
    return idx !== undefined;
  };

  const isStandaloneAnswer = (line: string): { isAnswer: boolean; optIdx?: number } => {
    if (!line) return { isAnswer: false };
    let trimmed = line.trim();
    let match = trimmed.match(/^(?:ans|answer|উত্তর|সঠিক উত্তর)?[\:\-\s\.]*[\(\（\[]?([ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.]?\s*(\d*)?\s*$/i);
    if (match) {
      let optIdx = getOptionIndex(match[1]);
      if (optIdx !== undefined) {
        return { isAnswer: true, optIdx };
      }
    }
    return { isAnswer: false };
  };

  const isQuestionStart = (line: string, cb?: QuestionBlock | null): boolean => {
    let match1 = line.match(/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]\s*(.*)/);
    let match2 = line.match(/^\s*([০-৯\d]{1,2})\s+(.*)/);

    let matchedNumStr = match1 ? match1[1] : (match2 ? match2[1] : "");
    let restText = match1 ? match1[2].trim() : (match2 ? match2[2].trim() : "");

    if (matchedNumStr) {
      if (restText && checkIsRefTag(restText)) return false;

      let numVal = parseInt(convertToEnglishDigits(matchedNumStr), 10);

      if (cb) {
        let currNumVal = parseInt(convertToEnglishDigits((cb.questionNumber || '').replace(/[^\d]/g, '')), 10);
        let filledOptsCount = cb.options.filter(Boolean).length;
        let isExpActive = Boolean(cb.explanation && cb.explanation.trim());

        if (filledOptsCount < 4 && !isExpActive) {
          if (!isNaN(numVal) && numVal >= 1 && numVal <= 4) {
            if (isNaN(currNumVal) || currNumVal > 4 || numVal !== currNumVal + 1) {
              return false;
            }
          }
          if (isExplicitOption(line)) return false;
        }
      }

      if (match1) return true;
      if (match2) {
        return /^[A-Z"'\u0980-\u09FF\(\[\{]/.test(restText);
      }
    }

    if (cb && (cb.options.filter(Boolean).length >= 2 || cb.explanation.trim().length > 0)) {
      if (/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*$/.test(line)) {
        let numVal = parseInt(convertToEnglishDigits(line.replace(/[^\d]/g, '')), 10);
        let currNumVal = parseInt(convertToEnglishDigits((cb.questionNumber || '').replace(/[^\d]/g, '')), 10);
        if (!isNaN(numVal) && (isNaN(currNumVal) || numVal === currNumVal + 1 || numVal > currNumVal)) {
          return true;
        }
      }
    }
    return false;
  };

  const isRefTag = (line: string): boolean => {
    return checkIsRefTag(line);
  };

  const isExplanationStart = (line: string): boolean => {
    return /^\s*(?:ব্যাখ্যা|ব্যাখ্যাঃ|উত্তরের\s*ব্যাখ্যা|উত্তরের\s*ব্যাখ্যাঃ|Explanation|Expla|Expl|Exp|বিবরণ|Note|Ans|Answer|সঠিক\s*উত্তর|উত্তর|বিশেষ\s*দ্রষ্টব্য|জেনে\s*রাখো|জেনে\s*রাখা\s*ভালো)[\:\-\—\.\s]/i.test(line);
  };

  const extractQNum = (line: string) => {
    let match = line.match(/^\s*([০-৯\d]{1,3})\s*[\.\)و।\-:]?\s*(.*)/);
    if (!match) return { num: "", rest: line };
    return { num: match[1], rest: match[2] };
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (isQuestionStart(line, currentBlock)) {
      if (currentBlock) {
        if (pendingHeaderRefs.length > 0) {
          currentBlock.outsideRefAfter = currentBlock.outsideRefAfter
            ? currentBlock.outsideRefAfter + "\n" + pendingHeaderRefs.join("\n")
            : pendingHeaderRefs.join("\n");
          pendingHeaderRefs = [];
        }
        blocks.push(currentBlock);
      }

      let { num, rest } = extractQNum(line);
      let cleanRest = rest;
      let hasTick = /[✓✔\*√#]/.test(cleanRest) || /background-color/i.test(cleanRest) || /class=["']?highlight/i.test(cleanRest);
      cleanRest = cleanRest.replace(/[✓✔\*√#]/g, '').trim();

      let blockSubject = "";
      let qText = "";

      if (!cleanRest || isSubjectCodeTag(cleanRest)) {
        blockSubject = cleanRest;
        if (i + 1 < lines.length && !isExplicitOption(lines[i + 1]) && !isRefTag(lines[i + 1])) {
          let nextLine = lines[i + 1].replace(/[✓✔\*√#]/g, '').trim();
          if (isSubjectCodeTag(nextLine) && !blockSubject) {
            blockSubject = nextLine;
            if (i + 2 < lines.length && !isExplicitOption(lines[i + 2]) && !isRefTag(lines[i + 2])) {
              qText = lines[i + 2].replace(/[✓✔\*√#]/g, '').trim();
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

      let bracketMatch = qText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      if (!bracketMatch) {
        bracketMatch = qText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      }
      let extractedRef = "";
      if (bracketMatch) {
        let potentialRef = bracketMatch[2].replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();
        if (potentialRef && !/^(?:ক|খ|গ|ঘ|ক\)|খ\)|গ\)|ঘ\)|a\)|b\)|c\)|d\))/i.test(potentialRef)) {
          qText = bracketMatch[1].trim();
          extractedRef = potentialRef;
        }
      }

      let initialRefBefore = "";
      if (pendingHeaderRefs.length > 0) {
        initialRefBefore = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
        pendingHeaderRefs = [];
      }

      currentBlock = {
        questionNumber: num,
        subjectCode: blockSubject,
        questionText: qText,
        options: ["", "", "", ""],
        reference: extractedRef,
        outsideRefBefore: initialRefBefore,
        outsideRefAfter: "",
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
        let tickIdx = blockLines.findIndex(l => /[✓✔\*√#]/.test(l));
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
            if (lastQLine.match(/(\?|\]|\.|\-|:)$/)) score += 2;
            if (lastQLine.match(/\]$/)) score += 2;
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
      continue;
    }

    if (!currentBlock) {
      if (line.trim()) {
        pendingHeaderRefs.push(line.trim());
      }
      continue;
    }

    currentBlockLineIndex++;
    let hasTick = /[✓✔\*√#]/.test(line) || /background-color/i.test(line) || /class=["']?highlight/i.test(line);
    let cleanLine = line.replace(/[✓✔\*√#]/g, '').trim();

    if (isRefTag(line)) {
      if (currentBlock) {
        let cleanRef = cleanLine.replace(/^[\[\（\(]/, '').replace(/[\]\）\)]$/, '').trim();
        if (isPageBookRefTag(cleanLine) || /^(?:MQB|TB|PB|P|Page|Sec|Chap|Ref)[\,\.\-\:\s]/i.test(cleanLine)) {
          if (lastActiveField === 'explanation' || currentBlock.options.some(o => o !== "")) {
            currentBlock.outsideRefAfter = currentBlock.outsideRefAfter ? cleanMergeReferenceLines(currentBlock.outsideRefAfter + " " + cleanRef) : cleanRef;
          } else {
            currentBlock.outsideRefBefore = currentBlock.outsideRefBefore ? cleanMergeReferenceLines(currentBlock.outsideRefBefore + " " + cleanRef) : cleanRef;
          }
        } else {
          currentBlock.reference = cleanMergeReferenceLines(currentBlock.reference ? currentBlock.reference + " " + cleanRef : cleanRef);
        }
      }
      continue;
    }

    if (isExplanationStart(cleanLine)) {
      lastActiveField = "explanation";
      currentBlock.explanation = currentBlock.explanation
        ? currentBlock.explanation + "\n" + cleanLine
        : cleanLine;
      
      let ansMatch = cleanLine.match(/(?:সঠিক উত্তর|উত্তর|Ans|Answer)[:\s]*[\(\（]?([ক-ঘa-d])[\)\）]?/i);
      if (ansMatch) {
        let optChar = ansMatch[1].toLowerCase();
        let optIdx = ({'ক': 0, 'a': 0, 'খ': 1, 'b': 1, 'গ': 2, 'c': 2, 'ঘ': 3, 'd': 3} as Record<string, number>)[optChar];
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
      let match = line.match(/^\s*[\(\（\[]?\s*([ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪]|i{1,3}|iv)\s*[\)\）\]\.\-\:\s]\s*(.*)/i);
      if (match) {
        let optIdx = getOptionIndex(match[1]);
        if (optIdx !== undefined) {
          lastActiveField = `option${optIdx}` as any;
          let optText = match[2].replace(/[✓✔\*√#]/g, '').trim();
          currentBlock.options[optIdx] = optText;
          if (hasTick || /[✓✔\*√#]/.test(match[2])) {
            currentBlock.hasTickMark = true;
            currentBlock.correctAnswerIndex = optIdx;
          }
          continue;
        }
      }
    }

    let standaloneAns = isStandaloneAnswer(cleanLine);
    if (standaloneAns.isAnswer) {
      if (currentBlock.correctAnswerIndex === -1 && standaloneAns.optIdx !== undefined) {
        currentBlock.correctAnswerIndex = standaloneAns.optIdx;
        currentBlock.hasTickMark = true;
      }
      continue;
    }

    if (/^\s*[1১]\s*$/.test(cleanLine) && currentBlock.options.some(o => o !== "")) {
      continue;
    }

    if (implicitOptStartIdx === -1) {
      if (lastActiveField === 'question') {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + " " + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (lastActiveField.startsWith('option')) {
        let optIdx = parseInt(lastActiveField.replace('option', ''));
        if (optIdx === 3 && (currentBlock.options[3].trim().length > 0 || currentBlock.options.every(Boolean))) {
          lastActiveField = 'explanation';
          currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
          if (hasTick && currentBlock.correctAnswerIndex === -1) {
            currentBlock.hasTickMark = true;
          }
        } else {
          currentBlock.options[optIdx] = currentBlock.options[optIdx] ? currentBlock.options[optIdx] + " " + cleanLine : cleanLine;
          if (hasTick) {
            currentBlock.hasTickMark = true;
            currentBlock.correctAnswerIndex = optIdx;
          }
        }
      } else if (lastActiveField === 'explanation') {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    } else {
      if (currentBlockLineIndex < implicitOptStartIdx) {
        currentBlock.questionText = currentBlock.questionText ? currentBlock.questionText + " " + cleanLine : cleanLine;
        if (hasTick) currentBlock.hasTickMark = true;
      } else if (currentBlockLineIndex >= implicitOptStartIdx && currentBlockLineIndex < implicitOptStartIdx + 4) {
        let optIdx = currentBlockLineIndex - implicitOptStartIdx;
        currentBlock.options[optIdx] = cleanLine;
        lastActiveField = `option${optIdx}` as any;
        if (hasTick) {
          currentBlock.hasTickMark = true;
          currentBlock.correctAnswerIndex = optIdx;
        }
      } else {
        currentBlock.explanation = currentBlock.explanation ? currentBlock.explanation + " " + cleanLine : cleanLine;
        lastActiveField = 'explanation';
        if (hasTick && currentBlock.correctAnswerIndex === -1) {
          currentBlock.hasTickMark = true;
        }
      }
    }
  }

  if (currentBlock) {
    if (pendingHeaderRefs.length > 0) {
      let mergedPending = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
      currentBlock.outsideRefAfter = currentBlock.outsideRefAfter
        ? cleanMergeReferenceLines(currentBlock.outsideRefAfter + " " + mergedPending)
        : mergedPending;
      pendingHeaderRefs = [];
    }
    blocks.push(currentBlock);
  } else if (pendingHeaderRefs.length > 0 && blocks.length > 0) {
    let mergedPending = cleanMergeReferenceLines(pendingHeaderRefs.join(" "));
    blocks[blocks.length - 1].outsideRefAfter = blocks[blocks.length - 1].outsideRefAfter
      ? cleanMergeReferenceLines(blocks[blocks.length - 1].outsideRefAfter + " " + mergedPending)
      : mergedPending;
    pendingHeaderRefs = [];
  }

  blocks.forEach(b => {
    // Clean trailing bracketed reference tag from question text
    if (b.questionText) {
      let refTagMatch = b.questionText.match(/(.*?)\s*([\[\(][^\[\(]*?(?:JU|DU|RU|CU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA|Medical|Dental|Engineering|IBA|MQB|TB|PB|Ref|Page|Chap|Sec|বিশ্ববিদ্যালয়|ভার্সিটি|কমিশন|বোর্ড|বিসিএস|'\d{2})[\s\S]*?[\]\)])\s*$/i);
      if (refTagMatch) {
        b.questionText = refTagMatch[1].trim();
        let refText = refTagMatch[2].replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();
        b.reference = b.reference ? b.reference + "; " + refText : refText;
      }
    }

    // 1. Clean options
    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        let optVal = b.options[i].trim();
        if (optVal.includes(']') && (optVal.includes('JU') || optVal.includes('DU') || optVal.includes('RU') || optVal.includes('CU') || /['\d]{2,}/.test(optVal))) {
          let closeBracketIdx = optVal.lastIndexOf(']');
          let refPart = optVal.substring(0, closeBracketIdx + 1).replace(/[\[\]]/g, '').trim();
          let cleanOpt = optVal.substring(closeBracketIdx + 1).trim();
          if (cleanOpt) {
            optVal = cleanOpt;
            b.options[i] = cleanOpt;
            if (refPart) {
              b.reference = b.reference ? b.reference + "; " + refPart : refPart;
            }
          }
        }
        let sa = isStandaloneAnswer(optVal);
        if (sa.isAnswer) {
          b.options[i] = "";
          if (b.correctAnswerIndex === -1 && sa.optIdx !== undefined) {
            b.correctAnswerIndex = sa.optIdx;
            b.hasTickMark = true;
          }
        } else if (checkIsRefTag(optVal)) {
          b.options[i] = "";
          b.outsideRefAfter = b.outsideRefAfter ? b.outsideRefAfter + "\n" + optVal : optVal;
        } else {
          let m = b.options[i].match(/^(.*?)\s+[\(\（]?([ক-ঘa-d])[\)\）]?\s*(\d*)$/i);
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
    }

    // 2. Clean explanation
    if (b.explanation) {
      let expVal = b.explanation.trim();
      let sa = isStandaloneAnswer(expVal);
      let isJustAnsTag = /^\s*(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer)?[\:\-\s]*[\(\（\[]?[ক-ঘa-d1-4১-৪0-4][\)\）\]]?\s*$/i.test(expVal);
      if (sa.isAnswer || isJustAnsTag) {
        if (b.correctAnswerIndex === -1 && sa.optIdx !== undefined) {
          b.correctAnswerIndex = sa.optIdx;
          b.hasTickMark = true;
        }
        b.explanation = "";
      } else if (checkIsRefTag(expVal)) {
        b.outsideRefAfter = b.outsideRefAfter ? b.outsideRefAfter + "\n" + expVal : expVal;
        b.explanation = "";
      } else {
        b.explanation = cleanExplanationText(expVal);
      }
    }

    // 3. Clean question text
    if (b.questionText) {
      let qLines = b.questionText.split('\n').map(l => l.trim()).filter(Boolean);
      let newQLines: string[] = [];
      for (let ql of qLines) {
        let sa = isStandaloneAnswer(ql);
        if (sa.isAnswer) {
          if (b.correctAnswerIndex === -1 && sa.optIdx !== undefined) {
            b.correctAnswerIndex = sa.optIdx;
            b.hasTickMark = true;
          }
        } else if (checkIsRefTag(ql)) {
          b.outsideRefAfter = b.outsideRefAfter ? b.outsideRefAfter + "\n" + ql : ql;
        } else {
          newQLines.push(ql);
        }
      }
      b.questionText = newQLines.join('\n').trim();
    }

    // Automatically repair and separate merged/implicit options into individual boxes
    repairImplicitOptions(b);

    for (let i = 0; i < 4; i++) {
      if (b.options[i]) {
        b.options[i] = b.options[i].replace(/[✓✔\*√#]/g, '').trim();
      }
    }
    
    b.questionText = (b.questionText || "").replace(/[✓✔\*√#]/g, '').trim();
  });

  // Post-processing cleanup: Filter out empty or reference-only dummy blocks
  let cleanedBlocks: QuestionBlock[] = [];
  for (let idx = 0; idx < blocks.length; idx++) {
    let b = blocks[idx];
    let hasNoOptions = b.options.every(o => !o.trim());
    let isQTextRef = isPageBookRefTag(b.questionText) || checkIsRefTag(b.questionText);

    if (hasNoOptions && (isQTextRef || !b.questionText.trim())) {
      let refVal = (b.questionText || "").trim();
      if (b.outsideRefBefore) refVal = b.outsideRefBefore + (refVal ? "\n" + refVal : "");
      if (b.outsideRefAfter) refVal = (refVal ? refVal + "\n" : "") + b.outsideRefAfter;

      if (cleanedBlocks.length > 0 && refVal) {
        cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter = cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter
          ? cleanedBlocks[cleanedBlocks.length - 1].outsideRefAfter + "\n" + refVal
          : refVal;
      } else if (idx + 1 < blocks.length && refVal) {
        blocks[idx + 1].outsideRefBefore = blocks[idx + 1].outsideRefBefore
          ? refVal + "\n" + blocks[idx + 1].outsideRefBefore
          : refVal;
      }
    } else {
      cleanedBlocks.push(b);
    }
  }

  return cleanedBlocks;
}

export function generateFormattedTableHtml(
  rawText: string,
  fontType: 'SolaimanLipi' | 'SutonnyMJ',
  subjectCode: string = 'Ban',
  customDictStr: string = "",
  alignRight: boolean = false
): string {
  if (!rawText || !rawText.trim()) return "";
  let blocks = parseQuestions(rawText).slice(0, 200);
  if (blocks.length === 0) {
    let lines = rawText.trim().split('\n').filter(l => l.trim());
    let formattedText = lines.map(l => formatHtmlTextPiece(l.trim(), fontType, customDictStr)).join('<br/>');
    return `<p align="left" style="margin: 4px 0; padding: 0; font-family: Times New Roman, 'Times New Roman', serif; font-size: 10pt; font-weight: normal; line-height: 1.2; text-align: left;">${formattedText}</p>`;
  }
  let outputHtml = "";

  const trStyle = "height: 16px;";
  const leftFontFamily = fontType === 'SutonnyMJ' ? "SutonnyMJ, 'SutonnyMJ', sans-serif" : "SolaimanLipi, 'SolaimanLipi', sans-serif";
  const tdWideStyle = `padding: 2px 6px; margin: 0; font-weight: normal; border: 1px solid #000; font-size: 10pt; height: 16px; vertical-align: middle; line-height: 1.2; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; text-align: left; font-family: ${leftFontFamily};`;
  const tdNarrowStyle = "padding: 2px 6px; margin: 0; font-weight: normal; border: 1px solid #000; font-size: 10pt; height: 16px; vertical-align: middle; line-height: 1.2; width: 60px; min-width: 60px; max-width: 60px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; font-family: Times New Roman, 'Times New Roman', serif;";

  blocks.forEach((block, index) => {
    let rawNum = block.questionNumber || String(index + 1);
    let engNum = convertToEnglishDigits(rawNum);
    let qNum = String(engNum).length === 1 && /^\d+$/.test(engNum) ? "0" + engNum : engNum;
    
    let correctLetter = (block.hasTickMark && block.correctAnswerIndex !== -1)
      ? (['a', 'b', 'c', 'd'][block.correctAnswerIndex] || '')
      : '';

    let tableHtml = "";

    let combinedBefore = "";
    if (block.outsideRefBefore && block.outsideRefBefore.trim()) {
      combinedBefore = cleanMergeReferenceLines(block.outsideRefBefore);
    }
    if (block.outsideRefAfter && block.outsideRefAfter.trim()) {
      combinedBefore = combinedBefore ? cleanMergeReferenceLines(combinedBefore + " " + block.outsideRefAfter) : cleanMergeReferenceLines(block.outsideRefAfter);
    }
    if (block.reference && block.reference.trim()) {
      let refText = `[${block.reference.trim()}]`;
      combinedBefore = combinedBefore ? cleanMergeReferenceLines(combinedBefore + " " + refText) : refText;
    }

    if (combinedBefore && combinedBefore.trim()) {
      let mergedRef = cleanMergeReferenceLines(combinedBefore);
      let formattedRefBefore = formatHtmlTextPiece(mergedRef, fontType, customDictStr);
      tableHtml += `<p align="left" style="margin: 0; padding: 0; margin-top: 0; margin-bottom: 2px; font-family: Times New Roman, 'Times New Roman', serif; font-size: 10pt; font-weight: normal; line-height: 1.2; text-align: left;">${formattedRefBefore}</p>`;
    }

    tableHtml += `<table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; background: transparent !important; margin-bottom: 2px; word-break: break-word; overflow-wrap: break-word;">`;
    
    let effSubject = block.subjectCode || subjectCode || 'GK';
    let formattedCorrectLetter = correctLetter ? `<span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${correctLetter}</span>` : "";
    let cleanExpl = cleanExplanationText(block.explanation || "");

    if (!alignRight) {
      // Row 1: Question Number | Subject Code
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdWideStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${qNum}</span></td>
        <td style="text-align: left; width: 60px; ${tdNarrowStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${effSubject}</span></td>
      </tr>`;

      // Row 2: Question Text
      let fullQ = block.questionText;
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdWideStyle}">${formatHtmlTextPiece(fullQ, fontType, customDictStr)}</td>
        <td style="text-align: left; ${tdNarrowStyle}"></td>
      </tr>`;

      // Rows 3 - 6: 4 Options
      for (let i = 0; i < 4; i++) {
        let optRawText = block.options[i] || "";
        let isCorrect = block.hasTickMark && (i === block.correctAnswerIndex);
        let formattedOptText = formatHtmlTextPiece(optRawText, fontType, customDictStr);

        if (isCorrect && optRawText.trim() !== "") {
          formattedOptText = `<span style="background-color: #00ff00; mso-highlight: lime; padding: 0 2px;"><mark style="background-color: #00ff00; mso-highlight: lime;">${formattedOptText}</mark></span>`;
        }
        tableHtml += `<tr style="${trStyle}">
          <td style="text-align: left; ${tdWideStyle}">${formattedOptText}</td>
          <td style="text-align: left; ${tdNarrowStyle}"></td>
        </tr>`;
      }

      // Row 7: Explanation
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdWideStyle}">${formatHtmlTextPiece(cleanExpl, fontType, customDictStr)}</td>
        <td style="text-align: left; ${tdNarrowStyle}"></td>
      </tr>`;

      // Row 8: Correct Option Letter | Marks (1)
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdWideStyle}">${formattedCorrectLetter}</td>
        <td style="text-align: left; width: 60px; ${tdNarrowStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">1</span></td>
      </tr>`;
    } else {
      // Text Right Formatter (Content in Right Box)
      // Row 1: Question Number (Left) | Subject Code (Right)
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; width: 60px; ${tdNarrowStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${qNum}</span></td>
        <td style="text-align: left; ${tdWideStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${effSubject}</span></td>
      </tr>`;

      // Row 2: Question Text (Right)
      let fullQ = block.questionText;
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdNarrowStyle}"></td>
        <td style="text-align: left; ${tdWideStyle}">${formatHtmlTextPiece(fullQ, fontType, customDictStr)}</td>
      </tr>`;

      // Rows 3 - 6: 4 Options (Right)
      for (let i = 0; i < 4; i++) {
        let optRawText = block.options[i] || "";
        let isCorrect = block.hasTickMark && (i === block.correctAnswerIndex);
        let formattedOptText = formatHtmlTextPiece(optRawText, fontType, customDictStr);

        if (isCorrect && optRawText.trim() !== "") {
          formattedOptText = `<span style="background-color: #00ff00; mso-highlight: lime; padding: 0 2px;"><mark style="background-color: #00ff00; mso-highlight: lime;">${formattedOptText}</mark></span>`;
        }
        tableHtml += `<tr style="${trStyle}">
          <td style="text-align: left; ${tdNarrowStyle}"></td>
          <td style="text-align: left; ${tdWideStyle}">${formattedOptText}</td>
        </tr>`;
      }

      // Row 7: Explanation (Right)
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdNarrowStyle}"></td>
        <td style="text-align: left; ${tdWideStyle}">${formatHtmlTextPiece(cleanExpl, fontType, customDictStr)}</td>
      </tr>`;

      // Row 8: Correct Option Letter (Left) | Marks (1) (Right)
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; width: 60px; ${tdNarrowStyle}">${formattedCorrectLetter}</td>
        <td style="text-align: left; ${tdWideStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">1</span></td>
      </tr>`;
    }

    tableHtml += `</table>`;

    // Only add a separator paragraph if this is not the last table AND the next table has no reference (which already acts as a separator)
    const nextBlock = blocks[index + 1];
    const nextHasRef = nextBlock && (
      (nextBlock.outsideRefBefore && nextBlock.outsideRefBefore.trim()) ||
      (nextBlock.outsideRefAfter && nextBlock.outsideRefAfter.trim()) ||
      (nextBlock.reference && nextBlock.reference.trim())
    );

    if (index < blocks.length - 1 && !nextHasRef) {
      tableHtml += `<p style="margin: 0; padding: 0; height: 6px; line-height: 6px; font-size: 1px;">&nbsp;</p>`;
    }

    outputHtml += tableHtml;
  });

  return outputHtml;
}

export function formatBlocksToStructuredText(blocks: QuestionBlock[]): string {
  let result = "";
  blocks.forEach((b, idx) => {
    result += `[BLOCK ${idx + 1}]\n`;
    if (b.outsideRefBefore) {
      result += `OUTSIDE_REF_BEFORE: ${b.outsideRefBefore}\n`;
    }
    if (b.questionText) {
      result += `Q: ${b.questionText}\n`;
    }
    if (b.options[0]) result += `A: ${b.options[0]}\n`;
    if (b.options[1]) result += `B: ${b.options[1]}\n`;
    if (b.options[2]) result += `C: ${b.options[2]}\n`;
    if (b.options[3]) result += `D: ${b.options[3]}\n`;
    if (b.reference) result += `REF: ${b.reference}\n`;
    if (b.explanation) result += `EXP: ${b.explanation}\n`;
    if (b.outsideRefAfter) {
      result += `OUTSIDE_REF_AFTER: ${b.outsideRefAfter}\n`;
    }
    result += `\n`;
  });
  return result.trim();
}

export function parseStructuredBlocks(text: string): QuestionBlock[] {
  if (!text || !text.trim()) return [];
  let blockRegex = /\[BLOCK\s*(\d+)\]/gi;
  let matches = [...text.matchAll(blockRegex)];
  
  if (matches.length === 0) return [];

  let blocks: QuestionBlock[] = [];

  for (let i = 0; i < matches.length; i++) {
    let match = matches[i];
    let startIndex = match.index! + match[0].length;
    let endIndex = (i + 1 < matches.length) ? matches[i + 1].index! : text.length;
    let blockContent = text.slice(startIndex, endIndex);

    let qText = "";
    let options: [string, string, string, string] = ["", "", "", ""];
    let reference = "";
    let outsideRefBefore = "";
    let outsideRefAfter = "";
    let explanation = "";

    let lines = blockContent.split('\n');
    lines.forEach(l => {
      let trimmed = l.trim();
      if (!trimmed) return;
      if (/^OUTSIDE_REF_BEFORE\s*[\:\-\.]/i.test(trimmed)) {
        outsideRefBefore = trimmed.replace(/^OUTSIDE_REF_BEFORE\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^OUTSIDE_REF_AFTER\s*[\:\-\.]/i.test(trimmed)) {
        outsideRefAfter = trimmed.replace(/^OUTSIDE_REF_AFTER\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^Q\s*[\:\-\.]/i.test(trimmed)) {
        qText = trimmed.replace(/^Q\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^A\s*[\:\-\.]/i.test(trimmed)) {
        options[0] = trimmed.replace(/^A\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^B\s*[\:\-\.]/i.test(trimmed)) {
        options[1] = trimmed.replace(/^B\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^C\s*[\:\-\.]/i.test(trimmed)) {
        options[2] = trimmed.replace(/^C\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^D\s*[\:\-\.]/i.test(trimmed)) {
        options[3] = trimmed.replace(/^D\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^REF\s*[\:\-\.]/i.test(trimmed)) {
        reference = trimmed.replace(/^REF\s*[\:\-\.]\s*/i, '').trim();
      } else if (/^EXP\s*[\:\-\.]/i.test(trimmed)) {
        explanation = trimmed.replace(/^EXP\s*[\:\-\.]\s*/i, '').trim();
      }
    });

    blocks.push({
      questionNumber: String(i + 1),
      questionText: qText,
      options: options,
      reference: reference,
      outsideRefBefore: outsideRefBefore,
      outsideRefAfter: outsideRefAfter,
      explanation: explanation,
      correctAnswerIndex: -1,
      hasTickMark: false
    });
  }

  return blocks;
}

export function generateVersionFormattedTableHtml(
  rawText: string,
  translatedText: string,
  fontType: 'SolaimanLipi' | 'SutonnyMJ' = 'SolaimanLipi',
  subjectCode: string = 'GK',
  customDictStr: string = ""
): string {
  if (!rawText || !rawText.trim()) return "";
  let origBlocks = parseVersionQuestions(rawText).slice(0, 200);

  let transBlocks: QuestionBlock[] = [];
  if (translatedText && /\[BLOCK\s*\d+\]/i.test(translatedText)) {
    transBlocks = parseStructuredBlocks(translatedText);
  } else if (translatedText && translatedText.trim()) {
    transBlocks = parseVersionQuestions(translatedText).slice(0, 200);
  }

  let outputHtml = "";

  const trStyle = "height: 16px;";
  const leftFontFamily = fontType === 'SutonnyMJ' ? "SutonnyMJ, 'SutonnyMJ', sans-serif" : "SolaimanLipi, 'SolaimanLipi', sans-serif";
  const tdLeftStyle = `padding: 2px 6px; margin: 0; font-weight: normal; border: 1px solid #000; font-size: 10pt; height: 16px; vertical-align: middle; line-height: 1.2; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; font-family: ${leftFontFamily};`;
  const tdRightStyle = "padding: 2px 6px; margin: 0; font-weight: normal; border: 1px solid #000; font-size: 10pt; height: 16px; vertical-align: middle; line-height: 1.2; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; font-family: Times New Roman, 'Times New Roman', serif;";

  origBlocks.forEach((block, index) => {
    let transBlock = transBlocks[index];
    let rawNum = block.questionNumber || String(index + 1);
    let engNum = convertToEnglishDigits(rawNum);
    let qNum = String(engNum).length === 1 && /^\d+$/.test(engNum) ? "0" + engNum : engNum;
    
    let correctLetter = (block.hasTickMark && block.correctAnswerIndex !== -1)
      ? (['a', 'b', 'c', 'd'][block.correctAnswerIndex] || '')
      : (transBlock && transBlock.hasTickMark && transBlock.correctAnswerIndex !== -1 ? (['a', 'b', 'c', 'd'][transBlock.correctAnswerIndex] || '') : '');

    let tableHtml = "";

    let combinedBefore = "";
    if (block.outsideRefBefore && block.outsideRefBefore.trim()) {
      combinedBefore = cleanMergeReferenceLines(block.outsideRefBefore);
    }
    if (block.reference && block.reference.trim()) {
      let refText = `[${block.reference.trim()}]`;
      combinedBefore = combinedBefore ? cleanMergeReferenceLines(combinedBefore + " " + refText) : refText;
    }

    if (combinedBefore && combinedBefore.trim()) {
      let mergedRef = cleanMergeReferenceLines(combinedBefore);
      let formattedRefBefore = formatHtmlTextPiece(mergedRef, fontType, customDictStr);
      tableHtml += `<p align="center" style="margin: 0; padding: 0; margin-top: 0; margin-bottom: 2px; font-family: Times New Roman, 'Times New Roman', serif; font-size: 10pt; font-weight: bold; line-height: 1.2; text-align: center;">${formattedRefBefore}</p>`;
    }

    tableHtml += `<table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; background: transparent !important; margin-bottom: 2px; word-break: break-word; overflow-wrap: break-word;">`;
    
    let effSubject = block.subjectCode || subjectCode || 'GK';

    // Row 1: Question Number | Subject Code
    tableHtml += `<tr style="${trStyle}">
      <td style="text-align: left; ${tdLeftStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${qNum}</span></td>
      <td style="text-align: left; ${tdRightStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${effSubject}</span></td>
    </tr>`;

    // Row 2: Question Text (Original Bengali on Left, Translated English on Right)
    let fullOrigQ = block.questionText;
    let origQ = formatHtmlTextPiece(fullOrigQ, fontType, customDictStr);

    let transQText = (transBlock && transBlock.questionText) ? transBlock.questionText : localRuleBasedTranslate(block.questionText);
    let formattedTransQ = formatHtmlTextPiece(transQText, 'SolaimanLipi', customDictStr);

    tableHtml += `<tr style="${trStyle}">
      <td style="text-align: left; ${tdLeftStyle}">${origQ}</td>
      <td style="text-align: left; ${tdRightStyle}">${formattedTransQ}</td>
    </tr>`;

    // Rows 3 - 6: 4 Options
    for (let i = 0; i < 4; i++) {
      let optRawText = block.options[i] || "";
      let isCorrect = (block.hasTickMark && i === block.correctAnswerIndex) || (transBlock && transBlock.hasTickMark && i === transBlock.correctAnswerIndex);
      let formattedOptText = formatHtmlTextPiece(optRawText, fontType, customDictStr);

      let transOptRawText = (transBlock && transBlock.options && transBlock.options[i]) ? transBlock.options[i] : localRuleBasedTranslate(optRawText);

      let formattedTransOptText = formatHtmlTextPiece(transOptRawText, 'SolaimanLipi', customDictStr);

      if (isCorrect && (optRawText.trim() !== "" || transOptRawText.trim() !== "")) {
        formattedOptText = `<span style="background-color: #00ff00; mso-highlight: lime; padding: 0 2px;"><mark style="background-color: #00ff00; mso-highlight: lime;">${formattedOptText}</mark></span>`;
        if (transOptRawText.trim() !== "") {
          formattedTransOptText = `<span style="background-color: #00ff00; mso-highlight: lime; padding: 0 2px;"><mark style="background-color: #00ff00; mso-highlight: lime;">${formattedTransOptText}</mark></span>`;
        }
      }
      tableHtml += `<tr style="${trStyle}">
        <td style="text-align: left; ${tdLeftStyle}">${formattedOptText}</td>
        <td style="text-align: left; ${tdRightStyle}">${formattedTransOptText}</td>
      </tr>`;
    }

    // Row 7: Explanation
    let origExp = formatHtmlTextPiece(block.explanation || "", fontType, customDictStr);
    let transExp = (transBlock && transBlock.explanation) ? transBlock.explanation : localRuleBasedTranslate(block.explanation || "");
    let formattedTransExp = formatHtmlTextPiece(transExp, 'SolaimanLipi', customDictStr);
    tableHtml += `<tr style="${trStyle}">
      <td style="text-align: left; ${tdLeftStyle}">${origExp}</td>
      <td style="text-align: left; ${tdRightStyle}">${formattedTransExp}</td>
    </tr>`;

    // Row 8: Correct Option Letter | Marks (1)
    let formattedCorrectLetter = correctLetter ? `<span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">${correctLetter}</span>` : "";
    tableHtml += `<tr style="${trStyle}">
      <td style="text-align: left; ${tdLeftStyle}">${formattedCorrectLetter}</td>
      <td style="text-align: left; ${tdRightStyle}"><span class="eng-text" style="font-family: Times New Roman, 'Times New Roman', serif;">1</span></td>
    </tr>`;

    tableHtml += `</table>`;

    if (block.outsideRefAfter && block.outsideRefAfter.trim()) {
      let formattedRefAfter = formatHtmlTextPiece(block.outsideRefAfter, fontType, customDictStr);
      tableHtml += `<p style="margin: 0; padding: 0; margin-top: 2px; margin-bottom: 2px; font-family: Times New Roman, 'Times New Roman', serif; font-size: 10pt; font-weight: normal; line-height: 1.2;">${formattedRefAfter}</p>`;
    } else {
      const nextBlock = origBlocks[index + 1];
      const nextHasRef = nextBlock && (
        (nextBlock.outsideRefBefore && nextBlock.outsideRefBefore.trim()) ||
        (nextBlock.reference && nextBlock.reference.trim())
      );
      if (index < origBlocks.length - 1 && !nextHasRef) {
        tableHtml += `<p style="margin: 0; padding: 0; height: 6px; line-height: 6px; font-size: 1px;">&nbsp;</p>`;
      }
    }

    outputHtml += tableHtml;
  });

  return outputHtml;
}

export function formatConverterTextOutput(rawText: string): string {
  if (!rawText || !rawText.trim()) return "";
  let blocks = parseQuestions(rawText);
  if (blocks.length === 0) {
    return rawText.trim();
  }
  let resultStr = "";
  blocks.forEach((item, idx) => {
    let rawNum = item.questionNumber || String(idx + 1);
    let engNum = convertToEnglishDigits(rawNum);
    let numStr = String(engNum).length === 1 && /^\d+$/.test(engNum) ? "0" + engNum : engNum;

    if (item.outsideRefBefore && item.outsideRefBefore.trim()) {
      resultStr += item.outsideRefBefore.trim() + "\n";
    }
    if (item.reference && item.reference.trim()) {
      resultStr += `[${item.reference.trim()}]\n`;
    }

    resultStr += `${numStr}. ` + item.questionText + "\n";
    item.options.forEach((opt, optIdx) => {
      if (opt) {
        let optLetter = ['ক', 'খ', 'গ', 'ঘ'][optIdx];
        let isCorrect = item.hasTickMark && item.correctAnswerIndex === optIdx;
        resultStr += `(${optLetter}) ${opt}${isCorrect ? '*' : ''}\n`;
      }
    });
    if (item.explanation && item.explanation.trim()) {
      let expText = cleanExplanationText(item.explanation);
      if (expText) {
        let isJustAnsTag = /^\s*[\(\（\[]?[ক-ঘa-d1-4১-৪0-4][\)\）\]]?\s*$/i.test(expText);
        if (!isJustAnsTag) {
          resultStr += `ব্যাখ্যা: ${expText}\n`;
        }
      }
    }
    if (item.outsideRefAfter && item.outsideRefAfter.trim()) {
      resultStr += item.outsideRefAfter.trim() + "\n";
    }
    resultStr += `\n`;
  });
  return resultStr.trim();
}
