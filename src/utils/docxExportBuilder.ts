import JSZip from 'jszip';
import {
  latexToOmml,
  fractionToOmml,
  radicalToOmml,
  prepareHtmlForDocxWithMath,
  patchDocxXmlWithOmml
} from './mathOmml';

export interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean; // green highlight
  font?: string; // 'SolaimanLipi' | 'SutonnyMJ' | 'Times New Roman' | 'Cambria Math'
  fontSize?: number; // half-points: 20 = 10pt
  color?: string; // Hex color without # e.g. "DC2626", "7C3AED"
}

/**
 * Escapes text for XML 1.0 safely (strips invalid control characters)
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
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
 * Converts inline text segment into WordprocessingML runs & <m:oMath>
 */
function convertTextSegmentToWordXml(text: string, style: RunStyle, defaultFont: string): string {
  if (!text) return '';

  const activeFont = (style.font && style.font !== 'Combo') ? style.font : (defaultFont && defaultFont !== 'Combo' ? defaultFont : 'SolaimanLipi');
  const isSutonny = activeFont === 'SutonnyMJ';
  const szVal = 20; // All fonts strictly 10pt (20 half-points)

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
    if (style.color) rPrElements.push(`<w:color w:val="${escapeXml(style.color)}"/>`);
    return `<w:rPr>${rPrElements.join('')}</w:rPr>`;
  };

  const makeWordRun = (content: string, fontOverride?: string): string => {
    if (!content) return '';
    const rPrXml = makeRPr(fontOverride || activeFont);
    return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r>`;
  };

  if (!hasLatexMath(text)) {
    if (!isSutonny && activeFont === 'SolaimanLipi') {
      const tokens = text.split(/([a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+|,+)/);
      let res = '';
      for (const tok of tokens) {
        if (!tok) continue;
        if ((/^[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+$/.test(tok) && /[a-zA-Z0-9]/.test(tok)) || /^,+$/.test(tok)) {
          res += makeWordRun(tok, 'Times New Roman');
        } else {
          res += makeWordRun(tok, 'SolaimanLipi');
        }
      }
      return res;
    }
    return makeWordRun(text);
  }

  let resXml = '';
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
 * Normalizes container children into strict top-level OpenXML block elements (<w:p> or <w:tbl>).
 * Guarantees NO nested <w:p> inside another <w:p> and NO loose runs inside <w:tc> or <w:body>.
 */
function normalizeContainerToBlocks(containerNode: Node, currentStyle: RunStyle, defaultFont: string): string[] {
  const blocks: string[] = [];
  let inlineRunBuffer = '';

  const flushInlineBuffer = () => {
    if (inlineRunBuffer.trim()) {
      blocks.push(`<w:p><w:pPr><w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>${inlineRunBuffer}</w:p>`);
    }
    inlineRunBuffer = '';
  };

  const traverse = (node: Node, style: RunStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        inlineRunBuffer += convertTextSegmentToWordXml(text, style, defaultFont);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // 1. Math fraction elements
    if (tagName === 'math-fraction' || el.classList.contains('math-frac') || el.classList.contains('math-fraction')) {
      const numAttr = el.getAttribute('data-num');
      const denAttr = el.getAttribute('data-den');
      if (numAttr !== null && denAttr !== null) {
        inlineRunBuffer += fractionToOmml(numAttr, denAttr);
        return;
      }
      const numEl = el.querySelector('.math-frac-num, .num');
      const denEl = el.querySelector('.math-frac-den, .den');
      if (numEl && denEl) {
        inlineRunBuffer += fractionToOmml(numEl.textContent?.trim() || '', denEl.textContent?.trim() || '');
        return;
      }
    }

    // 2. Table element -> flush current inline buffer and insert <w:tbl> block
    if (tagName === 'table') {
      flushInlineBuffer();

      let rowsXml = '';
      const trNodes = el.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr');
      const totalTableWidth = 10400; // twips (A4 printable area)

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

          // Cells MUST contain block elements only
          const cellBlocks = normalizeContainerToBlocks(td, style, defaultFont);
          let cellContentXml = cellBlocks.join('');
          if (!cellContentXml.trim()) {
            cellContentXml = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>';
          }

          cellsXml += `<w:tc><w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/><w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${cellContentXml}</w:tc>`;
        });

        rowsXml += `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="173" w:hRule="atLeast"/></w:trPr>${cellsXml}</w:tr>`;
      });

      const isBordered =
        el.classList.contains('qc-table') ||
        el.classList.contains('wcr-table') ||
        el.style.border.includes('solid') ||
        el.getAttribute('border') === '1';

      const borderXml = isBordered
        ? '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>'
        : '<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>';

      blocks.push(`<w:tbl><w:tblPr><w:tblW w:w="${totalTableWidth}" w:type="dxa"/>${borderXml}</w:tblPr>${rowsXml}</w:tbl>`);
      return;
    }

    // 3. Paragraph & Heading block elements
    if (tagName === 'p' || tagName === 'div' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      flushInlineBuffer();

      const nextStyle: RunStyle = { ...style, fontSize: 20 };
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        nextStyle.bold = true;
        nextStyle.fontSize = 20;
      }

      // Check alignment
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

      // Check if this paragraph/div contains child tables or sub-paragraphs
      let hasChildBlocks = false;
      for (let i = 0; i < el.childNodes.length; i++) {
        const cTag = el.childNodes[i].nodeType === Node.ELEMENT_NODE ? (el.childNodes[i] as HTMLElement).tagName.toLowerCase() : '';
        if (cTag === 'table' || cTag === 'p' || cTag === 'div' || cTag === 'h1' || cTag === 'h2' || cTag === 'h3') {
          hasChildBlocks = true;
          break;
        }
      }

      if (hasChildBlocks) {
        const childBlocks = normalizeContainerToBlocks(el, nextStyle, defaultFont);
        childBlocks.forEach(b => blocks.push(b));
      } else {
        let innerRuns = '';
        for (let i = 0; i < el.childNodes.length; i++) {
          const cNode = el.childNodes[i];
          if (cNode.nodeType === Node.TEXT_NODE) {
            innerRuns += convertTextSegmentToWordXml(cNode.textContent || '', nextStyle, defaultFont);
          } else if (cNode.nodeType === Node.ELEMENT_NODE) {
            const cEl = cNode as HTMLElement;
            const cTag = cEl.tagName.toLowerCase();
            if (cTag === 'br') {
              innerRuns += '<w:r><w:br/></w:r>';
            } else {
              const spanStyle = getNextStyleForElement(cEl, nextStyle, defaultFont);
              innerRuns += convertTextSegmentToWordXml(cEl.textContent || '', spanStyle, defaultFont);
            }
          }
        }
        if (innerRuns.trim()) {
          blocks.push(`<w:p><w:pPr>${jcXml}<w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>${innerRuns}</w:p>`);
        } else {
          blocks.push('<w:p/>');
        }
      }
      return;
    }

    // 4. Line break
    if (tagName === 'br') {
      inlineRunBuffer += '<w:r><w:br/></w:r>';
      return;
    }

    // 5. Inlines (span, b, i, u, mark, font)
    const nextStyle = getNextStyleForElement(el, style, defaultFont);
    for (let i = 0; i < el.childNodes.length; i++) {
      traverse(el.childNodes[i], nextStyle);
    }
  };

  for (let i = 0; i < containerNode.childNodes.length; i++) {
    traverse(containerNode.childNodes[i], currentStyle);
  }

  flushInlineBuffer();
  return blocks;
}

function getNextStyleForElement(el: HTMLElement, style: RunStyle, defaultFont: string): RunStyle {
  const tagName = el.tagName.toLowerCase();
  const nextStyle: RunStyle = { ...style, fontSize: 20 }; // Strictly 10pt (20 half-points) for all elements

  if (tagName === 'b' || tagName === 'strong') nextStyle.bold = true;
  if (tagName === 'i' || tagName === 'em') nextStyle.italic = true;
  if (tagName === 'u') nextStyle.underline = true;

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
  } else if (el.classList.contains('bijoy-text') || el.classList.contains('bijoy')) {
    nextStyle.font = 'SutonnyMJ';
  } else if (el.classList.contains('ben-text') || el.classList.contains('ben')) {
    nextStyle.font = (defaultFont && defaultFont !== 'Combo') ? defaultFont : 'SolaimanLipi';
  } else if (el.style.fontFamily?.includes('Times New Roman')) {
    nextStyle.font = 'Times New Roman';
  } else if (el.style.fontFamily?.includes('SutonnyMJ')) {
    nextStyle.font = 'SutonnyMJ';
  } else if (el.style.fontFamily?.includes('SolaimanLipi')) {
    nextStyle.font = 'SolaimanLipi';
  }

  // Color extraction
  const styleColor = el.style.color || el.getAttribute('color') || '';
  if (styleColor) {
    const cleanColor = styleColor.trim().toLowerCase();
    if (cleanColor.startsWith('#')) {
      nextStyle.color = cleanColor.substring(1).toUpperCase();
    } else if (cleanColor.startsWith('rgb')) {
      const match = cleanColor.match(/\d+/g);
      if (match && match.length >= 3) {
        nextStyle.color = match.slice(0, 3).map(x => parseInt(x, 10).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
    } else if (cleanColor === 'red') {
      nextStyle.color = 'DC2626';
    } else if (cleanColor === 'purple') {
      nextStyle.color = '7C3AED';
    }
  }

  if (el.classList.contains('text-red-600') || el.classList.contains('text-red-700')) {
    nextStyle.color = 'DC2626';
  } else if (el.classList.contains('text-purple-600') || el.classList.contains('text-purple-700') || el.classList.contains('text-violet-600')) {
    nextStyle.color = '7C3AED';
  }

  nextStyle.fontSize = 20; // Enforce 10pt

  return nextStyle;
}

/**
 * Enforces font size 10pt (20 half-points) on all OpenXML runs and style definitions
 */
function enforceFontSize10InOpenXml(xml: string): string {
  if (!xml) return xml;
  // 1. Replace any existing sz / szCs values with 20 (10pt)
  let updated = xml
    .replace(/<w:sz(?:\s+[^>]*?)?w:val="[^"]*"/gi, '<w:sz w:val="20"')
    .replace(/<w:szCs(?:\s+[^>]*?)?w:val="[^"]*"/gi, '<w:szCs w:val="20"');

  // 2. Ensure all <w:rPr> blocks have <w:sz w:val="20"/><w:szCs w:val="20"/>
  updated = updated.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/gi, (match, inner) => {
    let newInner = inner;
    if (!/<w:sz\b/i.test(newInner)) {
      newInner += '<w:sz w:val="20"/>';
    }
    if (!/<w:szCs\b/i.test(newInner)) {
      newInner += '<w:szCs w:val="20"/>';
    }
    return `<w:rPr>${newInner}</w:rPr>`;
  });

  return updated;
}

/**
 * Fallback OpenXML generator that builds a clean, non-corrupted DOCX zip manually
 */
async function generateNativeOpenXmlBlobFallback(
  htmlContent: string,
  primaryFont: string,
  ommlMap: Map<string, string>
): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const blocks = normalizeContainerToBlocks(doc.body, {}, primaryFont);
  let bodyXml = blocks.join('');
  if (!bodyXml.trim()) {
    bodyXml = '<w:p/>';
  }

  let documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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

  if (ommlMap.size > 0) {
    documentXml = patchDocxXmlWithOmml(documentXml, ommlMap);
  }

  documentXml = enforceFontSize10InOpenXml(documentXml);

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

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Primary DOCX Blob generator:
 * 1. Uses html-docx-js (window.htmlDocx) to convert HTML to compliant .docx
 * 2. Patches word/document.xml with native OMML Math equations (<m:oMath>)
 * 3. Enforces 10pt (20 half-points) font size on all text runs
 * 4. Falls back to strict block-level OpenXML generator if htmlDocx is missing
 */
export async function convertHtmlToNativeDocxBlob(
  htmlContent: string,
  primaryFont: string = 'SolaimanLipi'
): Promise<Blob> {
  const { htmlWithPlaceholders, ommlMap } = prepareHtmlForDocxWithMath(htmlContent);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4 portrait;
      margin: 0.5in;
    }
    * {
      font-size: 10pt !important;
    }
    body, p, span, td, th, div, table, tr, mark, b, strong, i, em, u, h1, h2, h3, h4, h5, h6 {
      font-family: '${primaryFont}', 'SolaimanLipi', 'SutonnyMJ', 'Times New Roman', serif;
      font-size: 10pt !important;
      line-height: 1.15;
      color: #000000;
    }
    p {
      margin: 0 0 4px 0;
      padding: 0;
      line-height: 1.2;
      font-size: 10pt !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 10pt !important;
    }
    td, th {
      vertical-align: top;
      padding: 3px 5px;
      font-size: 10pt !important;
    }
    table.bordered td, table.bordered th, table.wcr-table td, table.wcr-table th, table.qc-table td, table.qc-table th {
      border: 1px solid #000000;
      font-size: 10pt !important;
    }
    .eng-text, .eng {
      font-family: 'Times New Roman', serif !important;
      font-size: 10pt !important;
    }
    mark, .highlight-lime {
      background-color: #00ff00 !important;
      mso-highlight: lime !important;
      font-size: 10pt !important;
    }
  </style>
</head>
<body>
${htmlWithPlaceholders}
</body>
</html>`;

  let docxBlob: Blob | null = null;

  if (typeof window !== 'undefined' && (window as any).htmlDocx) {
    try {
      const rawBlob = (window as any).htmlDocx.asBlob(fullHtml, {
        orientation: 'portrait',
        margins: { top: 720, bottom: 720, left: 720, right: 720, header: 288, footer: 288, gutter: 0 }
      });
      if (rawBlob && rawBlob.size > 0) {
        docxBlob = rawBlob;
      }
    } catch (e) {
      console.warn('htmlDocx.asBlob note, falling back to native OpenXML builder:', e);
    }
  }

  if (docxBlob) {
    try {
      const zip = await JSZip.loadAsync(docxBlob);
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let docXml = await docXmlFile.async('string');
        if (ommlMap.size > 0) {
          docXml = patchDocxXmlWithOmml(docXml, ommlMap);
        }
        // Enforce font size 10pt (20 half-points) on all runs
        docXml = enforceFontSize10InOpenXml(docXml);

        // Guarantee A4 paper size and exactly 0.5 inch (720 twips) margins in sectPr
        const a4SectPr = '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="288" w:footer="288" w:gutter="0"/></w:sectPr>';
        if (/<w:sectPr(?:\s[^>]*)?>[\s\S]*?<\/w:sectPr>/i.test(docXml)) {
          docXml = docXml.replace(/<w:sectPr(?:\s[^>]*)?>[\s\S]*?<\/w:sectPr>/i, a4SectPr);
        } else if (/<\/w:body>/i.test(docXml)) {
          docXml = docXml.replace(/<\/w:body>/i, `${a4SectPr}</w:body>`);
        }
        zip.file('word/document.xml', docXml);

        // Also enforce in styles.xml if present
        const stylesFile = zip.file('word/styles.xml');
        if (stylesFile) {
          let stylesXml = await stylesFile.async('string');
          stylesXml = enforceFontSize10InOpenXml(stylesXml);
          zip.file('word/styles.xml', stylesXml);
        }

        return await zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
      return docxBlob;
    } catch (e) {
      console.warn('Failed patching OMML / page layout on htmlDocx blob:', e);
      return docxBlob;
    }
  }

  return generateNativeOpenXmlBlobFallback(htmlContent, primaryFont, ommlMap);
}
