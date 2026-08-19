import JSZip from 'jszip';
import { latexToOmml, fractionToOmml, radicalToOmml } from './mathOmml';

export interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean; // green highlight
  font?: string; // 'SolaimanLipi' | 'SutonnyMJ' | 'Times New Roman' | 'Cambria Math'
  fontSize?: number; // half-points: 20 = 10pt, 22 = 11pt
}

/**
 * Escapes text for XML
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

/**
 * Checks if a string contains any LaTeX math commands or symbols
 */
function hasLatexMath(str: string): boolean {
  return /\\(?:frac|dfrac|tfrac|sqrt|sum|int|prod|alpha|beta|gamma|delta|Delta|theta|pi|sigma|Sigma|lambda|Lambda|mu|omega|Omega|pm|times|div|leq|geq|neq|approx|to|rightarrow|degree|angle)|[√\u221A]|___FRAC___|<math-fraction|class="[^"]*math-frac|\$[^$]+\$|[a-zA-Z0-9\u09E6-\u09EF][\^_][a-zA-Z0-9\u09E6-\u09EF\{]/.test(str);
}

/**
 * Converts inline text with possible LaTeX formulas / fractions / superscripts into WordprocessingML runs & <m:oMath>
 */
function convertTextSegmentToWordXml(text: string, style: RunStyle, defaultFont: string): string {
  if (!text) return '';

  const activeFont = style.font || defaultFont || 'SolaimanLipi';
  const isSutonny = activeFont === 'SutonnyMJ';
  const szVal = style.fontSize ? style.fontSize : 20; // default 10pt

  // Build <w:rPr>
  const makeRPr = (fontName: string): string => {
    const rPrElements: string[] = [
      `<w:rFonts w:ascii="${escapeXml(fontName)}" w:hAnsi="${escapeXml(fontName)}" w:cs="${escapeXml(fontName)}" w:eastAsia="${escapeXml(fontName)}"/>`,
      `<w:sz w:val="${szVal}"/>`,
      `<w:szCs w:val="${szVal}"/>`
    ];
    if (style.bold) rPrElements.push('<w:b/><w:bCs/>');
    if (style.italic) rPrElements.push('<w:i/><w:iCs/>');
    if (style.underline) rPrElements.push('<w:u w:val="single"/>');
    if (style.highlight) rPrElements.push('<w:highlight w:val="green"/>');
    return `<w:rPr>${rPrElements.join('')}</w:rPr>`;
  };

  const makeWordRun = (content: string, fontOverride?: string): string => {
    if (!content) return '';
    const rPrXml = makeRPr(fontOverride || activeFont);
    return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r>`;
  };

  // If text does not contain any math, output font-aware runs
  if (!hasLatexMath(text)) {
    // If Bengali mode (SolaimanLipi), split English words to use Times New Roman
    if (!isSutonny && activeFont === 'SolaimanLipi') {
      const tokens = text.split(/([a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+)/);
      let res = '';
      for (const tok of tokens) {
        if (!tok) continue;
        if (/^[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+$/.test(tok)) {
          res += makeWordRun(tok, 'Times New Roman');
        } else {
          res += makeWordRun(tok, 'SolaimanLipi');
        }
      }
      return res;
    }
    return makeWordRun(text);
  }

  // Text has math equations! Parse equations and convert to <m:oMath>
  let resXml = '';

  // Regex to detect math expressions
  const mathRegex = /(\$\$(?:[^\$]+)\$\$|\$(?:[^\$\n]+)\$|\\(?:frac|dfrac|tfrac)\s*\{[^{}]*\}\s*\{[^{}]*\}|\\(?:frac|dfrac|tfrac)\s*[0-9a-zA-Z\u09E6-\u09EF]\s*[0-9a-zA-Z\u09E6-\u09EF]|\\sqrt\s*\[[^\]]*\]\s*\{[^{}]*\}|\\sqrt\s*\{[^{}]*\}|\\sqrt\s*[0-9a-zA-Z\u09E6-\u09EF]|[√\u221A]\s*\{[^{}]*\}|[√\u221A]\s*\([^\)]*\)|[√\u221A][0-9a-zA-Z\u09E6-\u09EF]+|___FRAC___[\s\S]*?___SEP___[\s\S]*?___END___|[a-zA-Z0-9\u09E6-\u09EF][\^_]\{[^{}]*\}|[a-zA-Z0-9\u09E6-\u09EF][\^_][0-9a-zA-Z\u09E6-\u09EF])/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    const preText = text.substring(lastIdx, match.index);
    if (preText) {
      resXml += convertTextSegmentToWordXml(preText, style, defaultFont);
    }

    const matchedStr = match[0];
    let mathXml = '';

    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      mathXml = latexToOmml(matchedStr.slice(2, -2).trim());
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      mathXml = latexToOmml(matchedStr.slice(1, -1).trim());
    } else if (/^\\(?:frac|dfrac|tfrac)/.test(matchedStr)) {
      const fracMatch = matchedStr.match(/^\\(?:frac|dfrac|tfrac)\s*(?:\{([^{}]*)\}|([0-9a-zA-Z\u09E6-\u09EF]))\s*(?:\{([^{}]*)\}|([0-9a-zA-Z\u09E6-\u09EF]))/);
      if (fracMatch) {
        const num = fracMatch[1] || fracMatch[2] || '';
        const den = fracMatch[3] || fracMatch[4] || '';
        mathXml = fractionToOmml(num, den);
      } else {
        mathXml = latexToOmml(matchedStr);
      }
    } else if (/^___FRAC___/.test(matchedStr)) {
      const fracMatch = matchedStr.match(/^___FRAC___([\s\S]*?)___SEP___([\s\S]*?)___END___/);
      if (fracMatch) {
        let n = fracMatch[1];
        let d = fracMatch[2];
        try { n = decodeURIComponent(n); } catch {}
        try { d = decodeURIComponent(d); } catch {}
        mathXml = fractionToOmml(n, d);
      }
    } else if (/^\\sqrt|[√\u221A]/.test(matchedStr)) {
      const radMatch = matchedStr.match(/^\\sqrt\s*(?:\[([^\]]*)\])?\s*(?:\{([^{}]*)\}|([0-9a-zA-Z\u09E6-\u09EF]))/);
      if (radMatch) {
        const deg = radMatch[1];
        const body = radMatch[2] || radMatch[3] || '';
        mathXml = radicalToOmml(body, deg);
      } else {
        mathXml = radicalToOmml(matchedStr.replace(/^[√\u221A\\sqrt\s]+/, '').replace(/^\{/, '').replace(/\}$/, ''));
      }
    } else {
      mathXml = latexToOmml(matchedStr);
    }

    if (mathXml) {
      resXml += mathXml;
    } else {
      resXml += makeWordRun(matchedStr);
    }

    lastIdx = match.index + matchedStr.length;
  }

  if (lastIdx < text.length) {
    resXml += convertTextSegmentToWordXml(text.substring(lastIdx), style, defaultFont);
  }

  return resXml;
}

/**
 * Traverses DOM node tree and converts it into WordprocessingML (<w:p>, <w:r>, <w:tbl>, <m:oMath>)
 */
function domNodeToWordXml(node: Node, currentStyle: RunStyle, defaultFont: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return '';
    return convertTextSegmentToWordXml(text, currentStyle, defaultFont);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tagName = el.tagName.toLowerCase();

  // 1. Math fraction custom elements or classes
  if (tagName === 'math-fraction' || el.classList.contains('math-frac') || el.classList.contains('math-fraction')) {
    const numAttr = el.getAttribute('data-num');
    const denAttr = el.getAttribute('data-den');
    if (numAttr !== null && denAttr !== null) {
      return fractionToOmml(numAttr, denAttr);
    }
    const numEl = el.querySelector('.math-frac-num, .num');
    const denEl = el.querySelector('.math-frac-den, .den');
    if (numEl && denEl) {
      return fractionToOmml(numEl.textContent?.trim() || '', denEl.textContent?.trim() || '');
    }
  }

  // 2. Table handling
  if (tagName === 'table') {
    let rowsXml = '';
    const trNodes = el.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr');
    const totalTableWidth = 10400; // twips (A4 printable width with 0.5in margins)

    trNodes.forEach(tr => {
      let cellsXml = '';
      const tdNodes = tr.querySelectorAll(':scope > td, :scope > th');
      const cellCount = tdNodes.length || 1;
      const defaultCellWidth = Math.floor(totalTableWidth / cellCount);

      tdNodes.forEach(td => {
        const tdEl = td as HTMLElement;
        let cellW = defaultCellWidth;
        const styleW = tdEl.style.width;
        if (styleW.includes('%')) {
          const pct = parseFloat(styleW) / 100;
          if (!isNaN(pct)) cellW = Math.floor(totalTableWidth * pct);
        }

        // Check cell content
        let cellContentXml = '';
        for (let i = 0; i < td.childNodes.length; i++) {
          cellContentXml += domNodeToWordXml(td.childNodes[i], currentStyle, defaultFont);
        }
        if (!cellContentXml.trim()) {
          cellContentXml = '<w:p/>';
        } else if (!cellContentXml.startsWith('<w:p')) {
          cellContentXml = `<w:p><w:pPr><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>${cellContentXml}</w:p>`;
        }

        cellsXml += `<w:tc><w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/></w:tcPr>${cellContentXml}</w:tc>`;
      });

      rowsXml += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cellsXml}</w:tr>`;
    });

    const isBordered =
      el.classList.contains('qc-table') ||
      el.classList.contains('wcr-table') ||
      el.style.border.includes('solid') ||
      el.getAttribute('border') === '1';

    const borderXml = isBordered
      ? '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>'
      : '<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>';

    return `<w:tbl><w:tblPr><w:tblW w:w="${totalTableWidth}" w:type="dxa"/>${borderXml}</w:tblPr>${rowsXml}</w:tbl>`;
  }

  // 3. Paragraph & Heading handling
  if (tagName === 'p' || tagName === 'div' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
    let pInner = '';
    const nextStyle: RunStyle = { ...currentStyle };

    if (tagName === 'h1') {
      nextStyle.bold = true;
      nextStyle.fontSize = 28; // 14pt
    } else if (tagName === 'h2') {
      nextStyle.bold = true;
      nextStyle.fontSize = 24; // 12pt
    } else if (tagName === 'h3') {
      nextStyle.bold = true;
      nextStyle.fontSize = 22; // 11pt
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      pInner += domNodeToWordXml(el.childNodes[i], nextStyle, defaultFont);
    }
    if (!pInner.trim()) {
      return '<w:p/>';
    }
    // If pInner already contains block tables or paragraphs, return as is
    if (pInner.startsWith('<w:tbl') || pInner.startsWith('<w:p')) {
      return pInner;
    }

    // Determine alignment
    const alignAttr = el.getAttribute('align')?.toLowerCase();
    const styleAlign = el.style.textAlign?.toLowerCase();
    let jcXml = '';
    if (alignAttr === 'center' || styleAlign === 'center') {
      jcXml = '<w:jc w:val="center"/>';
    } else if (alignAttr === 'right' || styleAlign === 'right') {
      jcXml = '<w:jc w:val="right"/>';
    } else if (alignAttr === 'justify' || styleAlign === 'justify') {
      jcXml = '<w:jc w:val="both"/>';
    }

    return `<w:p><w:pPr>${jcXml}<w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>${pInner}</w:p>`;
  }

  // 4. Line break
  if (tagName === 'br') {
    return '<w:r><w:br/></w:r>';
  }

  // 5. Inlines & Spans with styles
  const nextStyle: RunStyle = { ...currentStyle };

  if (tagName === 'b' || tagName === 'strong') {
    nextStyle.bold = true;
  }
  if (tagName === 'i' || tagName === 'em') {
    nextStyle.italic = true;
  }
  if (tagName === 'u') {
    nextStyle.underline = true;
  }
  if (
    tagName === 'mark' ||
    el.style.backgroundColor?.includes('rgb(0, 255, 0)') ||
    el.style.backgroundColor === '#00ff00' ||
    el.style.backgroundColor === 'lime' ||
    el.getAttribute('style')?.includes('mso-highlight: lime') ||
    el.getAttribute('style')?.includes('mso-highlight:lime')
  ) {
    nextStyle.highlight = true;
  }

  if (el.classList.contains('eng-text') || el.classList.contains('eng')) {
    nextStyle.font = 'Times New Roman';
  } else if (el.classList.contains('ben-text') || el.classList.contains('ben')) {
    nextStyle.font = defaultFont;
  } else if (el.style.fontFamily?.includes('Times New Roman')) {
    nextStyle.font = 'Times New Roman';
  } else if (el.style.fontFamily?.includes('SutonnyMJ')) {
    nextStyle.font = 'SutonnyMJ';
  } else if (el.style.fontFamily?.includes('SolaimanLipi')) {
    nextStyle.font = 'SolaimanLipi';
  }

  if (el.style.fontSize?.includes('11pt')) {
    nextStyle.fontSize = 22;
  } else if (el.style.fontSize?.includes('12pt')) {
    nextStyle.fontSize = 24;
  }

  let childrenXml = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    childrenXml += domNodeToWordXml(el.childNodes[i], nextStyle, defaultFont);
  }
  return childrenXml;
}

/**
 * Converts an entire HTML document string into a standard, 100% valid Microsoft Word .docx Blob
 * with native Word Equations (<m:oMath>), tables (<w:tbl>), paragraphs (<w:p>), and exact fonts.
 */
export async function convertHtmlToNativeDocxBlob(
  htmlContent: string,
  primaryFont: string = 'SolaimanLipi'
): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const bodyEl = doc.body;
  let bodyXml = '';

  for (let i = 0; i < bodyEl.childNodes.length; i++) {
    const nodeXml = domNodeToWordXml(bodyEl.childNodes[i], {}, primaryFont);
    if (nodeXml) {
      bodyXml += nodeXml;
    }
  }

  // Ensure all loose runs are wrapped in <w:p>
  if (bodyXml && !bodyXml.startsWith('<w:p') && !bodyXml.startsWith('<w:tbl')) {
    bodyXml = `<w:p><w:pPr><w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>${bodyXml}</w:p>`;
  }

  // Build the complete word/document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="288" w:footer="288" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
