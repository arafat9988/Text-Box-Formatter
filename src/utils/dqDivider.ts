import { convertToEnglishDigits, unicodeToBijoy } from './bijoy';

export function toBanglaDigits(numStr: string | number): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(numStr).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
}

export function toEnglishDigits(numStr: string | number): string {
  return convertToEnglishDigits(String(numStr));
}

export interface DqQuestionBlock {
  id: string;
  originalNumberStr: string;
  numericVal: number;
  questionText: string;
  options: string[];
  explanation: string;
  reference: string;
  rawText: string;
  hasCorrectAnswer: boolean;
}

export interface DqSetResult {
  setId: string;
  setTitleBangla: string;
  setTitleEnglish: string;
  questions: DqQuestionBlock[];
  formattedSolaiman: string;
  formattedSutonny: string;
}

export type DqSplitMode = 'repeated_numbers' | 'equal_chunks' | 'round_robin';

/**
 * Parses raw text or lines into structured question blocks
 */
export function parseDqContent(rawInput: string): DqQuestionBlock[] {
  if (!rawInput || !rawInput.trim()) return [];

  const rawLines = rawInput
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const blocks: DqQuestionBlock[] = [];
  let currentBlock: Partial<DqQuestionBlock> | null = null;
  let currentOptionLines: string[] = [];
  let currentExplanationLines: string[] = [];
  let isInExplanation = false;

  const isQuestionStartLine = (line: string): { isStart: boolean; numStr: string; numVal: number; restText: string } => {
    const trimmed = line.trim();
    if (!trimmed) return { isStart: false, numStr: '', numVal: 0, restText: '' };

    // Matches: "১. ", "১) ", "১: ", "1. ", "1) ", "০১. ", "প্রশ্ন ১: ", "Q1. ", "Q. 1 " etc.
    const match = trimmed.match(/^(?:(?:প্রশ্ন|Q|Ques|Question)[\s\.\:\-]*)?([০-৯\d]{1,4})[\s]*[\.\)\:\-\–\—\।\]]+\s*(.*)$/i) ||
                  trimmed.match(/^\(([০-৯\d]{1,4})\)\s*(.*)$/i) ||
                  trimmed.match(/^\[([০-৯\d]{1,4})\]\s*(.*)$/i);

    if (match) {
      const numStr = match[1];
      const englishNum = toEnglishDigits(numStr);
      const numVal = parseInt(englishNum, 10);
      if (!isNaN(numVal) && numVal >= 0 && numVal <= 9999) {
        return { isStart: true, numStr, numVal, restText: match[2] || '' };
      }
    }

    return { isStart: false, numStr: '', numVal: 0, restText: '' };
  };

  const isExplanationMarker = (line: string): boolean => {
    return /^\s*(?:ব্যাখ্যা|ব্যাখ্যাঃ|উত্তরের\s*ব্যাখ্যা|উত্তরের\s*ব্যাখ্যাঃ|Explanation|Expla|Expl|Exp|বিবরণ|Note|Ans|Answer|সঠিক\s*উত্তর|উত্তর|বিশেষ\s*দ্রষ্টব্য|জেনে\s*রাখো|জেনে\s*রাখা\s*ভালো|সমাধান|সমাধানঃ|Solution|Sol)[\:\-\—\.\s]/i.test(line) ||
           /^[\s]*[=⇒∴≠≤≥√π∞∠∆∑∫]/.test(line);
  };

  const isExplicitOptionLine = (line: string): boolean => {
    const trimmed = line.trim();
    return /^[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i.test(trimmed);
  };

  const finalizeBlock = () => {
    if (currentBlock && (currentBlock.questionText || currentOptionLines.length > 0)) {
      const qText = (currentBlock.questionText || '').trim();
      const options = currentOptionLines.map(o => o.trim()).filter(Boolean);
      const explanation = currentExplanationLines.map(e => e.trim()).filter(Boolean).join('\n');
      const hasCorrect = options.some(o => o.includes('*') || o.includes('✓') || o.includes('✔')) ||
                         /background-color|#00ff00|msoHighlight/i.test(qText);

      blocks.push({
        id: `dq-q-${blocks.length + 1}-${Date.now()}`,
        originalNumberStr: currentBlock.originalNumberStr || '১',
        numericVal: currentBlock.numericVal || (blocks.length + 1),
        questionText: qText,
        options,
        explanation,
        reference: currentBlock.reference || '',
        rawText: '',
        hasCorrectAnswer: hasCorrect,
      });
    }
    currentBlock = null;
    currentOptionLines = [];
    currentExplanationLines = [];
    isInExplanation = false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const startCheck = isQuestionStartLine(line);

    if (startCheck.isStart) {
      finalizeBlock();
      currentBlock = {
        originalNumberStr: startCheck.numStr,
        numericVal: startCheck.numVal,
        questionText: startCheck.restText || '',
        reference: '',
      };
      isInExplanation = false;
      continue;
    }

    if (!currentBlock) {
      // First line without question number
      currentBlock = {
        originalNumberStr: '১',
        numericVal: 1,
        questionText: line,
        reference: '',
      };
      continue;
    }

    if (isExplanationMarker(line)) {
      isInExplanation = true;
      currentExplanationLines.push(line);
      continue;
    }

    if (isInExplanation) {
      currentExplanationLines.push(line);
      continue;
    }

    if (isExplicitOptionLine(line)) {
      currentOptionLines.push(line);
      continue;
    }

    // Heuristic: If we don't have 4 options yet and line is short or looks like an option
    if (currentOptionLines.length < 4 && !isInExplanation && line.length < 150) {
      currentOptionLines.push(line);
    } else if (currentOptionLines.length >= 4) {
      // Might be explanation or extended question line
      currentExplanationLines.push(line);
      isInExplanation = true;
    } else {
      currentBlock.questionText = currentBlock.questionText ? `${currentBlock.questionText}\n${line}` : line;
    }
  }

  finalizeBlock();
  return blocks;
}

/**
 * Detects how many repeated sets exist based on question numbers (e.g. 1, 1, 1, 1 -> 4 sets)
 */
export function detectAutoSetCount(blocks: DqQuestionBlock[]): number {
  if (blocks.length === 0) return 2;

  const countMap = new Map<number, number>();
  for (const b of blocks) {
    const count = (countMap.get(b.numericVal) || 0) + 1;
    countMap.set(b.numericVal, count);
  }

  let maxCount = 1;
  countMap.forEach(count => {
    if (count > maxCount) {
      maxCount = count;
    }
  });

  // If max count is between 2 and 10, that is our detected set count
  if (maxCount >= 2 && maxCount <= 10) {
    return maxCount;
  }

  // Fallback heuristic: If total questions is even, default to 2, else 4 or 2
  if (blocks.length >= 4 && blocks.length % 4 === 0) return 4;
  if (blocks.length >= 2 && blocks.length % 2 === 0) return 2;
  return 2;
}

const SET_NAMES_BANGLA = [
  'প্রথম ভাগ: Set-A',
  '২য় ভাগ: Set-B',
  '৩য় ভাগ: Set-C',
  '৪র্থ ভাগ: Set-D',
  '৫ম ভাগ: Set-E',
  '৬ষ্ঠ ভাগ: Set-F',
  '৭ম ভাগ: Set-G',
  '৮ম ভাগ: Set-H',
];

const SET_NAMES_ENGLISH = [
  'Part 1: Set-A',
  'Part 2: Set-B',
  'Part 3: Set-C',
  'Part 4: Set-D',
  'Part 5: Set-E',
  'Part 6: Set-F',
  'Part 7: Set-G',
  'Part 8: Set-H',
];

/**
 * Divides question blocks into N sets according to the chosen split mode
 */
export function divideQuestionsIntoSets(
  blocks: DqQuestionBlock[],
  setCount: number,
  mode: DqSplitMode = 'repeated_numbers',
  renumberMode: 'bangla' | 'english' | 'keep' = 'bangla'
): DqSetResult[] {
  const safeSetCount = Math.max(2, Math.min(setCount || 2, 10));
  const setBuckets: DqQuestionBlock[][] = Array.from({ length: safeSetCount }, () => []);

  if (mode === 'repeated_numbers') {
    // Interleaved by repeating question number (1, 1, 1, 1... 2, 2, 2, 2...)
    const numberOccurrences = new Map<number, number>();

    blocks.forEach((block) => {
      const occurrence = numberOccurrences.get(block.numericVal) || 0;
      const targetSetIndex = occurrence % safeSetCount;
      setBuckets[targetSetIndex].push(block);
      numberOccurrences.set(block.numericVal, occurrence + 1);
    });
  } else if (mode === 'equal_chunks') {
    // Equal sequential slices (e.g. 40 total -> 10, 10, 10, 10)
    const chunkSize = Math.ceil(blocks.length / safeSetCount);
    blocks.forEach((block, idx) => {
      const targetSetIndex = Math.min(Math.floor(idx / chunkSize), safeSetCount - 1);
      setBuckets[targetSetIndex].push(block);
    });
  } else {
    // Round-Robin (0, 1, 2, 3, 0, 1, 2, 3...)
    blocks.forEach((block, idx) => {
      const targetSetIndex = idx % safeSetCount;
      setBuckets[targetSetIndex].push(block);
    });
  }

  // Format each set
  return setBuckets.map((qList, sIdx) => {
    const banglaTitle = SET_NAMES_BANGLA[sIdx] || `${toBanglaDigits(String(sIdx + 1))}ম ভাগ: Set-${String.fromCharCode(65 + sIdx)}`;
    const englishTitle = SET_NAMES_ENGLISH[sIdx] || `Part ${sIdx + 1}: Set-${String.fromCharCode(65 + sIdx)}`;

    // Build formatted string for this set
    const formattedLines: string[] = [];

    qList.forEach((q, qIdx) => {
      const newNum = renumberMode === 'bangla'
        ? `${toBanglaDigits(String(qIdx + 1))}. `
        : renumberMode === 'english'
        ? `${qIdx + 1}. `
        : `${q.originalNumberStr}. `;

      formattedLines.push(`${newNum}${q.questionText}`);

      q.options.forEach((opt) => {
        if (opt && opt.trim()) {
          formattedLines.push(opt.trim());
        }
      });

      if (q.explanation && q.explanation.trim()) {
        formattedLines.push(q.explanation.trim());
      }

      // Add single empty separation line between questions
      formattedLines.push('');
    });

    const formattedSolaiman = formattedLines.join('\n').trim();
    const formattedSutonny = unicodeToBijoy(formattedSolaiman);

    return {
      setId: `set-${sIdx + 1}`,
      setTitleBangla: banglaTitle,
      setTitleEnglish: englishTitle,
      questions: qList,
      formattedSolaiman,
      formattedSutonny,
    };
  });
}

/**
 * Formats all sets combined with titles for bulk copy/download
 */
export function formatAllSetsCombined(sets: DqSetResult[], fontMode: 'SolaimanLipi' | 'SutonnyMJ' = 'SolaimanLipi'): string {
  return sets
    .map((set) => {
      const title = fontMode === 'SutonnyMJ' ? unicodeToBijoy(set.setTitleBangla) : set.setTitleBangla;
      const content = fontMode === 'SutonnyMJ' ? set.formattedSutonny : set.formattedSolaiman;
      return `${title}\n\n${content}`;
    })
    .join('\n\n----------------------------------------\n\n');
}
