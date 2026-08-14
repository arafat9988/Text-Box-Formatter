import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { isEnglishWord } from './bijoy';

function createMixedFontTextRuns(text: string, isBold: boolean = false): TextRun[] {
  const runs: TextRun[] = [];
  if (!text) return runs;

  const solaimanFontObj = { name: 'SolaimanLipi', ascii: 'SolaimanLipi', hAnsi: 'SolaimanLipi', cs: 'SolaimanLipi', eastAsia: 'SolaimanLipi' };
  const timesFontObj = { name: 'Times New Roman', ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: 'Times New Roman', eastAsia: 'Times New Roman' };

  const tokens = text.split(/(\s+)/);
  for (const token of tokens) {
    if (!token) continue;
    if (!token.trim()) {
      runs.push(new TextRun({ text: token, font: solaimanFontObj, bold: isBold, italics: false }));
      continue;
    }

    if (isEnglishWord(token)) {
      runs.push(new TextRun({ text: token, font: timesFontObj, bold: isBold, italics: false }));
    } else if (/[\u0980-\u09FF]/.test(token) && /[a-zA-Z0-9]/.test(token)) {
      const subParts = token.split(/([a-zA-Z0-9]+)/);
      for (const part of subParts) {
        if (!part) continue;
        if (/^[a-zA-Z0-9]+$/.test(part)) {
          runs.push(new TextRun({ text: part, font: timesFontObj, bold: isBold, italics: false }));
        } else if (/[\u0980-\u09FF]/.test(part)) {
          runs.push(new TextRun({ text: part, font: solaimanFontObj, bold: isBold, italics: false }));
        } else {
          runs.push(new TextRun({ text: part, font: timesFontObj, bold: isBold, italics: false }));
        }
      }
    } else {
      runs.push(new TextRun({ text: token, font: solaimanFontObj, bold: isBold, italics: false }));
    }
  }

  return runs;
}

function parseFormattedTextRuns(lineText: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = lineText.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      runs.push(...createMixedFontTextRuns(part.slice(2, -2), false));
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      // Italic syntax in Markdown - render as NORMAL text (italics disabled)
      runs.push(...createMixedFontTextRuns(part.slice(1, -1), false));
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      runs.push(...createMixedFontTextRuns(part.slice(1, -1), false));
    } else {
      runs.push(...createMixedFontTextRuns(part, false));
    }
  }

  return runs.length > 0 ? runs : createMixedFontTextRuns(lineText, false);
}

export async function downloadAsDocx(text: string, filename: string = 'Gemini_Chat_Response.docx') {
  const lines = text.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      const content = trimmed.replace(/^#\s+/, '');
      children.push(
        new Paragraph({
          children: parseFormattedTextRuns(content),
          heading: HeadingLevel.HEADING_1,
        })
      );
    } else if (trimmed.startsWith('## ')) {
      const content = trimmed.replace(/^##\s+/, '');
      children.push(
        new Paragraph({
          children: parseFormattedTextRuns(content),
          heading: HeadingLevel.HEADING_2,
        })
      );
    } else if (trimmed.startsWith('### ')) {
      const content = trimmed.replace(/^###\s+/, '');
      children.push(
        new Paragraph({
          children: parseFormattedTextRuns(content),
          heading: HeadingLevel.HEADING_3,
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      const runs = parseFormattedTextRuns(content);
      children.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
        })
      );
    } else {
      const runs = parseFormattedTextRuns(trimmed);
      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
