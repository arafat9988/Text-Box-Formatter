/**
 * Office Math Markup Language (OMML) & LaTeX Equation Generator for Microsoft Word (.docx)
 * Converts LaTeX formulas, fractions, radicals, powers, subscripts, and symbols
 * into native Microsoft Word Equation XML (<m:oMath>...</m:oMath>).
 */

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const MATH_FONT = `<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>`;

function makeRun(text: string): string {
  if (!text) return '';
  return `<m:r>${MATH_FONT}<m:t>${escapeXml(text)}</m:t></m:r>`;
}

/**
 * Symbol mapping from LaTeX commands and unicode to standard math symbols
 */
const SYMBOL_MAP: Record<string, string> = {
  'times': '×',
  'div': '÷',
  'pm': '±',
  'mp': '∓',
  'cdot': '·',
  'bullet': '•',
  'circ': '∘',
  'neq': '≠',
  'ne': '≠',
  'leq': '≤',
  'le': '≤',
  'geq': '≥',
  'ge': '≥',
  'approx': '≈',
  'equiv': '≡',
  'sim': '∼',
  'propto': '∝',
  'infty': '∞',
  'pi': 'π',
  'theta': 'θ',
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'Delta': 'Δ',
  'epsilon': 'ε',
  'varepsilon': 'ε',
  'zeta': 'ζ',
  'eta': 'η',
  'iota': 'ι',
  'kappa': 'κ',
  'lambda': 'λ',
  'Lambda': 'Λ',
  'mu': 'μ',
  'nu': 'ν',
  'xi': 'ξ',
  'Xi': 'Ξ',
  'Pi': 'Π',
  'rho': 'ρ',
  'sigma': 'σ',
  'Sigma': 'Σ',
  'tau': 'τ',
  'upsilon': 'υ',
  'phi': 'φ',
  'varphi': 'ϕ',
  'Phi': 'Φ',
  'chi': 'χ',
  'psi': 'ψ',
  'Psi': 'Ψ',
  'omega': 'ω',
  'Omega': 'Ω',
  'partial': '∂',
  'nabla': '∇',
  'to': '→',
  'rightarrow': '→',
  'leftarrow': '←',
  'leftrightarrow': '↔',
  'Rightarrow': '⇒',
  'Leftarrow': '⇐',
  'Leftrightarrow': '⇔',
  'implies': '⇒',
  'iff': '⇔',
  'in': '∈',
  'notin': '∉',
  'ni': '∋',
  'subset': '⊂',
  'subseteq': '⊆',
  'supset': '⊃',
  'supseteq': '⊇',
  'cup': '∪',
  'cap': '∩',
  'emptyset': '∅',
  'varnothing': '∅',
  'forall': '∀',
  'exists': '∃',
  'neg': '¬',
  'lor': '∨',
  'land': '∧',
  'because': '∵',
  'therefore': '∴',
  'degree': '°',
  'angle': '∠',
  'parallel': '∥',
  'perp': '⊥',
};

/**
 * Math functions (sin, cos, tan, log, ln, lim, etc.)
 */
const MATH_FUNCS: string[] = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'ln', 'log', 'exp', 'lg',
  'lim', 'max', 'min', 'det', 'gcd', 'deg'
];

/**
 * Parse a braced block e.g. "{ ... }" starting at index `start`
 * Returns { content, nextIndex }
 */
function parseBracedGroup(input: string, start: number): { content: string; nextIndex: number } {
  let i = start;
  while (i < input.length && /\s/.test(input[i])) i++;

  if (i < input.length && input[i] === '{') {
    let depth = 1;
    let s = i + 1;
    let j = s;
    while (j < input.length && depth > 0) {
      if (input[j] === '{' && input[j - 1] !== '\\') depth++;
      else if (input[j] === '}' && input[j - 1] !== '\\') depth--;
      j++;
    }
    return { content: input.substring(s, j - 1), nextIndex: j };
  } else if (i < input.length && input[i] === '\\') {
    // Single command as argument
    let j = i + 1;
    while (j < input.length && /[a-zA-Z]/.test(input[j])) j++;
    return { content: input.substring(i, j), nextIndex: j };
  } else if (i < input.length) {
    // Single character
    return { content: input[i], nextIndex: i + 1 };
  }
  return { content: '', nextIndex: i };
}

/**
 * Parse an optional bracketed group e.g. "[ ... ]" starting at index `start`
 */
function parseBracketedGroup(input: string, start: number): { content: string | null; nextIndex: number } {
  let i = start;
  while (i < input.length && /\s/.test(input[i])) i++;

  if (i < input.length && input[i] === '[') {
    let depth = 1;
    let s = i + 1;
    let j = s;
    while (j < input.length && depth > 0) {
      if (input[j] === '[') depth++;
      else if (input[j] === ']') depth--;
      j++;
    }
    return { content: input.substring(s, j - 1), nextIndex: j };
  }
  return { content: null, nextIndex: start };
}

/**
 * Recursively converts LaTeX math string into OMML child elements XML
 */
export function latexToOmmlInner(latex: string): string {
  if (!latex) return '';
  let str = latex.trim();
  if (!str) return '';

  let xml = '';
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 1. Backslash commands
    if (ch === '\\') {
      const rest = str.substring(i + 1);
      const cmdMatch = rest.match(/^([a-zA-Z]+)/);

      if (cmdMatch) {
        const cmd = cmdMatch[1];
        const cmdLen = cmd.length + 1; // +1 for backslash

        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          const numRes = parseBracedGroup(str, i + cmdLen);
          const denRes = parseBracedGroup(str, numRes.nextIndex);
          const numXml = latexToOmmlInner(numRes.content);
          const denXml = latexToOmmlInner(denRes.content);
          xml += `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${numXml}</m:num><m:den>${denXml}</m:den></m:f>`;
          i = denRes.nextIndex;
          continue;
        }

        if (cmd === 'sqrt') {
          const degRes = parseBracketedGroup(str, i + cmdLen);
          const bodyRes = parseBracedGroup(str, degRes.nextIndex);
          const bodyXml = latexToOmmlInner(bodyRes.content);

          if (degRes.content !== null) {
            const degXml = latexToOmmlInner(degRes.content);
            xml += `<m:rad><m:radPr><m:degHide m:val="off"/></m:radPr><m:deg>${degXml}</m:deg><m:e>${bodyXml}</m:e></m:rad>`;
          } else {
            xml += `<m:rad><m:radPr><m:degHide m:val="on"/></m:radPr><m:deg/><m:e>${bodyXml}</m:e></m:rad>`;
          }
          i = bodyRes.nextIndex;
          continue;
        }

        if (cmd === 'sum' || cmd === 'int' || cmd === 'prod' || cmd === 'lim') {
          const symbol = cmd === 'sum' ? '∑' : (cmd === 'int' ? '∫' : (cmd === 'prod' ? '∏' : 'lim'));
          const limLoc = cmd === 'int' ? 'subSup' : 'undOvr';
          let nextI = i + cmdLen;
          let subXml = '';
          let supXml = '';

          // Lookahead for _ and ^
          let parseSubSup = true;
          while (parseSubSup && nextI < str.length) {
            while (nextI < str.length && /\s/.test(str[nextI])) nextI++;
            if (str[nextI] === '_') {
              const subRes = parseBracedGroup(str, nextI + 1);
              subXml = latexToOmmlInner(subRes.content);
              nextI = subRes.nextIndex;
            } else if (str[nextI] === '^') {
              const supRes = parseBracedGroup(str, nextI + 1);
              supXml = latexToOmmlInner(supRes.content);
              nextI = supRes.nextIndex;
            } else {
              parseSubSup = false;
            }
          }

          xml += `<m:nary><m:naryPr><m:chr m:val="${symbol}"/><m:limLoc m:val="${limLoc}"/></m:naryPr><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup><m:e></m:e></m:nary>`;
          i = nextI;
          continue;
        }

        if (cmd === 'left') {
          let nextI = i + cmdLen;
          while (nextI < str.length && /\s/.test(str[nextI])) nextI++;
          const openChar = str[nextI] || '(';
          nextI++;
          // Scan for matching \right
          let rightIdx = str.indexOf('\\right', nextI);
          if (rightIdx !== -1) {
            let innerLatex = str.substring(nextI, rightIdx);
            let closeCharIdx = rightIdx + 6;
            while (closeCharIdx < str.length && /\s/.test(str[closeCharIdx])) closeCharIdx++;
            let closeChar = str[closeCharIdx] || ')';
            xml += `<m:d><m:dPr><m:begChr m:val="${openChar}"/><m:endChr m:val="${closeChar}"/></m:dPr><m:e>${latexToOmmlInner(innerLatex)}</m:e></m:d>`;
            i = closeCharIdx + 1;
            continue;
          }
        }

        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'mathbf' || cmd === 'mathit' || cmd === 'operatorname') {
          const txtRes = parseBracedGroup(str, i + cmdLen);
          xml += makeRun(txtRes.content);
          i = txtRes.nextIndex;
          continue;
        }

        if (MATH_FUNCS.includes(cmd)) {
          xml += makeRun(cmd);
          i += cmdLen;
          continue;
        }

        if (SYMBOL_MAP[cmd]) {
          xml += makeRun(SYMBOL_MAP[cmd]);
          i += cmdLen;
          continue;
        }

        if (cmd === 'quad' || cmd === 'qquad') {
          xml += makeRun('  ');
          i += cmdLen;
          continue;
        }

        // Generic unrecognized command -> output symbol or name
        xml += makeRun(cmd);
        i += cmdLen;
        continue;
      } else {
        // Escaped character like \{ or \} or \$ or \_ or \%
        if (i + 1 < str.length) {
          xml += makeRun(str[i + 1]);
          i += 2;
          continue;
        }
      }
    }

    // 2. Powers and Subscripts: e.g. x^2, x_{1}, x_1^2
    if (ch === '^' || ch === '_') {
      let isSup = ch === '^';
      const parsed = parseBracedGroup(str, i + 1);
      let contentXml = latexToOmmlInner(parsed.content);
      let nextI = parsed.nextIndex;

      if (isSup) {
        // Check if immediately followed by sub `_`
        let subAfter = false;
        let subXml = '';
        let scanI = nextI;
        while (scanI < str.length && /\s/.test(str[scanI])) scanI++;
        if (scanI < str.length && str[scanI] === '_') {
          subAfter = true;
          const subParsed = parseBracedGroup(str, scanI + 1);
          subXml = latexToOmmlInner(subParsed.content);
          nextI = subParsed.nextIndex;
        }

        if (subAfter) {
          xml += `<m:sSubSup><m:e></m:e><m:sub>${subXml}</m:sub><m:sup>${contentXml}</m:sup></m:sSubSup>`;
        } else {
          xml += `<m:sSup><m:e></m:e><m:sup>${contentXml}</m:sup></m:sSup>`;
        }
      } else {
        // Subscript
        let supAfter = false;
        let supXml = '';
        let scanI = nextI;
        while (scanI < str.length && /\s/.test(str[scanI])) scanI++;
        if (scanI < str.length && str[scanI] === '^') {
          supAfter = true;
          const supParsed = parseBracedGroup(str, scanI + 1);
          supXml = latexToOmmlInner(supParsed.content);
          nextI = supParsed.nextIndex;
        }

        if (supAfter) {
          xml += `<m:sSubSup><m:e></m:e><m:sub>${contentXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
        } else {
          xml += `<m:sSub><m:e></m:e><m:sub>${contentXml}</m:sub></m:sSub>`;
        }
      }

      i = nextI;
      continue;
    }

    // 3. Parentheses & Brackets
    if (ch === '(' || ch === '[' || ch === '{') {
      const matchClose = ch === '(' ? ')' : (ch === '[' ? ']' : '}');
      let depth = 1;
      let j = i + 1;
      while (j < str.length && depth > 0) {
        if (str[j] === ch) depth++;
        else if (str[j] === matchClose) depth--;
        j++;
      }
      if (depth === 0) {
        const innerContent = str.substring(i + 1, j - 1);
        xml += `<m:d><m:dPr><m:begChr m:val="${ch}"/><m:endChr m:val="${matchClose}"/></m:dPr><m:e>${latexToOmmlInner(innerContent)}</m:e></m:d>`;
        i = j;
        continue;
      }
    }

    // 4. Unicode Math Root character: √
    if (ch === '√' || ch === '\u221A') {
      let nextI = i + 1;
      while (nextI < str.length && /\s/.test(str[nextI])) nextI++;
      const bodyRes = parseBracedGroup(str, nextI);
      const bodyXml = latexToOmmlInner(bodyRes.content || 'x');
      xml += `<m:rad><m:radPr><m:degHide m:val="on"/></m:radPr><m:deg/><m:e>${bodyXml}</m:e></m:rad>`;
      i = bodyRes.nextIndex;
      continue;
    }

    // 5. Normal text / identifier / operator accumulation
    let textRun = '';
    while (
      i < str.length &&
      str[i] !== '\\' &&
      str[i] !== '^' &&
      str[i] !== '_' &&
      str[i] !== '(' &&
      str[i] !== '[' &&
      str[i] !== '{' &&
      str[i] !== '√' &&
      str[i] !== '\u221A'
    ) {
      // If single char followed by ^ or _, break to attach base
      if (i + 1 < str.length && (str[i + 1] === '^' || str[i + 1] === '_')) {
        textRun += str[i];
        i++;
        break;
      }
      textRun += str[i];
      i++;
    }

    if (textRun) {
      // Check if followed by ^ or _
      if (i < str.length && (str[i] === '^' || str[i] === '_')) {
        let isSup = str[i] === '^';
        let parsed = parseBracedGroup(str, i + 1);
        let contentXml = latexToOmmlInner(parsed.content);
        let nextI = parsed.nextIndex;

        let isSubSup = false;
        let subXml = '';
        let supXml = '';

        let scanI = nextI;
        while (scanI < str.length && /\s/.test(str[scanI])) scanI++;
        if (isSup && scanI < str.length && str[scanI] === '_') {
          isSubSup = true;
          const subParsed = parseBracedGroup(str, scanI + 1);
          subXml = latexToOmmlInner(subParsed.content);
          supXml = contentXml;
          nextI = subParsed.nextIndex;
        } else if (!isSup && scanI < str.length && str[scanI] === '^') {
          isSubSup = true;
          const supParsed = parseBracedGroup(str, scanI + 1);
          supXml = latexToOmmlInner(supParsed.content);
          subXml = contentXml;
          nextI = supParsed.nextIndex;
        }

        // Split textRun into leading text and base character
        let baseChar = textRun.slice(-1);
        let leadingText = textRun.slice(0, -1);

        if (leadingText) {
          xml += makeRun(leadingText);
        }

        const baseXml = makeRun(baseChar);

        if (isSubSup) {
          xml += `<m:sSubSup><m:e>${baseXml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
        } else if (isSup) {
          xml += `<m:sSup><m:e>${baseXml}</m:e><m:sup>${contentXml}</m:sup></m:sSup>`;
        } else {
          xml += `<m:sSub><m:e>${baseXml}</m:e><m:sub>${contentXml}</m:sub></m:sSub>`;
        }

        i = nextI;
        continue;
      } else {
        xml += makeRun(textRun);
      }
    }
  }

  return xml;
}

/**
 * Converts a LaTeX formula string into a complete Word Equation <m:oMath>
 */
export function latexToOmml(latex: string): string {
  const inner = latexToOmmlInner(latex);
  if (!inner) return '';
  return `<m:oMath>${inner}</m:oMath>`;
}

/**
 * Converts a fraction into OMML <m:oMath>
 */
export function fractionToOmml(num: string, den: string): string {
  const numXml = latexToOmmlInner(num);
  const denXml = latexToOmmlInner(den);
  return `<m:oMath><m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${numXml}</m:num><m:den>${denXml}</m:den></m:f></m:oMath>`;
}

/**
 * Converts a square root / degree root into OMML <m:oMath>
 */
export function radicalToOmml(body: string, degree?: string): string {
  const bodyXml = latexToOmmlInner(body);
  if (degree) {
    const degXml = latexToOmmlInner(degree);
    return `<m:oMath><m:rad><m:radPr><m:degHide m:val="off"/></m:radPr><m:deg>${degXml}</m:deg><m:e>${bodyXml}</m:e></m:rad></m:oMath>`;
  }
  return `<m:oMath><m:rad><m:radPr><m:degHide m:val="on"/></m:radPr><m:deg/><m:e>${bodyXml}</m:e></m:rad></m:oMath>`;
}

export interface PreparedHtmlMathResult {
  htmlWithPlaceholders: string;
  ommlMap: Map<string, string>;
}

/**
 * Scans HTML content for all math representations (fractions, square roots, LaTeX commands, exponents)
 * and replaces them with safe unique placeholder tokens, returning the placeholder map.
 * Uses continuous alphanumeric tokens (e.g. ZOMMLEQNUM0001Z) to prevent HTML-to-Docx lexers from splitting runs.
 */
export function prepareHtmlForDocxWithMath(html: string): PreparedHtmlMathResult {
  if (!html) return { htmlWithPlaceholders: '', ommlMap: new Map() };

  let counter = 0;
  const ommlMap = new Map<string, string>();

  const addOmml = (ommlXml: string): string => {
    counter++;
    // Use clean alphanumeric token without punctuation/spaces/underscores
    const token = `ZOMMLEQNUM${String(counter).padStart(4, '0')}Z`;
    ommlMap.set(token, ommlXml);
    return token;
  };

  let s = html;

  // 1. Convert <math-fraction data-num="..." data-den="...">
  s = s.replace(/<math-fraction\b[\s\S]*?<\/math-fraction>/gi, (match) => {
    const numAttr = match.match(/data-num="([^"]*)"/i)?.[1] ?? match.match(/data-num='([^']*)'/i)?.[1];
    const denAttr = match.match(/data-den="([^"]*)"/i)?.[1] ?? match.match(/data-den='([^']*)'/i)?.[1];
    if (numAttr !== undefined && denAttr !== undefined) {
      return addOmml(fractionToOmml(numAttr, denAttr));
    }
    return match;
  });

  // 2. Convert <span class="math-frac"...> or <span class="math-fraction"...>
  s = s.replace(/<(?:span|div|p)\b[^>]*class="[^"]*(?:math-frac|math-fraction)[^"]*"[\s\S]*?<\/(?:span|div|p)>/gi, (match) => {
    const numAttr = match.match(/data-num="([^"]*)"/i)?.[1] ?? match.match(/data-num='([^']*)'/i)?.[1];
    const denAttr = match.match(/data-den="([^"]*)"/i)?.[1] ?? match.match(/data-den='([^']*)'/i)?.[1];
    if (numAttr !== undefined && denAttr !== undefined) {
      return addOmml(fractionToOmml(numAttr, denAttr));
    }
    // Fallback: extract from inner num and den elements
    const numText = match.match(/class="[^"]*(?:math-frac-num|num)[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1];
    const denText = match.match(/class="[^"]*(?:math-frac-den|den)[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1];
    if (numText && denText) {
      const cleanN = numText.replace(/<[^>]+>/g, '').trim();
      const cleanD = denText.replace(/<[^>]+>/g, '').trim();
      return addOmml(fractionToOmml(cleanN, cleanD));
    }
    return match;
  });

  // 3. Convert square root HTML spans e.g. <sup>n</sup><span>√<span style="border-top:...">x</span></span>
  s = s.replace(/(?:<sup>([^<]+)<\/sup>\s*)?<span[^>]*style="[^"]*font-family:\s*'Times New Roman'[^"]*"[^>]*><span[^>]*>[√\u221A]<\/span><span style="[^"]*border-top:[^"]*"[^>]*>([\s\S]*?)<\/span><\/span>/gi, (_, deg, body) => {
    const cleanBody = body.replace(/<[^>]+>/g, '').trim();
    const cleanDeg = deg ? deg.replace(/<[^>]+>/g, '').trim() : undefined;
    return addOmml(radicalToOmml(cleanBody, cleanDeg));
  });

  // 4. Convert LaTeX \sqrt[n]{x} and \sqrt{x}
  s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, (_, deg, body) => {
    return addOmml(radicalToOmml(body.trim(), deg.trim()));
  });
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, (_, body) => {
    return addOmml(radicalToOmml(body.trim()));
  });
  s = s.replace(/\\sqrt\s*([0-9a-zA-Z\u09E6-\u09EF])/g, (_, body) => {
    return addOmml(radicalToOmml(body.trim()));
  });
  // Standalone unicode √x or √(x + y)
  s = s.replace(/[√\u221A]\s*\{([^{}]+)\}/g, (_, body) => {
    return addOmml(radicalToOmml(body.trim()));
  });
  s = s.replace(/[√\u221A]\s*\(([^\)]+)\)/g, (_, body) => {
    return addOmml(radicalToOmml(`(${body.trim()})`));
  });
  s = s.replace(/[√\u221A]([0-9a-zA-Z\u09E6-\u09EF]+)/g, (_, body) => {
    return addOmml(radicalToOmml(body.trim()));
  });

  // 5. Convert LaTeX \frac{num}{den}, \dfrac{num}{den}, \tfrac{num}{den}
  s = s.replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_, num, den) => {
    return addOmml(fractionToOmml(num.trim(), den.trim()));
  });

  // 6. Convert raw fraction placeholders
  s = s.replace(/___FRAC___([\s\S]*?)___SEP___([\s\S]*?)___END___/gi, (_, num, den) => {
    try {
      return addOmml(fractionToOmml(decodeURIComponent(num), decodeURIComponent(den)));
    } catch {
      return addOmml(fractionToOmml(num, den));
    }
  });

  // 7. Convert LaTeX display/inline math blocks $$...$$ and $...$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    return addOmml(latexToOmml(latex.trim()));
  });
  s = s.replace(/\$([^\$\n]{2,})\$/g, (_, latex) => {
    return addOmml(latexToOmml(latex.trim()));
  });

  return { htmlWithPlaceholders: s, ommlMap };
}

/**
 * Patches the `word/document.xml` extracted from a DOCX ZIP file:
 * 1. Ensures the OMML math namespace `xmlns:m` exists on `<w:document>`
 * 2. Sets exact A4 page dimensions in `<w:pgSz>`
 * 3. Replaces all math placeholder tokens with native Word Equation XML `<m:oMath>...</m:oMath>`
 */
export function patchDocxXmlWithOmml(docXml: string, ommlMap: Map<string, string>): string {
  if (!docXml) return docXml;

  let result = docXml;

  // 1. Ensure xmlns:m is declared in <w:document ...>
  if (!result.includes('xmlns:m=')) {
    result = result.replace(
      /<w:document\b([^>]*)>/i,
      '<w:document $1 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">'
    );
  }

  // 2. Ensure A4 page size
  result = result.replace(/<w:pgSz\b[^>]*\/>/g, '<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>');

  if (ommlMap.size === 0) {
    // Also cleanup any stray legacy brackets if any exist
    result = result.replace(/\[\[\[MATH[_\s]+OMML[_\s]+EQ[_\s]+\d+\]\]\]/gi, '');
    return result;
  }

  // 3. Process every token in map
  ommlMap.forEach((ommlXml, token) => {
    // Escape for regex
    const escapedToken = escapeRegex(token);

    // Also build regex for legacy tokens in case they exist: e.g. [[[MATH_OMML_EQ_1]]] or [[[MATH OMML EQ 1]]]
    const legacyTokenNum = token.match(/\d+/)?.[0];
    const legacyPattern = legacyTokenNum
      ? `(?:${escapedToken}|\\[\\[\\[MATH[\\s_]+OMML[\\s_]+EQ[\\s_]+${legacyTokenNum}\\]\\]\\]|MATH[\\s_]+OMML[\\s_]+EQ[\\s_]+${legacyTokenNum})`
      : escapedToken;

    // Pattern 1: Single run containing just the token or token surrounded by other text
    // E.g.: <w:r ...><w:t ...>prefix TOKEN suffix</w:t></w:r>
    const runRegex = new RegExp(
      `(<w:r\\b[^>]*>(?:<w:rPr>[\\s\\S]*?<\\/w:rPr>)?<w:t[^>]*>)([\\s\\S]*?)(${legacyPattern})([\\s\\S]*?)(<\\/w:t><\\/w:r>)`,
      'g'
    );

    result = result.replace(runRegex, (_match, rOpen, beforeText, _tok, afterText, rClose) => {
      let replacement = '';
      if (beforeText && beforeText.trim()) {
        replacement += `${rOpen}${beforeText}${rClose}`;
      }
      replacement += ommlXml;
      if (afterText && afterText.trim()) {
        replacement += `${rOpen}${afterText}${rClose}`;
      }
      return replacement;
    });

    // Pattern 2: Token split across multiple <w:r> runs
    // E.g. <w:t>...ZOMM</w:t></w:r><w:r><w:t>LEQNUM0001Z...</w:t>
    const splitRegex = new RegExp(
      `(<w:r\\b[^>]*>(?:<w:rPr>[\\s\\S]*?<\\/w:rPr>)?<w:t[^>]*>)[\\s\\S]*?${legacyPattern}[\\s\\S]*?(<\\/w:t><\\/w:r>)`,
      'g'
    );
    if (splitRegex.test(result)) {
      result = result.replace(splitRegex, ommlXml);
    }

    // Pattern 3: Fallback string / tag replacement
    if (result.includes(token)) {
      result = result.split(token).join(ommlXml);
    }

    if (legacyTokenNum) {
      const alt1 = `[[[MATH_OMML_EQ_${legacyTokenNum}]]]`;
      const alt2 = `[[[MATH OMML EQ ${legacyTokenNum}]]]`;
      const alt3 = `MATH_OMML_EQ_${legacyTokenNum}`;
      const alt4 = `MATH OMML EQ ${legacyTokenNum}`;
      if (result.includes(alt1)) result = result.split(alt1).join(ommlXml);
      if (result.includes(alt2)) result = result.split(alt2).join(ommlXml);
      if (result.includes(alt3)) result = result.split(alt3).join(ommlXml);
      if (result.includes(alt4)) result = result.split(alt4).join(ommlXml);
    }
  });

  // Final cleanup: remove any leftover empty <w:r><w:t></w:t></w:r> or empty text tags
  result = result.replace(/<w:r\b[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>\s*<\/w:t><\/w:r>/gi, '');

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
