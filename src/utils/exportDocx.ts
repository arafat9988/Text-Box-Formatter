import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import JSZip from 'jszip';
import { isEnglishWord } from './bijoy';
import { prepareHtmlForDocxWithMath, patchDocxXmlWithOmml } from './mathOmml';

function createMixedFontTextRuns(text: string, isBold: boolean = false): TextRun[] {
  const runs: TextRun[] = [];
  if (!text) return runs;

  const solaimanFontObj = { name: 'SolaimanLipi', ascii: 'SolaimanLipi', hAnsi: 'SolaimanLipi', cs: 'SolaimanLipi', eastAsia: 'SolaimanLipi' };
  const timesFontObj = { name: 'Times New Roman', ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: 'Times New Roman', eastAsia: 'Times New Roman' };

  const formatTokenRun = (tok: string) => {
    if (!tok) return;
    if (isEnglishWord(tok)) {
      runs.push(new TextRun({ text: tok, font: timesFontObj, bold: isBold, italics: false, size: 20 }));
    } else if (/[\u0980-\u09FF]/.test(tok) && /[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]/.test(tok)) {
      const subParts = tok.split(/([a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+)/);
      for (const part of subParts) {
        if (!part) continue;
        if (isEnglishWord(part) || /^[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+$/.test(part)) {
          runs.push(new TextRun({ text: part, font: timesFontObj, bold: isBold, italics: false, size: 20 }));
        } else if (/[\u0980-\u09FF]/.test(part)) {
          runs.push(new TextRun({ text: part, font: solaimanFontObj, bold: isBold, italics: false, size: 20 }));
        } else {
          runs.push(new TextRun({ text: part, font: timesFontObj, bold: isBold, italics: false, size: 20 }));
        }
      }
    } else {
      runs.push(new TextRun({ text: tok, font: solaimanFontObj, bold: isBold, italics: false, size: 20 }));
    }
  };

  const tokens = text.split(/(\s+)/);
  for (const token of tokens) {
    if (!token) continue;
    if (!token.trim()) {
      runs.push(new TextRun({ text: token, font: solaimanFontObj, bold: isBold, italics: false, size: 20 }));
      continue;
    }

    if (token.includes(',')) {
      const parts = token.split(/(,+)/);
      for (const p of parts) {
        if (!p) continue;
        if (/^,+$/.test(p)) {
          runs.push(new TextRun({ text: p, font: timesFontObj, bold: isBold, italics: false, size: 20 }));
        } else {
          formatTokenRun(p);
        }
      }
    } else {
      formatTokenRun(token);
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

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  }, 10000);
}

function exportHtmlAsDoc(text: string, filename: string) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'SolaimanLipi', 'Times New Roman', sans-serif; font-size: 10pt; line-height: 1.5; color: #111; }
  h1, h2, h3, p, span, div { font-family: 'SolaimanLipi', 'Times New Roman', sans-serif; font-size: 10pt; color: #000; }
  p { margin: 0 0 8px 0; font-size: 10pt; }
  .eng { font-family: 'Times New Roman', serif; font-size: 10pt; }
  .ben { font-family: 'SolaimanLipi', sans-serif; font-size: 10pt; }
</style>
</head>
<body>
${text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<p>&nbsp;</p>').join('\n')}
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const safeName = filename.replace(/\.docx$/i, '.doc');
  triggerBlobDownload(blob, safeName);
}

export async function downloadAsDocx(text: string, filename: string = 'Gemini_Chat_Response.docx') {
  if (!text || !text.trim()) {
    text = 'কোনো বার্তা নেই';
  }

  const safeFilename = filename.endsWith('.docx') || filename.endsWith('.doc') ? filename : `${filename}.docx`;

  try {
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
      styles: {
        default: {
          document: {
            run: {
              size: 20, // 10pt
              font: 'SolaimanLipi',
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // A4 width (210mm) in twips
                height: 16838, // A4 height (297mm) in twips
              },
              margin: {
                top: 720,    // 0.5 inch in twips
                right: 720,  // 0.5 inch in twips
                bottom: 720, // 0.5 inch in twips
                left: 720,   // 0.5 inch in twips
                header: 288,
                footer: 288,
                gutter: 0,
              },
            },
          },
          children,
        },
      ],
    });

    let blob = await Packer.toBlob(doc);

    // Patch with OMML equations if any LaTeX math is found in text
    try {
      const { ommlMap } = prepareHtmlForDocxWithMath(text);
      if (ommlMap.size > 0) {
        const zip = await JSZip.loadAsync(blob);
        let docXml = await zip.file("word/document.xml")?.async("string");
        if (docXml) {
          docXml = patchDocxXmlWithOmml(docXml, ommlMap);
          zip.file("word/document.xml", docXml);
          blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
        }
      }
    } catch (mathErr) {
      console.warn('Math OMML patching note:', mathErr);
    }

    triggerBlobDownload(blob, safeFilename);
  } catch (error) {
    console.warn('Docx Packer failed, falling back to HTML Word doc:', error);
    exportHtmlAsDoc(text, safeFilename);
  }
}
