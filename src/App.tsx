/**
 * Text Box Formatter & Converter Application
 * Author: arafat-3802-bangla-english-fixer
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  convertToEnglishDigits,
  isEnglishWord,
  unicodeToBijoy,
  bijoyToUnicode,
  isBijoyText,
  formatHtmlTextPiece
} from './utils/bijoy';
import {
  parseQuestions,
  parseVersionQuestions,
  generateFormattedTableHtml,
  generateVersionFormattedTableHtml,
  formatConverterTextOutput,
  formatBlocksToStructuredText
} from './utils/parser';
import { translateBengaliToEnglish, localRuleBasedTranslate } from './utils/translate';
import { ChatTab } from './components/ChatTab';
import { QuickLinksMenu } from './components/QuickLinksMenu';

declare global {
  interface Window {
    Tesseract?: any;
    pdfjsLib?: any;
    mammoth?: any;
    htmlDocx?: any;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'formatter' | 'right-formatter' | 'question-collect' | 'version' | 'chat'>('converter');
  const [subjectCode, setSubjectCode] = useState<'Ban' | 'Eng' | 'GK'>('Ban');

  const [converterPreviewText, setConverterPreviewText] = useState<string>('');
  const [converterHtmlPreview, setConverterHtmlPreview] = useState<string>('');
  const [converterFileUrl, setConverterFileUrl] = useState<string | null>(null);
  const [converterFileName, setConverterFileName] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bijoy to Unicode DOCX state
  const [b2uPreviewText, setB2uPreviewText] = useState<string>('');
  const [b2uHtmlPreview, setB2uHtmlPreview] = useState<string>('');
  const [b2uFileUrl, setB2uFileUrl] = useState<string | null>(null);
  const [b2uFileName, setB2uFileName] = useState<string>('');
  const [isB2uConverting, setIsB2uConverting] = useState<boolean>(false);
  const [b2uCopySuccess, setB2uCopySuccess] = useState<boolean>(false);
  const b2uFileInputRef = useRef<HTMLInputElement>(null);

  const handleClearConverter = () => {
    setConverterPreviewText('');
    setConverterHtmlPreview('');
    if (converterFileUrl) {
      URL.revokeObjectURL(converterFileUrl);
    }
    setConverterFileUrl(null);
    setConverterFileName('');
    setCopySuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleB2uClearConverter = () => {
    setB2uPreviewText('');
    setB2uHtmlPreview('');
    if (b2uFileUrl) {
      URL.revokeObjectURL(b2uFileUrl);
    }
    setB2uFileUrl(null);
    setB2uFileName('');
    setB2uCopySuccess(false);
    if (b2uFileInputRef.current) {
      b2uFileInputRef.current.value = '';
    }
  };

  // Helper XML parsing and text manipulation functions for fully client-side DOCX conversion
  const xmlUnescapeText = (text: string): string => {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  };

  const xmlEscapeText = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const isBijoyFont = (rPrXml: string): boolean => {
    if (!rPrXml) return false;
    const fontsMatch = rPrXml.match(/<w:rFonts\b[^>]*\/>/i);
    if (!fontsMatch) return false;
    const fontsTag = fontsMatch[0];

    const attrValues: string[] = [];
    const valRegex = /="([^"]*)"/g;
    let match;
    while ((match = valRegex.exec(fontsTag)) !== null) {
      attrValues.push(match[1]);
    }

    const combinedValues = attrValues.join(" ");
    return /sutonny|bijoy|mjsutonny|sutonn|\bmj\b/i.test(combinedValues);
  };

  const processDocxXmlContentClient = (xmlContent: string): string => {
    return xmlContent.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
      let runFullText = "";
      
      const rPrMatch = rXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/i);
      const baseRPr = rPrMatch ? rPrMatch[0] : "";

      const getUpdatedRPr = (fontName: 'SutonnyMJ' | 'Times New Roman'): string => {
        const fontXml = `<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:eastAsia="${fontName}"/>`;
        if (!baseRPr) return `<w:rPr>${fontXml}</w:rPr>`;
        if (/<w:rFonts\s+[^>]*\/>/i.test(baseRPr)) {
          return baseRPr.replace(/<w:rFonts\s+[^>]*\/>/i, fontXml);
        } else {
          return baseRPr.replace(/(<w:rPr(?:\s[^>]*)?>)/i, `$1${fontXml}`);
        }
      };

      // Collect all text from this run
      rXml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
        runFullText += xmlUnescapeText(tContent);
        return "";
      });

      if (!runFullText) return rXml;

      const hasBengali = /[\u0964\u0965\u0980-\u09FF]/.test(runFullText);
      if (!hasBengali) return rXml;

      // Convert full text at once
      const convertedFullText = runFullText.split(/([\u0964\u0965\u0980-\u09FF]+[\?\!\,\;\:]*)/g).map(part => {
        if (/[\u0964\u0965\u0980-\u09FF]/.test(part)) {
          return unicodeToBijoy(part);
        }
        return part;
      }).join('');

      const newRPr = getUpdatedRPr('SutonnyMJ');
      let updatedR = rXml;
      if (baseRPr) {
        updatedR = updatedR.replace(baseRPr, newRPr);
      } else {
        updatedR = updatedR.replace(/(<w:r(?:\s[^>]*)?>)/i, `$1${newRPr}`);
      }

      // Put the converted text into the first <w:t> and clear others
      let firstTFound = false;
      updatedR = updatedR.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
        if (!firstTFound) {
          firstTFound = true;
          return `${tOpen}${xmlEscapeText(convertedFullText)}${tClose}`;
        } else {
          return `${tOpen}${tClose}`;
        }
      });

      return updatedR;
    });
  };

  const processDocxXmlContentToUnicodeClient = (xmlContent: string): string => {
    return xmlContent.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
      // 1. Extract all text from this run
      let runFullText = "";
      const tMatches: { open: string, content: string, close: string }[] = [];
      
      const rPrMatch = rXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/i);
      const baseRPr = rPrMatch ? rPrMatch[0] : "";

      const getUpdatedRPr = (fontName: 'SolaimanLipi' | 'Times New Roman'): string => {
        const fontXml = `<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:eastAsia="${fontName}"/>`;
        if (!baseRPr) return `<w:rPr>${fontXml}</w:rPr>`;
        if (/<w:rFonts\s+[^>]*\/>/i.test(baseRPr)) {
          return baseRPr.replace(/<w:rFonts\s+[^>]*\/>/i, fontXml);
        } else {
          return baseRPr.replace(/(<w:rPr(?:\s[^>]*)?>)/i, `$1${fontXml}`);
        }
      };

      // Collect text segments
      rXml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
        const raw = xmlUnescapeText(tContent);
        runFullText += raw;
        tMatches.push({ open: tOpen, content: raw, close: tClose });
        return "";
      });

      if (!runFullText) return rXml;

      const fontIsBijoy = isBijoyFont(baseRPr);
      const hasExtendedAscii = /[^\x00-\x7F]/.test(runFullText);
      const hasBijoyMarkers = /[‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏ×Ø™¢ÙÜßáäå¤§©®¯°±³µ¶º»¿ÀÇÈÍÐÑÒÓÔÕÖÚÛÝÞàâãæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(runFullText);
      const shouldConvert = fontIsBijoy || hasExtendedAscii || hasBijoyMarkers;

      if (!shouldConvert) return rXml;

      // Convert full text at once to preserve context for re-arrangement
      const convertedFullText = bijoyToUnicode(runFullText);
      const newRPr = getUpdatedRPr('SolaimanLipi');
      
      let updatedR = rXml;
      if (baseRPr) {
        updatedR = updatedR.replace(baseRPr, newRPr);
      } else {
        updatedR = updatedR.replace(/(<w:r(?:\s[^>]*)?>)/i, `$1${newRPr}`);
      }

      // We put the converted text into the FIRST <w:t> and clear the rest
      let firstTFound = false;
      updatedR = updatedR.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
        if (!firstTFound) {
          firstTFound = true;
          return `${tOpen}${xmlEscapeText(convertedFullText)}${tClose}`;
        } else {
          return `${tOpen}${tClose}`; // empty text
        }
      });

      return updatedR;
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsConverting(true);
    setCopySuccess(false);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 1. Extract previews using Mammoth
      if (!window.mammoth) {
        throw new Error("Mammoth library load error.");
      }
      
      const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
      const rawHtml = htmlResult.value || "";

      // Convert Bengali text inside HTML text nodes to Bijoy, wrapping Bengali in bijoy-text span
      const convertedHtmlPreview = rawHtml.replace(/>([^<]+)</g, (_, textContent) => {
        const parts = textContent.split(/([\u0964\u0965\u0980-\u09FF]+[\?\!\,\;\:]*)/g);
        const converted = parts.map((part: string) => {
          if (/[\u0964\u0965\u0980-\u09FF]/.test(part)) {
            const bijoyStr = unicodeToBijoy(part);
            return `<span class="bijoy-text">${bijoyStr}</span>`;
          }
          return part;
        }).join('');
        return `>${converted}<`;
      });

      // Plain text for clipboard copying
      const textResult = await window.mammoth.extractRawText({ arrayBuffer });
      const rawText = textResult.value || "";
      const convertedPlainText = rawText.split("\n").map((line: string) => {
        return line.split(/([\u0964\u0965\u0980-\u09FF]+[\?\!\,\;\:]*)/g).map((part: string) => {
          if (/[\u0964\u0965\u0980-\u09FF]/.test(part)) {
            return unicodeToBijoy(part);
          }
          return part;
        }).join('');
      }).join("\n");

      // 2. Process all XML files inside the DOCX zip archive
      const zip = await JSZip.loadAsync(arrayBuffer);
      const xmlFiles = Object.keys(zip.files).filter(fName => fName.startsWith("word/") && fName.endsWith(".xml"));

      for (const fileName of xmlFiles) {
        const xmlContent = await zip.file(fileName)?.async("string");
        if (xmlContent) {
          const convertedXml = processDocxXmlContentClient(xmlContent);
          zip.file(fileName, convertedXml);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      
      setConverterFileUrl(url);
      setConverterFileName(file.name);
      setConverterPreviewText(convertedPlainText);
      setConverterHtmlPreview(convertedHtmlPreview);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  const handleB2uFileUpload = async (file: File) => {
    setIsB2uConverting(true);
    setB2uCopySuccess(false);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 1. Process all XML files inside the DOCX zip archive
      const zip = await JSZip.loadAsync(arrayBuffer);
      const xmlFiles = Object.keys(zip.files).filter(fName => fName.startsWith("word/") && fName.endsWith(".xml"));

      for (const fileName of xmlFiles) {
        const xmlContent = await zip.file(fileName)?.async("string");
        if (xmlContent) {
          const convertedXml = processDocxXmlContentToUnicodeClient(xmlContent);
          zip.file(fileName, convertedXml);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const arrayBufferForMammoth = await blob.arrayBuffer();
      
      // 2. Extract previews using Mammoth
      if (!window.mammoth) {
        throw new Error("Mammoth library load error.");
      }
      
      const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer: arrayBufferForMammoth });
      const rawHtml = htmlResult.value || "";

      const convertedHtmlPreview = rawHtml.replace(/>([^<]+)</g, (_, textContent) => {
        const parts = textContent.split(/([\u0964\u0965\u0980-\u09FF]+[\?\!\,\;\:]*)/g);
        const converted = parts.map((part: string) => {
          if (!part) return '';
          if (/[\u0964\u0965\u0980-\u09FF]/.test(part)) {
            return `<span class="ben-text">${part}</span>`;
          }
          return `<span class="eng-text" style="font-family: 'Times New Roman', Arial, sans-serif;">${part}</span>`;
        }).join('');
        return `>${converted}<`;
      });

      const textResult = await window.mammoth.extractRawText({ arrayBuffer: arrayBufferForMammoth });
      const convertedPlainText = textResult.value || "";

      const url = window.URL.createObjectURL(blob);
      setB2uFileUrl(url);
      setB2uFileName(file.name);
      setB2uPreviewText(convertedPlainText);
      setB2uHtmlPreview(convertedHtmlPreview);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Conversion failed');
    } finally {
      setIsB2uConverting(false);
    }
  };
  
  // Custom Dictionary State
  const [customDict, setCustomDict] = useState<string>('');
  const [dictMsg, setDictMsg] = useState<string>('');

  // Tab 1: Converter State
  const [inputText1, setInputText1] = useState<string>('');
  const [uploadedFileName1, setUploadedFileName1] = useState<string>('');
  const [statusMsg1, setStatusMsg1] = useState<string>('');
  const [actionMsg1, setActionMsg1] = useState<string>('');
  const [actionMsg2, setActionMsg2] = useState<string>('');

  // Tab 2: Formatter State
  const [inputText2, setInputText2] = useState<string>('');
  const [uploadedFileName2, setUploadedFileName2] = useState<string>('');
  const [statusMsg2, setStatusMsg2] = useState<string>('');
  const [actionMsgT1, setActionMsgT1] = useState<string>('');
  const [actionMsgT2, setActionMsgT2] = useState<string>('');

  // Tab 2.5: Text Right Formatter State
  const [subjectCodeRight, setSubjectCodeRight] = useState<'Ban' | 'Eng' | 'GK'>('Ban');
  const [inputTextRight, setInputTextRight] = useState<string>('');
  const [uploadedFileNameRight, setUploadedFileNameRight] = useState<string>('');
  const [statusMsgRight, setStatusMsgRight] = useState<string>('');
  const [actionMsgTR1, setActionMsgTR1] = useState<string>('');
  const [actionMsgTR2, setActionMsgTR2] = useState<string>('');

  // Tab 3: Question Collect State
  const [qcInputText, setQcInputText] = useState<string>('');
  const [qcFileName, setQcFileName] = useState<string>('');
  const [qcFileStatus, setQcFileStatus] = useState<string>('');
  const [qcResultText, setQcResultText] = useState<string>('');
  const [msgQc, setMsgQc] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [qcStatusMsg, setQcStatusMsg] = useState<string>('');
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tab 4: Version State
  const [inputVersionText, setInputVersionText] = useState<string>('');
  const [versionResultText, setVersionResultText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [msgVer1, setMsgVer1] = useState<string>('');
  const [versionFileName, setVersionFileName] = useState<string>('No file chosen');
  const [versionFileStatus, setVersionFileStatus] = useState<string>('');
  const [versionFileResultText, setVersionFileResultText] = useState<string>('');
  const [msgVer2, setMsgVer2] = useState<string>('');

  const translateTimerRef = useRef<any>(null);

  // Load custom dict from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('customUserDict');
    if (saved) setCustomDict(saved);

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
    }
  }, []);

  const saveCustomDictionary = () => {
    localStorage.setItem('customUserDict', customDict);
    setDictMsg('সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setDictMsg(''), 2500);
  };

  /* ================= FILE OCR / PDF / DOCX HANDLER ================= */
  const processFiles = async (files: FileList | File[], targetInput: 'inputText1' | 'inputText2' | 'inputTextRight') => {
    const setStatus = targetInput === 'inputText1' ? setStatusMsg1 : (targetInput === 'inputTextRight' ? setStatusMsgRight : setStatusMsg2);
    setStatus('ফাইল প্রসেসিং চলছে...');

    if (files && files.length > 0) {
      const first = files[0];
      const baseName = first.name.replace(/\.[^/.]+$/, '');
      const docxName = baseName + '.docx';
      if (targetInput === 'inputText1') setUploadedFileName1(docxName);
      else if (targetInput === 'inputTextRight') setUploadedFileNameRight(docxName);
      else setUploadedFileName2(docxName);
    }

    let extractedText = '';
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (file.type.startsWith('image/')) {
          let ocrSuccess = false;
          try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => {
                const resStr = reader.result as string;
                const base64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;
            const res = await fetch('/api/ocr', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64Data, mimeType: file.type || 'image/png' })
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const data = await res.json();
              if (data && data.text) {
                extractedText += data.text + '\n\n';
                ocrSuccess = true;
              }
            }
          } catch (ocrErr) {
            console.warn('Gemini OCR endpoint failed, falling back to Tesseract:', ocrErr);
          }

          if (!ocrSuccess && window.Tesseract) {
            const worker = await window.Tesseract.createWorker(['eng', 'ben']);
            const ret = await worker.recognize(file);
            await worker.terminate();
            extractedText += ret.data.text + '\n\n';
          }
        } else if (file.type === 'application/pdf') {
          if (window.pdfjsLib) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let p = 1; p <= pdf.numPages; p++) {
              const page = await pdf.getPage(p);
              const textContent = await page.getTextContent();
              extractedText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
            }
          }
        } else if (file.name.endsWith('.docx')) {
          if (window.mammoth) {
            const arrayBuffer = await file.arrayBuffer();
            let docxText = "";
            try {
              const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
              if (htmlResult && htmlResult.value) {
                const extracted = extractTextWithHighlightsFromHtml(htmlResult.value);
                if (extracted.text.trim()) {
                  docxText = extracted.text;
                }
              }
            } catch (err) {
              console.warn("Mammoth convertToHtml failed:", err);
            }
            if (!docxText.trim()) {
              const result = await window.mammoth.extractRawText({ arrayBuffer });
              docxText = result.value;
            }
            extractedText += docxText + '\n';
          }
        }
      } catch (e) {
        console.error('File parsing error:', e);
      }
    }

    if (extractedText.trim()) {
      const cleanedFinal = cleanPastedText(extractedText);
      if (targetInput === 'inputText1') setInputText1(prev => (prev ? prev + '\n' + cleanedFinal : cleanedFinal));
      else if (targetInput === 'inputTextRight') setInputTextRight(prev => (prev ? prev + '\n' + cleanedFinal : cleanedFinal));
      else setInputText2(prev => (prev ? prev + '\n' + cleanedFinal : cleanedFinal));
      setStatus('সফলভাবে ফাইল লোড করা হয়েছে!');
    } else {
      setStatus('ফাইল থেকে টেক্সট পাওয়া যায়নি।');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  /* ================= HTML EXTRACTOR WITH HIGHLIGHT & UNDERLINE DETECTION ================= */
  const extractTextWithHighlightsFromHtml = (html: string): { text: string; hasHighlight: boolean } => {
    if (!html) return { text: '', hasHighlight: false };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const isHighlightedEl = (el: HTMLElement): boolean => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'mark') return true;

        const className = el.className || '';
        if (typeof className === 'string' && /\b(highlight|marked|bg-|shading)\b/i.test(className)) {
          return true;
        }

        const style = el.getAttribute('style') || '';
        if (/mso-highlight|background/i.test(style)) {
          const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
          if (bgMatch) {
            const colorVal = bgMatch[1].trim().toLowerCase();
            if (
              !colorVal ||
              colorVal === 'transparent' ||
              colorVal === 'none' ||
              colorVal === 'inherit' ||
              colorVal === 'initial' ||
              colorVal === 'unset' ||
              colorVal === '#ffffff' ||
              colorVal === '#fff' ||
              colorVal === 'white' ||
              colorVal === '#000000' ||
              colorVal === '#000' ||
              colorVal === 'black' ||
              colorVal.startsWith('rgba(0, 0, 0') ||
              colorVal.startsWith('rgba(255, 255, 255')
            ) {
              return false;
            }
          }
          return true;
        }

        return false;
      };

      const isUnderlineEl = (el: HTMLElement): boolean => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'u' || tag === 'ins') return true;
        const style = el.getAttribute('style') || '';
        if (/text-decoration\s*:\s*underline/i.test(style) || /mso-underline/i.test(style)) return true;
        return false;
      };

      let foundHighlight = false;
      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const isHighlight = isHighlightedEl(el);
          const isUnderline = isUnderlineEl(el);

          let childText = '';
          el.childNodes.forEach((child) => {
            childText += processNode(child);
          });

          if (isUnderline && childText.trim() && !/^<u>[\s\S]*<\/u>$/.test(childText.trim())) {
            childText = `<u>${childText}</u>`;
          }

          if (isHighlight && childText.trim()) {
            foundHighlight = true;
            const trimmed = childText.trim();
            if (!/[*✓✔√]/.test(trimmed)) {
              childText = childText.replace(/(\S)(\s*)$/, '$1*$2');
            }
          }

          if (['p', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'td', 'th', 'br'].includes(tag)) {
            return childText.trimEnd() + '\n';
          }
          return childText;
        }
        return '';
      };

      let extractedText = processNode(doc.body);
      extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      return { text: extractedText, hasHighlight: foundHighlight };
    } catch (err) {
      return { text: '', hasHighlight: false };
    }
  };

  const cleanPastedText = (rawText: string): string => {
    if (!rawText) return '';
    const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    let cleanedLines: string[] = [];

    const isLineStartItem = (line: string): boolean => {
      let t = line.trim();
      if (!t) return false;
      if (/^[০-৯\d]{1,3}\s*[\.\)و।\-:]/.test(t)) return true;
      if (/^[০-৯\d]{1,3}\s+[A-Z"'\u0980-\u09FF\(\[\{]/.test(t)) return true;
      if (/^[\(\（\[]?[ক-ঘa-d1-4১-৪0-4][\)\）\]\.\:]/.test(t)) return true;
      if (/^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|বিশেষ দ্রষ্টব্য|MQB|TB|PB|P|Q|Sec|Chap|Page|Ref|JU|DU|RU|KU|BU|SU|IU|COU|BAU|BCS|MBA|BBA)[\:\-\s]/i.test(t)) return true;
      if (/^\[[\s\S]*?\]/.test(t)) return true;
      return false;
    };

    let currentParagraph = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      if (!trimmed) {
        if (currentParagraph) {
          cleanedLines.push(currentParagraph);
          currentParagraph = '';
        }
        cleanedLines.push('');
        continue;
      }

      if (i === 0 || isLineStartItem(trimmed)) {
        if (currentParagraph) {
          cleanedLines.push(currentParagraph);
          currentParagraph = '';
        }
        currentParagraph = line;
      } else {
        if (currentParagraph) {
          currentParagraph = currentParagraph.trimRight() + ' ' + line.trimLeft();
        } else {
          currentParagraph = line;
        }
      }
    }

    if (currentParagraph) {
      cleanedLines.push(currentParagraph);
    }

    return cleanedLines.join('\n');
  };

  /* ================= PASTE WITH HIGHLIGHT SUPPORT ================= */
  const handleTextAreaPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    currentVal: string,
    setter: (v: string) => void,
    targetKey: 'inputText1' | 'inputText2' | 'inputTextRight'
  ) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
    }
    if (files.length > 0) {
      processFiles(files, targetKey);
      return;
    }

    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    let textToInsert = '';
    if (html) {
      const extracted = extractTextWithHighlightsFromHtml(html);
      textToInsert = extracted.text;
    }
    if (!textToInsert && plain) {
      textToInsert = plain;
    }

    if (textToInsert) {
      const cleaned = cleanPastedText(textToInsert);
      const target = e.currentTarget;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const newVal = currentVal.substring(0, start) + cleaned + currentVal.substring(end);
      setter(newVal);
    }
  };

  /* ================= RENDER DUAL PREVIEW ELEMENTS ================= */
  const renderFormattedSpans = (text: string, fontMode: 'SolaimanLipi' | 'SutonnyMJ', forceBijoyInput: boolean = false) => {
    if (!text || !text.trim()) return null;
    const lines = text.split('\n');

    return lines.map((line, lIdx) => {
      if (!line.trim()) return <p key={lIdx} style={{ margin: 0, padding: 0, minHeight: '0.5em' }}>&nbsp;</p>;
      
      const isQuestionHeading = /^\s*(?:\d+[\.\:\)]|[\u09E6-\u09EF]+[\.\:\)])/i.test(line);
      const isExplanationLine = /^\s*(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note)[\:\-\s]/i.test(line);
      const hasHighlightIndicator = /[*✓✔√#]/.test(line) || line.includes('mso-highlight') || line.includes('background-color') || line.includes('<mark');
      const isCorrectOption = hasHighlightIndicator && !isQuestionHeading && !isExplanationLine;
      
      const renderTokens = (rawSegment: string, prefix: string) => {
        const tokens = rawSegment.split(/(\s+)/);
        return tokens.map((token, tIdx) => {
          if (!token.trim()) {
            return <span key={`${prefix}-${tIdx}`}>{token}</span>;
          }
          if (isEnglishWord(token, customDict)) {
            return <span key={`${prefix}-${tIdx}`} className="eng-text">{token}</span>;
          } else {
            if (fontMode === 'SutonnyMJ') {
              const bijoyToken = forceBijoyInput ? token : unicodeToBijoy(token);
              return <span key={`${prefix}-${tIdx}`} className="bijoy-text">{bijoyToken}</span>;
            } else {
              const uniToken = forceBijoyInput ? bijoyToUnicode(token) : token;
              return <span key={`${prefix}-${tIdx}`} className="ben-text" style={{ fontFamily: "'SolaimanLipi', 'Solaiman Lipi', sans-serif", msoBidiFontFamily: "'SolaimanLipi'", msoAsciiFontFamily: "'SolaimanLipi'", msoHansiFontFamily: "'SolaimanLipi'" } as any}>{uniToken}</span>;
            }
          }
        });
      };

      let contentElements: React.ReactNode;
      if (/<u\b[^>]*>[\s\S]*?<\/u>/i.test(line)) {
        const tagParts = line.split(/(<u\b[^>]*>[\s\S]*?<\/u>)/gi);
        contentElements = tagParts.map((part, pIdx) => {
          const uMatch = part.match(/^<u\b[^>]*>([\s\S]*?)<\/u>$/i);
          if (uMatch) {
            return (
              <u key={pIdx} className="underline" style={{ textDecoration: 'underline' }}>
                {renderTokens(uMatch[1], `u-${pIdx}`)}
              </u>
            );
          }
          return <React.Fragment key={pIdx}>{renderTokens(part, `txt-${pIdx}`)}</React.Fragment>;
        });
      } else {
        contentElements = renderTokens(line, 'raw');
      }

      if (isCorrectOption) {
        return (
          <p key={lIdx} style={{ margin: '2px 0', padding: 0, lineHeight: 1.3 }}>
            <span style={{ backgroundColor: '#00ff00', background: '#00ff00', msoHighlight: 'lime', color: '#000000', fontWeight: 'normal', padding: '1px 6px', borderRadius: '3px' } as any}>
              <mark style={{ backgroundColor: '#00ff00', background: '#00ff00', msoHighlight: 'lime', color: '#000000', fontWeight: 'normal' } as any}>
                {contentElements}
              </mark>
            </span>
          </p>
        );
      }

      return (
        <p key={lIdx} style={{ margin: 0, padding: 0, lineHeight: 1.2 }}>
          {contentElements}
        </p>
      );
    });
  };

  /* ================= COPY & DOWNLOAD ACTIONS ================= */
  const fallbackDomCopy = (el: HTMLElement | null, fallbackText: string, setMsg: (msg: string) => void) => {
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        try {
          const successful = document.execCommand('copy');
          selection.removeAllRanges();
          if (successful) {
            setMsg('কপি হয়েছে!');
            setTimeout(() => setMsg(''), 2000);
            return;
          }
        } catch (e) {
          selection.removeAllRanges();
        }
      }
    }

    if (fallbackText) {
      navigator.clipboard.writeText(fallbackText).then(() => {
        setMsg('কপি হয়েছে!');
        setTimeout(() => setMsg(''), 2000);
      }).catch(() => {
        setMsg('কপি করা যায়নি!');
        setTimeout(() => setMsg(''), 2000);
      });
    } else {
      setMsg('কপি করা যায়নি!');
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const copyFormattedContent = (containerId: string, setMsg: (msg: string) => void, rawFallbackText?: string) => {
    const el = document.getElementById(containerId);
    if (!el && !rawFallbackText) {
      setMsg('কপি করা যায়নি!');
      return;
    }

    let htmlContent = el ? el.innerHTML : '';
    let plainText = el ? (el.innerText || el.textContent || '') : (rawFallbackText || '');

    if (htmlContent) {
      // Ensure mso-highlight: lime style is directly injected into style attributes of mark and span elements
      htmlContent = htmlContent
        .replace(/<mark([^>]*)>/gi, (match, p1) => {
          if (!/mso-highlight/i.test(p1)) {
            return `<mark${p1} style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; color: #000000; font-weight: normal;">`;
          }
          return match;
        })
        .replace(/<span([^>]*)>/gi, (match, p1) => {
          if (/background/i.test(p1) && !/mso-highlight/i.test(p1)) {
            return match.replace(/style=["']/, 'style="mso-highlight: lime; background-color: #00ff00; background: #00ff00; ');
          }
          return match;
        });
    }

    if (navigator.clipboard && window.ClipboardItem && htmlContent) {
      try {
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        navigator.clipboard.write([item]).then(() => {
          setMsg('কপি হয়েছে!');
          setTimeout(() => setMsg(''), 2000);
        }).catch(() => {
          fallbackDomCopy(el, plainText, setMsg);
        });
        return;
      } catch (e) {
        console.warn("ClipboardItem write failed, using fallback:", e);
      }
    }

    fallbackDomCopy(el, plainText, setMsg);
  };

  const copyText = (text: string, setMsg: (msg: string) => void) => {
    copyFormattedContent('', setMsg, text);
  };

  const copyUnicodeConverterText = (rawText: string, isBijoyInput: boolean, setMsg: (msg: string) => void) => {
    if (isBijoyInput) {
      const converted = rawText.split('\n').map(line => bijoyToUnicode(line)).join('\n');
      copyFormattedContent('converterResultBox', setMsg, converted);
    } else {
      copyFormattedContent('converterResultBox', setMsg, rawText);
    }
  };

  const copyBijoyText = (rawText: string, setMsg: (msg: string) => void) => {
    const lines = rawText.split('\n');
    const bijoyLines = lines.map(line => {
      const tokens = line.split(/(\s+)/);
      return tokens.map(token => {
        if (!token.trim()) return token;
        return isEnglishWord(token, customDict) ? token : unicodeToBijoy(token);
      }).join('');
    });
    copyFormattedContent('converterResultBox2', setMsg, bijoyLines.join('\n'));
  };

  const copyBijoyConverterText = (rawText: string, isBijoyInput: boolean, setMsg: (msg: string) => void) => {
    if (isBijoyInput) {
      copyFormattedContent('converterResultBox2', setMsg, rawText);
    } else {
      copyBijoyText(rawText, setMsg);
    }
  };

  const copyHtmlTable = (containerId: string, setMsg: (msg: string) => void) => {
    copyFormattedContent(containerId, setMsg);
  };

  const downloadWordDoc = async (htmlInnerContent: string, primaryFont: string, filename: string, setMsg: (m: string) => void, includeCorrectionHeader: boolean = false) => {
    let formattedHtml = htmlInnerContent || '';

    const topHeaderTitle = `<p align="center" style="text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 12px; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>arafat-3802-bangla-english-fixer</b></span></p>`;

    // If htmlInnerContent is raw text without HTML tags (<p>, <table>, <div>, etc.)
    if (!/<(?:p|table|div|tr|td)\b/i.test(formattedHtml)) {
      const lines = formattedHtml.split('\n');
      formattedHtml = lines.map(line => {
        if (!line.trim()) return '<p style="margin:0; padding:0; min-height:1.2em;">&nbsp;</p>';
        const isOptionLine = /^\s*[\(\（\[]?(?:[ক-ঘa-d1-4১-৪0-4])[\)\）\]\.\:]/i.test(line);
        const isCorrectOption = isOptionLine && (/[*✓✔√#]/.test(line) || line.includes('mso-highlight') || line.includes('background-color') || line.includes('<mark'));

        const lineContent = formatHtmlTextPiece(line, primaryFont === 'SutonnyMJ' ? 'SutonnyMJ' : 'SolaimanLipi', customDict);

        if (isCorrectOption) {
          return `<p style="margin:0; padding:0; line-height:1.25;"><span style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; font-weight: normal; padding: 1px 4px;"><mark style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; color: #000000; font-weight: normal;">${lineContent}</mark></span></p>`;
        }

        return `<p style="margin:0; padding:0; line-height:1.25;">${lineContent}</p>`;
      }).join('');
    } else {
      // Ensure all mark tags or highlighted elements get explicit inline mso-highlight: lime
      formattedHtml = formattedHtml.replace(/<mark([^>]*)>/gi, (match, p1) => {
        if (!/mso-highlight/i.test(p1)) {
          return `<span style="background-color: #00ff00; background: #00ff00; mso-highlight: lime;"><mark${p1} style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; color: #000000; font-weight: normal;">`;
        }
        return match;
      }).replace(/<\/mark>/gi, '</mark></span>');

      formattedHtml = formattedHtml.replace(/<span([^>]*)>/gi, (match, p1) => {
        if (/background/i.test(p1) && !/mso-highlight/i.test(p1)) {
          return match.replace(/style=["']/, 'style="mso-highlight: lime; background-color: #00ff00; background: #00ff00; ');
        }
        return match;
      });
    }

    let leadingHeaderHtml = '';
    let bodyTablesHtml = formattedHtml;

    if (includeCorrectionHeader) {
      const firstTableIdx = formattedHtml.search(/<table\b/i);
      if (firstTableIdx !== -1) {
        leadingHeaderHtml = formattedHtml.substring(0, firstTableIdx).trim();
        bodyTablesHtml = formattedHtml.substring(firstTableIdx);
      } else {
        leadingHeaderHtml = formattedHtml.trim();
        bodyTablesHtml = '';
      }

      // Remove any arafat-3802-bangla-english-fixer paragraph from leadingHeaderHtml if present
      leadingHeaderHtml = leadingHeaderHtml.replace(/<p[^>]*>[\s\S]*?arafat-3802-bangla-english-fixer[\s\S]*?<\/p>/gi, '');

      // Remove any existing VAP-KHA lines from leadingHeaderHtml to prevent duplication
      leadingHeaderHtml = leadingHeaderHtml.replace(/<p[^>]*>[\s\S]*?VAP-KHA_[\s\S]*?<\/p>/gi, '');

      if (leadingHeaderHtml) {
        leadingHeaderHtml = leadingHeaderHtml.replace(/font-weight:\s*bold;?/gi, 'font-weight: normal;').replace(/<b>/gi, '').replace(/<\/b>/gi, '');
        if (!/<p\b/i.test(leadingHeaderHtml)) {
          leadingHeaderHtml = `<p align="left" style="text-align: left; font-weight: normal; font-size: 10pt; margin-top: 2px; margin-bottom: 4px; line-height: 1.2;">${leadingHeaderHtml}</p>`;
        } else {
          leadingHeaderHtml = leadingHeaderHtml.replace(/<p\b([^>]*)>/gi, (match, p1) => {
            if (!/text-align/i.test(p1) && !/align=/i.test(p1)) {
              return `<p align="left" style="text-align: left; font-weight: normal; margin-top: 2px; margin-bottom: 2px; line-height: 1.2;" ${p1}>`;
            }
            return match.replace(/text-align:\s*center/gi, 'text-align: left').replace(/align="center"/gi, 'align="left"').replace(/font-weight:\s*bold/gi, 'font-weight: normal');
          });
        }
      }

      formattedHtml = bodyTablesHtml;
    } else {
      if (!formattedHtml.includes('arafat-3802-bangla-english-fixer')) {
        formattedHtml = topHeaderTitle + formattedHtml;
      }
    }

    const defaultThreeLinesHtml = `
      <p align="center" style="text-align: center; font-weight: bold; font-size: 10pt; margin-top: 2px; margin-bottom: 2px; line-height: 1.2; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>VAP-KHA_(2026)_2nd Time_(Offline)_Ban/Eng/GK_MCQ_Daily_Exam-0_Set-A</b></span></p>
      <p align="center" style="text-align: center; font-weight: bold; font-size: 10pt; margin-top: 2px; margin-bottom: 2px; line-height: 1.2; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>VAP-KHA_(2026)_2nd Time_(Online_Live)_Ban/Eng/GK_MCQ_Daily_Exam-0_Set-B</b></span></p>
      <p align="center" style="text-align: center; font-weight: bold; font-size: 10pt; margin-top: 2px; margin-bottom: 4px; line-height: 1.2; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>VAP-KHA_(2026)_2nd Time_(Online_Practice)_Ban/Eng/GK_MCQ_Daily_Exam-0_Set-C</b></span></p>
    `;

    const headerBlockHtml = includeCorrectionHeader ? `
      <div style="mso-element:first-header" id="fh1">
        <p class="MsoHeader" style="margin: 0; padding: 0; margin-bottom: 4px; font-family: 'Times New Roman', serif !important; font-size: 11pt; line-height: 1.15; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>Correction By Name: ...........................................</b></span></p>
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 6px; font-family: 'Times New Roman', serif !important; font-size: 11pt; line-height: 1.15;">
          <tr style="border: none;">
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Syllabus Check</b></span></td>
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Solution adds (At least 60%) &amp; answer check</b></span></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Proofreading, Shadow &amp; Answer Check</b></span></td>
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Solution Check</b></span></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Repeat Check</b></span></td>
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Parallel Ensure (Set-A+B)</b></span></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Quality Ensure</b></span></td>
            <td style="border: none; padding: 1px 0; width: 50%; vertical-align: top; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important;"><b>❏ Correction Check</b></span></td>
          </tr>
        </table>
        <p align="center" style="text-align: center; font-weight: bold; font-size: 11pt; margin-top: 4px; margin-bottom: 4px; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important;"><b>arafat-3802-bangla-english-fixer</b></span></p>
        ${defaultThreeLinesHtml}
        ${leadingHeaderHtml}
      </div>
      <div style="mso-element:header" id="h1">
        <p class="MsoHeader">&nbsp;</p>
      </div>
    ` : '';

    const pageStyle = includeCorrectionHeader ? `
      @page { size: 210.0mm 297.0mm; margin: 0.5in 0.5in 0.5in 0.5in; mso-header-margin: 0.2in; mso-footer-margin: 0.2in; mso-paper-source: 0; }
      @page Section1 { size: 210.0mm 297.0mm; margin: 0.5in 0.5in 0.5in 0.5in; mso-header-margin: 0.2in; mso-footer-margin: 0.2in; mso-header: h1; mso-first-header: fh1; mso-title-page: yes; mso-paper-source: 0; }
      div.Section1 { page: Section1; }
      p.MsoHeader { margin: 0; padding: 0; font-family: 'Times New Roman', serif !important; font-size: 10pt; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; }
    ` : `
      @page { size: 210.0mm 297.0mm; margin: 0.5in 0.5in 0.5in 0.5in; mso-header-margin: 0.2in; mso-footer-margin: 0.2in; mso-paper-source: 0; }
      @page Section1 { size: 210.0mm 297.0mm; margin: 0.5in 0.5in 0.5in 0.5in; mso-header-margin: 0.2in; mso-footer-margin: 0.2in; mso-paper-source: 0; }
      div.Section1 { page: Section1; }
    `;

    const htmlContent = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>@font-face { font-family: 'SolaimanLipi'; src: local('SolaimanLipi'), local('Solaiman Lipi'); } ${pageStyle} body, p, span, td, div { font-family: 'Times New Roman', '${primaryFont}', 'SolaimanLipi', 'Solaiman Lipi', sans-serif; mso-ascii-font-family: 'Times New Roman'; mso-hansi-font-family: 'Times New Roman'; mso-bidi-font-family: '${primaryFont}'; mso-cs-font-family: '${primaryFont}'; font-size: 10pt; line-height: 1.15; text-align: left; }p { margin: 0; padding: 0; margin-bottom: 2px; line-height: 1.25; text-align: left; }table { border-collapse: collapse; border: 1px solid #000; width: 100%; margin-bottom: 10px; }tr { height: 16px; }td { border: 1px solid #000; padding: 2px 6px; vertical-align: middle; text-align: left; }.eng-text, .eng-text * { font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important; }.ben-text, .ben-text * { font-family: '${primaryFont}', 'SolaimanLipi', 'Solaiman Lipi', 'Times New Roman', sans-serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: '${primaryFont}' !important; mso-cs-font-family: '${primaryFont}' !important; }mark, span[style*="mso-highlight"], span[style*="background"] { background-color: #00ff00 !important; background: #00ff00 !important; mso-highlight: lime !important; color: #000000 !important; font-weight: normal !important; }</style></head><body><div class="Section1">${headerBlockHtml}${formattedHtml}</div></body></html>`;

    let blob: Blob;
    if (window.htmlDocx) {
      blob = window.htmlDocx.asBlob(htmlContent, {
        orientation: 'portrait',
        margins: {
          top: 720,
          bottom: 720,
          left: 720,
          right: 720,
          header: 288,
          footer: 288,
          gutter: 0
        }
      });

      // Patch generated DOCX ZIP file so that <w:pgSz> in word/document.xml uses exact A4 twips, fonts use explicit complex script (w:cs) SolaimanLipi and ASCII Times New Roman, and table cells have left alignment (<w:jc w:val="left"/>)
      try {
        const zip = await JSZip.loadAsync(blob);
        const targetFont = primaryFont || 'SolaimanLipi';

        // 1. Patch word/document.xml
        let docXml = await zip.file("word/document.xml")?.async("string");
        if (docXml) {
          docXml = docXml.replace(/<w:pgSz\b[^>]*\/>/g, '<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>');

          // Ensure all table cell paragraphs explicitly have left alignment
          docXml = docXml.replace(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/gi, (tcXml) => {
            return tcXml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/gi, (pXml) => {
              if (/<w:pPr(?:\s[^>]*)?>/i.test(pXml)) {
                if (/<w:jc\b[^>]*\/>/i.test(pXml)) {
                  return pXml.replace(/<w:jc\b[^>]*\/>/i, '<w:jc w:val="left"/>');
                } else {
                  return pXml.replace(/(<w:pPr(?:\s[^>]*)?>)/i, '$1<w:jc w:val="left"/>');
                }
              } else {
                return pXml.replace(/(<w:p(?:\s[^>]*)?>)/i, '$1<w:pPr><w:jc w:val="left"/></w:pPr>');
              }
            });
          });

          docXml = docXml.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/gi, (rXml) => {
            let textContent = "";
            rXml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi, (_, tText) => {
              textContent += tText;
              return "";
            });

            const hasBengali = /[\u0980-\u09FF]/.test(textContent);
            const isPureEnglish = /^[a-zA-Z0-9\s\.,\-\(\)\[\]:;'"\/\#\%\&\*\+\=\@\_\$\!\?\<\>\|\\~`^]+$/.test(textContent);

            let fontTag = "";
            if (targetFont === 'SutonnyMJ') {
              if (isPureEnglish && !hasBengali && !rXml.includes('SutonnyMJ')) {
                fontTag = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>`;
              } else {
                fontTag = `<w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ" w:eastAsia="SutonnyMJ"/>`;
              }
            } else {
              fontTag = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SolaimanLipi" w:eastAsia="Times New Roman"/>`;
            }

            if (/<w:rPr(?:\s[^>]*)?>/i.test(rXml)) {
              if (/<w:rFonts\b[^>]*\/>/i.test(rXml)) {
                return rXml.replace(/<w:rFonts\b[^>]*\/>/i, fontTag);
              } else {
                return rXml.replace(/(<w:rPr(?:\s[^>]*)?>)/i, `$1${fontTag}`);
              }
            } else {
              return rXml.replace(/(<w:r(?:\s[^>]*)?>)/i, `$1<w:rPr>${fontTag}</w:rPr>`);
            }
          });

          zip.file("word/document.xml", docXml);
        }

        // 2. Patch word/styles.xml
        let stylesXml = await zip.file("word/styles.xml")?.async("string");
        if (stylesXml) {
          const fontTag = targetFont === 'SutonnyMJ' 
            ? `<w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ" w:eastAsia="SutonnyMJ"/>`
            : `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SolaimanLipi" w:eastAsia="Times New Roman"/>`;
          stylesXml = stylesXml.replace(/<w:rFonts\b[^>]*\/>/g, fontTag);

          // Ensure default paragraph styles have left alignment
          if (/<w:style\b[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<\/w:style>/i.test(stylesXml)) {
            stylesXml = stylesXml.replace(/(<w:style\b[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<w:pPr>)/i, (match) => {
              if (!match.includes('<w:jc')) {
                return `${match}<w:jc w:val="left"/>`;
              }
              return match.replace(/<w:jc\b[^>]*\/>/i, '<w:jc w:val="left"/>');
            });
          }

          zip.file("word/styles.xml", stylesXml);
        }

        // 3. Patch word/fontTable.xml
        let fontTableXml = await zip.file("word/fontTable.xml")?.async("string");
        if (fontTableXml) {
          if (!fontTableXml.includes("SolaimanLipi")) {
            const fontDecl = `<w:font w:name="SolaimanLipi"><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font><w:font w:name="Solaiman Lipi"><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font></w:fonts>`;
            fontTableXml = fontTableXml.replace(/<\/w:fonts>/i, fontDecl);
            zip.file("word/fontTable.xml", fontTableXml);
          }
        }

        blob = await zip.generateAsync({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
      } catch (e) {
        console.error("Error patching docx ZIP file:", e);
      }
    } else {
      blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'arafat-3802-bangla-english-fixer.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setMsg('ডাউনলোড সম্পন্ন!');
    setTimeout(() => setMsg(''), 2000);
  };

  /* ================= PDF PREVIEW RENDER ================= */
  const renderPdfPage = async (doc: any, pageNum: number) => {
    if (!doc || !pdfCanvasRef.current) return;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
      }
    } catch (e) {
      console.error('Error rendering PDF page:', e);
    }
  };

  const handleQcPdfUpload = async (file: File) => {
    setQcFileStatus('PDF ফাইল লোড হচ্ছে...');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setQcFileName(baseName + '.docx');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setPdfTotalPages(doc.numPages);
      setPdfPageNum(1);
      setQcFileStatus(`সফলভাবে লোড হয়েছে! মোট পেজ: ${doc.numPages}`);
      renderPdfPage(doc, 1);
    } catch (e) {
      setQcFileStatus('PDF লোড করতে সমস্যা হয়েছে!');
    }
  };

  const collectQuestionsFromPdf = async () => {
    if (!pdfDoc) {
      alert('প্রথমে একটি PDF ফাইল আপলোড করুন!');
      return;
    }
    if (!qcInputText.trim()) {
      alert('অনুগ্রহ করে পেজ নাম্বার ও প্রশ্ন নাম্বার লিখুন!');
      return;
    }

    setIsCollecting(true);
    setQcStatusMsg('প্রশ্ন সংগ্রহ শুরু হচ্ছে...');
    setQcResultText('');

    // Cache page text in memory so multiple questions on the same page do not trigger repeated OCR requests
    const pageTextCache = new Map<number, string>();
    const allCollectedList: string[] = [];
    let totalCollectedCount = 0;

    // Helper: Parse a single reference line into page number and target question numbers
    const parseReferenceLine = (rawLine: string, fallbackPage: number) => {
      let line = rawLine.trim();
      if (!line) return { pageNum: fallbackPage, qNums: [] as number[] };

      // Strip leading list item prefixes (e.g. "২। ", "১. ", "5 - ", "• ", "(১) ", "৬) ", "1/ ")
      let working = line.replace(/^(?:[০-৯\d]{1,3}\s*[\।\.\)\-\:\/]\s*|[\(\（\[][০-৯\d]{1,3}[\)\）\]]\s*|[\-\•\*]\s*)/i, '').trim();
      if (!working) working = line;

      let pageNum = fallbackPage;
      let qNums: number[] = [];

      // Match page number: e.g. P-293, P.293, P 293, Page 293, Page-293, পৃষ্ঠা: ২৯৩, পৃষ্ঠা ২৯৩, পৃ. ২৯৩, পৃ ২৯৩, 293 পেজ, 293 পৃষ্ঠা
      let pageMatch = working.match(/(?:পৃষ্ঠা|Page|P[\.]?|পৃ[\.]?|পেজ)\s*[:\-\s]?\s*([০-৯\d]+)/i) ||
                      working.match(/([০-৯\d]+)\s*(?:পৃষ্ঠা|পেজ|page|p\b)/i) ||
                      line.match(/(?:পৃষ্ঠা|Page|P[\.]?|পৃ[\.]?|পেজ)\s*[:\-\s]?\s*([০-৯\d]+)/i);

      if (pageMatch) {
        let pVal = parseInt(convertToEnglishDigits(pageMatch[1]), 10);
        if (!isNaN(pVal) && pVal > 0) {
          pageNum = pVal;
        }
      }

      // Match question segment: e.g. Q-47, Q47, Q: 47, Q 47, Question: 47, প্রশ্ন: ৪৭, প্রঃ ৪৭, ৪৭ নং প্রশ্ন, বা ১১
      let qKeywordMatch = working.match(/(?:প্রশ্ন|Q[\.]?|Question|প্রঃ|প্রশ্নো?)\s*[:\-\s]?\s*([\s\S]+)/i) ||
                          line.match(/(?:প্রশ্ন|Q[\.]?|Question|প্রঃ|প্রশ্নো?)\s*[:\-\s]?\s*([\s\S]+)/i);

      let qSegment = "";
      if (qKeywordMatch) {
        qSegment = qKeywordMatch[1];
      } else if (pageMatch) {
        let pIdx = working.indexOf(pageMatch[0]);
        if (pIdx !== -1) {
          qSegment = working.substring(pIdx + pageMatch[0].length);
        }
      } else {
        // Pure numbers like "293 47" or "293, 47"
        let allNums = working.match(/[০-৯\d]+/g) || line.match(/[০-৯\d]+/g) || [];
        if (allNums.length >= 2) {
          pageNum = parseInt(convertToEnglishDigits(allNums[0]), 10) || fallbackPage;
          qSegment = allNums.slice(1).join(', ');
        } else if (allNums.length === 1) {
          qSegment = allNums[0];
        }
      }

      if (qSegment) {
        let cleanedQSeg = qSegment.replace(/\bবা\b/g, ',').replace(/\bএবং\b/g, ',').replace(/\bথেকে\b/g, '-');
        let engSegment = convertToEnglishDigits(cleanedQSeg);

        // Support ranges like 4-8 or 47-50 or 47 to 50
        let rangeMatches = engSegment.matchAll(/(\d+)\s*[\-\–\—\to]+\s*(\d+)/g);
        for (let rm of rangeMatches) {
          let start = parseInt(rm[1], 10);
          let end = parseInt(rm[2], 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let r = Math.min(start, end); r <= Math.max(start, end); r++) {
              if (!qNums.includes(r)) qNums.push(r);
            }
          }
        }
        // Individual digits
        let digitMatches = engSegment.match(/\d+/g) || [];
        digitMatches.forEach(dStr => {
          let qVal = parseInt(dStr, 10);
          if (!isNaN(qVal) && !qNums.includes(qVal)) {
            qNums.push(qVal);
          }
        });
      }

      return { pageNum, qNums };
    };

    try {
      let lines = qcInputText.split('\n').map(l => l.trim()).filter(Boolean);
      let lastRenderedPage = 1;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex];
        let { pageNum: targetPageNum, qNums: targetQNums } = parseReferenceLine(line, lastRenderedPage);

        if (targetPageNum > pdfDoc.numPages || targetPageNum < 1) targetPageNum = 1;
        lastRenderedPage = targetPageNum;

        // Update PDF page and preview canvas in real time
        setPdfPageNum(targetPageNum);
        await renderPdfPage(pdfDoc, targetPageNum);

        const qNumsDisplay = targetQNums.length > 0 ? `প্রশ্ন ${targetQNums.join(', ')}` : 'সকল প্রশ্ন';
        setQcStatusMsg(`রেফারেন্স (${lineIndex + 1}/${lines.length}) প্রসেস হচ্ছে: পেজ ${targetPageNum}, ${qNumsDisplay}...`);

        let pageText = pageTextCache.get(targetPageNum) || "";

        if (!pageText) {
          let page = await pdfDoc.getPage(targetPageNum);

          // First attempt: High-Precision OCR via Gemini (when online) to ensure 100% clean Bengali text
          if (navigator.onLine) {
            try {
              const renderViewport = page.getViewport({ scale: 2.0 });
              const offscreenCanvas = document.createElement('canvas');
              offscreenCanvas.width = renderViewport.width;
              offscreenCanvas.height = renderViewport.height;
              const ctx = offscreenCanvas.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
                const dataUrl = offscreenCanvas.toDataURL('image/png');
                const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

                const ocrRes = await fetch('/api/ocr', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageBase64: base64Data, mimeType: 'image/png' })
                });
                const contentType = ocrRes.headers.get('content-type') || '';

                if (ocrRes.ok && contentType.includes('application/json')) {
                  const ocrData = await ocrRes.json();
                  if (ocrData && ocrData.text && ocrData.text.trim()) {
                    pageText = ocrData.text.trim();
                  }
                }
              }
            } catch (ocrErr) {
              console.warn("High-precision OCR skipped/failed, using pdf.js textContent:", ocrErr);
            }
          }

          // Secondary fallback: Local pdf.js text extraction
          if (!pageText.trim()) {
            try {
              let textContent = await page.getTextContent();
              const viewport = page.getViewport({ scale: 1.0 });
              const midX = viewport.width / 2;

              let items = textContent.items.map((item: any) => ({
                str: item.str || "",
                x: item.transform ? item.transform[4] : 0,
                y: item.transform ? item.transform[5] : 0
              }));

              const extractLinesFromItems = (itemList: any[]): string[] => {
                itemList.sort((a, b) => {
                  if (Math.abs(a.y - b.y) > 4) return b.y - a.y;
                  return a.x - b.x;
                });

                let lineList: string[] = [];
                let currStr = "";
                let lastY: number | null = null;

                for (let it of itemList) {
                  if (!it.str) continue;
                  if (lastY === null) {
                    currStr = it.str;
                    lastY = it.y;
                  } else if (Math.abs(it.y - lastY) > 4) {
                    if (currStr.trim()) lineList.push(currStr.trim());
                    currStr = it.str;
                    lastY = it.y;
                  } else {
                    if (currStr && !currStr.endsWith(' ') && !it.str.startsWith(' ')) {
                      currStr += ' ';
                    }
                    currStr += it.str;
                  }
                }
                if (currStr.trim()) lineList.push(currStr.trim());
                return lineList;
              };

              let leftItems = items.filter((it: any) => it.x < midX - 5);
              let rightItems = items.filter((it: any) => it.x >= midX - 5);

              if (leftItems.length > 5 && rightItems.length > 5) {
                let leftLines = extractLinesFromItems(leftItems);
                let rightLines = extractLinesFromItems(rightItems);
                pageText = leftLines.join('\n') + '\n' + rightLines.join('\n');
              } else {
                let allLines = extractLinesFromItems(items);
                pageText = allLines.join('\n');
              }

              if (pageText && (isBijoyText(pageText) || /[‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏ×Ø™¢ÙÜßáäå¤§©®¯°±³µ¶º»]/.test(pageText))) {
                pageText = bijoyToUnicode(pageText);
              }
            } catch (pdfJsErr) {
              console.warn("pdf.js local text extraction error:", pdfJsErr);
            }
          }

          if (pageText) {
            pageTextCache.set(targetPageNum, pageText);
          }
        }

        let parsedBlocks = parseQuestions(pageText);
        let lineMatchedQuestions: string[] = [];

        parsedBlocks.forEach((block, blockIdx) => {
          let cleanBlockNum = convertToEnglishDigits(block.questionNumber || '');
          let blockNumInt = parseInt(cleanBlockNum, 10);
          if (isNaN(blockNumInt)) {
            blockNumInt = blockIdx + 1;
          }

          let isMatched = false;
          if (targetQNums.length === 0) {
            isMatched = true; // If no specific question numbers requested, include all on page
          } else {
            isMatched = targetQNums.includes(blockNumInt) || targetQNums.some(num => {
              let numStr = String(num);
              let padStr = num < 10 ? '0' + num : numStr;
              return cleanBlockNum === numStr || cleanBlockNum === padStr;
            });
          }

          if (isMatched) {
            totalCollectedCount++;
            let refLineHeader = line ? `${line}\n` : '';
            let qOut = `${refLineHeader}` + block.questionText + (block.reference ? ` [${block.reference}]` : '') + '\n';
            block.options.forEach((opt, optIdx) => {
              if (opt) {
                let isCorrect = block.hasTickMark && block.correctAnswerIndex === optIdx;
                qOut += `${opt}${isCorrect ? '*' : ''}\n`;
              }
            });
            if (block.explanation) {
              let expText = block.explanation.trim();
              if (!/^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer)[\:\-\s]/i.test(expText)) {
                expText = `ব্যাখ্যা: ${expText}`;
              }
              qOut += `${expText}\n`;
            }

            lineMatchedQuestions.push(qOut.trim());
          }
        });

        // PROGRESSIVE OUTPUT: Append newly collected questions sequentially in real-time
        if (lineMatchedQuestions.length > 0) {
          for (let matchedQ of lineMatchedQuestions) {
            allCollectedList.push(matchedQ);
            const currentCombinedOutput = allCollectedList.join('\n\n');
            setQcResultText(currentCombinedOutput);

            // Auto-scroll output box so user sees latest question streaming in
            setTimeout(() => {
              const box = document.getElementById('qcResultBox');
              if (box) box.scrollTop = box.scrollHeight;
            }, 40);

            // Yield briefly to ensure immediate DOM update
            await new Promise(r => setTimeout(r, 120));
          }
        }
      }

      if (allCollectedList.length === 0) {
        setQcResultText('নির্দিষ্ট প্রশ্ন পাওয়া যায়নি। দয়া করে সঠিক পেজ ও প্রশ্ন নাম্বার লিখুন।');
        setQcStatusMsg('প্রশ্ন পাওয়া যায়নি!');
      } else {
        const finalOutput = allCollectedList.join('\n\n');
        setQcResultText(finalOutput);
        setQcStatusMsg(`মোট ${totalCollectedCount}টি প্রশ্ন সফলভাবে সংগ্রহ করা হয়েছে!`);
      }
    } catch (err) {
      console.error(err);
      setQcStatusMsg('প্রশ্ন সংগ্রহে সমস্যা হয়েছে!');
    } finally {
      setIsCollecting(false);
    }
  };

  const translateAndFormatVersion = async (rawText: string): Promise<string> => {
    if (!rawText || !rawText.trim()) return "";
    
    // Check if questions are present in original text using version parser
    const blocksOriginal = parseVersionQuestions(rawText);

    if (blocksOriginal.length > 0) {
      // Format blocks into structured text for translation to ensure exact block alignment
      const structuredPromptText = formatBlocksToStructuredText(blocksOriginal);
      
      let translatedEng = "";
      try {
        translatedEng = await translateBengaliToEnglish(structuredPromptText);
      } catch (err) {
        console.warn("Structured block translation failed, falling back to raw text:", err);
      }

      if (!translatedEng || !translatedEng.trim()) {
        translatedEng = await translateBengaliToEnglish(rawText);
      }

      // Generate 8-box Version table HTML format (Bengali in Column 1, English in Column 2)
      return generateVersionFormattedTableHtml(
        rawText,
        translatedEng,
        'SolaimanLipi',
        subjectCode,
        customDict
      );
    }

    const translatedEng = await translateBengaliToEnglish(rawText);
    return translatedEng;
  };

  const handleTranslateVersionText = async (text: string) => {
    if (!text.trim()) {
      setVersionResultText('');
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translateAndFormatVersion(text);
      setVersionResultText(result);
    } catch (err) {
      setVersionResultText(localRuleBasedTranslate(text));
    } finally {
      setIsTranslating(false);
    }
  };

  /* ================= VERSION DOCX HANDLER ================= */
  const handleVersionFileSelect = async (file: File) => {
    setVersionFileName(file.name);
    setVersionFileStatus('docx ফাইল প্রসেসিং ও অনুবাদ হচ্ছে...');
    try {
      if (window.mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        let docxText = "";
        try {
          const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
          if (htmlResult && htmlResult.value) {
            const extracted = extractTextWithHighlightsFromHtml(htmlResult.value);
            if (extracted.text.trim()) {
              docxText = extracted.text;
            }
          }
        } catch (err) {
          console.warn("Mammoth convertToHtml failed:", err);
        }
        if (!docxText.trim()) {
          const result = await window.mammoth.extractRawText({ arrayBuffer });
          docxText = result.value;
        }

        const translated = await translateAndFormatVersion(docxText);
        setVersionFileResultText(translated);
        setVersionFileStatus('সফলভাবে অনুবাদ ও লোড করা হয়েছে!');
      }
    } catch (e) {
      setVersionFileStatus('ফাইল পড়তে সমস্যা হয়েছে!');
    }
  };

  // Processed outputs
  const converterFormattedRaw = formatConverterTextOutput(inputText1);
  const isBijoyInputActive = isBijoyText(inputText1);
  const unicodeInputText1 = isBijoyInputActive 
    ? inputText1.split('\n').map(line => bijoyToUnicode(line)).join('\n')
    : inputText1;
  const converterSolaimanTableHtml = generateFormattedTableHtml(unicodeInputText1, 'SolaimanLipi', 'Ban', customDict);
  const converterSutonnyTableHtml = generateFormattedTableHtml(unicodeInputText1, 'SutonnyMJ', 'Ban', customDict);
  
  const formatterSolaimanTableHtml = generateFormattedTableHtml(inputText2, 'SolaimanLipi', subjectCode, customDict);
  const formatterSutonnyTableHtml = generateFormattedTableHtml(inputText2, 'SutonnyMJ', subjectCode, customDict);

  const formatterRightSolaimanTableHtml = generateFormattedTableHtml(inputTextRight, 'SolaimanLipi', subjectCodeRight, customDict, true);
  const formatterRightSutonnyTableHtml = generateFormattedTableHtml(inputTextRight, 'SutonnyMJ', subjectCodeRight, customDict, true);

  return (
    <div className="max-w-[950px] mx-auto p-4 md:p-6 bg-white rounded-xl shadow-md my-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="bg-gray-100 border-2 border-gray-300 px-3 py-1.5 rounded-md font-mono font-bold text-xs md:text-sm text-gray-800 shadow-inner">
          arafat-3802-bangla-english-fixer
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border-2 border-emerald-500 px-3 py-1.5 rounded-md font-bold text-xs md:text-sm text-emerald-700">
            <a
              href="https://chat.whatsapp.com/HesUQJ58rXtGE94O4qWFP9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors"
            >
              <i className="fa-brands fa-whatsapp text-lg text-emerald-600"></i> WhatsApp Group
            </a>
          </div>
          <QuickLinksMenu />
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-center text-slate-800 mb-1">Bangla English Fixer</h1>
      <div className="text-center text-gray-600 text-sm mb-6">প্রশ্নপত্র ফরম্যাট ও টেবিল কনভার্টার</div>

      {/* Tabs Nav */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6 border-b-2 border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab('converter')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'converter'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          কনভার্টার
        </button>
        <button
          onClick={() => setActiveTab('formatter')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'formatter'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Text Box Formatter
        </button>
        <button
          onClick={() => setActiveTab('right-formatter')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'right-formatter'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Text Right Formatter
        </button>
        <button
          onClick={() => setActiveTab('question-collect')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'question-collect'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Question Collect
        </button>
        <button
          onClick={() => setActiveTab('version')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'version'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          version
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Chat
        </button>
      </div>

      {/* ================= TAB: CHAT ================= */}
      {activeTab === 'chat' && (
        <ChatTab />
      )}



      {/* ================= TAB 1: CONVERTER ================= */}
      {activeTab === 'converter' && (
        <div>
          {/* Description Block */}
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-md text-sm text-gray-700 leading-relaxed">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h1 className="text-xl font-bold">নির্ভুল বিজয় ও ইউনিকোড কনভার্টার (Accurate Bijoy & Unicode Converter)</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                <i className="fa-solid fa-wifi-slash text-xs text-emerald-600"></i>
                অফলাইনে সম্পূর্ণ কার্যকরী (Offline Ready)
              </span>
            </div>
            <p>
              বাংলায় বই প্রকাশনার ক্ষেত্রে বাংলাদেশে যেমন ANSII-ভিত্তিক বিজয় (Bijoy) ফন্টের ব্যবহার এখনও সর্বাধিক প্রচলিত, তেমনই অনলাইনে বাংলা লেখালেখির জন্য বর্তমানে ইউনিকোড (Unicode) ভিত্তিক বাংলা ফন্টের বিকল্প ভাবা যায় না। তাই যারা বাংলায় লেখালেখি করেন, নানা প্রয়োজনে তাদের বাংলা লেখাটি ইউনিকোড থেকে বিজয়ে কিংবা বিজয় থেকে ইউনিকোডে রূপান্তর করতেই হয়। নিচের ফরমটি ব্যবহার করে যেকোনো লেখা আপনি সহজেই ইউনিকোড টু বিজয় (Bijoy to Unicode) কিংবা বিজয় টু ইউনিকোডে (Unicode to Bijoy) কনভার্ট করতে পারবেন। এই কনভার্টারটি সম্পূর্ণ ইন্টারনেট ছাড়াই (অফলাইনে) অত্যন্ত দ্রুত ও নির্ভুলভাবে কাজ করে।
            </p>
          </div>

          {/* Success Note Banner (Moved from Font Converter) */}
          <div className="mb-6 space-y-6">
            <div className="py-2 px-3 border border-emerald-500 bg-emerald-50/30 rounded text-emerald-700 text-sm md:text-base font-semibold text-center">
              SutonnyMJ ও SolaimanLipi ফন্টের ওয়ার্ড ফাইল ও টেক্সট নির্ভুলভাবে কনভার্ট করুণ:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Unicode to Bijoy DOCX */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">SolaimanLipi ওয়ার্ড ফাইল কনভার্ট করুন <br /> (Unicode to Bijoy)</h2>
                  <button
                    onClick={handleClearConverter}
                    className="px-3 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    মুছে ফেলুন
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />

                {isConverting && (
                  <div className="mt-4 p-2 text-center text-xs text-gray-600 bg-gray-50 rounded border border-gray-200">
                    কনভার্ট হচ্ছে...
                  </div>
                )}

                {!isConverting && converterPreviewText && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mt-2">
                      {converterFileUrl && (
                        <a
                          href={converterFileUrl}
                          download={converterFileName}
                          className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-4 rounded transition flex items-center gap-1 shadow"
                        >
                          <i className="fa-solid fa-download"></i>
                          ডাউনলোড
                        </a>
                      )}
                      {copySuccess && <span className="text-green-700 font-bold text-[10px]">✓ কপি হয়েছে!</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Bijoy to Unicode DOCX */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">SutonnyMJ ওয়ার্ড ফাইল কনভার্ট করুন <br /> (Bijoy to Unicode)</h2>
                  <button
                    onClick={handleB2uClearConverter}
                    className="px-3 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    মুছে ফেলুন
                  </button>
                </div>
                <input
                  ref={b2uFileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleB2uFileUpload(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />

                {isB2uConverting && (
                  <div className="mt-4 p-2 text-center text-xs text-gray-600 bg-gray-50 rounded border border-gray-200">
                    কনভার্ট হচ্ছে...
                  </div>
                )}

                {!isB2uConverting && b2uPreviewText && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mt-2">
                      {b2uFileUrl && (
                        <a
                          href={b2uFileUrl}
                          download={b2uFileName}
                          className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-4 rounded transition flex items-center gap-1 shadow"
                        >
                          <i className="fa-solid fa-download"></i>
                          ডাউনলোড
                        </a>
                      )}
                      {b2uCopySuccess && <span className="text-green-700 font-bold text-[10px]">✓ কপি হয়েছে!</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 mb-1">
            <label className="font-bold text-sm text-gray-800">
              মূল টেক্সট পেস্ট করুন অথবা টাইপ করুন:
            </label>
            <button
              onClick={() => setInputText1('')}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition"
            >
              সব মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-xl bg-white p-3 mt-2 shadow-sm">
            <textarea
              value={inputText1}
              onChange={(e) => setInputText1(e.target.value)}
              onPaste={(e) => handleTextAreaPaste(e, inputText1, setInputText1, 'inputText1')}
              className="w-full h-24 border-none outline-none resize-none text-base bg-transparent font-solaiman"
              placeholder="এখানে প্রশ্নপত্র বা অ্যাসাইনমেন্টের টেক্সট পেস্ট করুন..."
            />
            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-gray-600 hover:text-blue-600 text-lg" title="ছবি/ফাইল আপলোড করুন">
                  <i className="fa-regular fa-image"></i>
                  <input
                    type="file"
                    accept="image/*, .pdf, .docx"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && processFiles(e.target.files, 'inputText1')}
                  />
                </label>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('converterResultBox');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition text-xs cursor-pointer"
                title="প্রসেস ও প্রিভিউ দেখুন"
              >
                <i className="fa-solid fa-arrow-up"></i>
              </button>
            </div>
          </div>

          {statusMsg1 && (
            <div className="mt-1 text-xs font-bold text-emerald-600 text-center">{statusMsg1}</div>
          )}

          <hr className="my-6 border-dashed border-gray-300" />

          {/* Converter Output 1 */}
          <div className="mt-4">
            <label className="font-bold text-sm text-red-700 block mb-1">
              ১. SolaimanLipi ও Times New Roman ফন্ট আউটপুট (ইউনিকোড):
            </label>
            <div id="converterResultBox" className="dual-preview-box max-h-[600px]">
              {renderFormattedSpans(converterFormattedRaw, 'SolaimanLipi', isBijoyInputActive)}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-3">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="কপি করুন"
                onClick={() => copyUnicodeConverterText(converterFormattedRaw, isBijoyInputActive, setActionMsg1)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('converterResultBox');
                  downloadWordDoc(el?.innerHTML || converterFormattedRaw, 'SolaimanLipi', uploadedFileName1 || 'converted-solaiman.docx', setActionMsg1);
                }}
              ></i>
              {actionMsg1 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsg1}</span>}
            </div>
          </div>

          {/* Converter Output 2 */}
          <div className="mt-4">
            <label className="font-bold text-sm text-sky-700 block mb-1">
              ২. SutonnyMJ ফন্ট আউটপুট (SutonnyMJ & Times New Roman / বিজয়):
            </label>
            <div id="converterResultBox2" className="dual-preview-box max-h-[600px]">
              {renderFormattedSpans(converterFormattedRaw, 'SutonnyMJ', isBijoyInputActive)}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-6">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="কপি করুন"
                onClick={() => copyBijoyConverterText(converterFormattedRaw, isBijoyInputActive, setActionMsg2)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('converterResultBox2');
                  downloadWordDoc(el?.innerHTML || converterFormattedRaw, 'SutonnyMJ', uploadedFileName1 || 'converted-sutonny.docx', setActionMsg2);
                }}
              ></i>
              {actionMsg2 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsg2}</span>}
            </div>
          </div>



          {/* Custom Dictionary Section */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mt-6">
            <div className="text-sm font-bold text-slate-800 mb-2">
              অতিরিক্ত ইংরেজি শব্দ যোগ করুন (কমা বা স্পেস দিয়ে আলাদা করুন):
            </div>
            <textarea
              value={customDict}
              onChange={(e) => setCustomDict(e.target.value)}
              className="h-16 w-full border border-gray-300 rounded p-2 text-base font-solaiman"
              placeholder="যেমন: environment, pollution..."
            />
            <button
              onClick={saveCustomDictionary}
              className="bg-emerald-600 text-white border-none px-4 py-2 rounded font-bold text-xs mt-2 hover:bg-emerald-700 transition"
            >
              সংরক্ষণ করুন
            </button>
            <div className="text-xs text-gray-600 mt-1.5">{dictMsg || 'এই শব্দগুলো ব্রাউজারে সংরক্ষিত থাকবে।'}</div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TEXT BOX FORMATTER ================= */}
      {activeTab === 'formatter' && (
        <div>
          {/* Selection boxes */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSubjectCode('Ban')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCode === 'Ban'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Bangla
            </button>
            <button
              onClick={() => setSubjectCode('Eng')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCode === 'Eng'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSubjectCode('GK')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCode === 'GK'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              GK
            </button>
          </div>

          <div className="flex justify-between items-center mt-3 mb-1">
            <label className="font-bold text-sm text-gray-800">
              মূল টেক্সট পেস্ট করুন অথবা টাইপ করুন (সঠিক উত্তরের পাশে টিক ✓, √ বা * দিন):
            </label>
            <button
              onClick={() => setInputText2('')}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition"
            >
              সব মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-xl bg-white p-3 mt-2 shadow-sm">
            <textarea
              value={inputText2}
              onChange={(e) => setInputText2(e.target.value)}
              onPaste={(e) => handleTextAreaPaste(e, inputText2, setInputText2, 'inputText2')}
              className="w-full h-24 border-none outline-none resize-none text-base bg-transparent font-solaiman"
              placeholder="এখানে প্রশ্নপত্র বা অ্যাসাইনমেন্টের টেক্সট পেস্ট করুন..."
            />
            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-gray-600 hover:text-blue-600 text-lg" title="ছবি/ফাইল আপলোড করুন">
                  <i className="fa-regular fa-image"></i>
                  <input
                    type="file"
                    accept="image/*, .pdf, .docx"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && processFiles(e.target.files, 'inputText2')}
                  />
                </label>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('tableBox1Result');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition text-xs cursor-pointer"
                title="প্রসেস ও প্রিভিউ দেখুন"
              >
                <i className="fa-solid fa-arrow-up"></i>
              </button>
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div className="mt-5 text-center">
            <div className="text-red-700 text-base font-bold mb-3">ফাইলের (ছবি, PDF, Word) মাধ্যমে টাইপ</div>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-5">
              <div className="text-xs font-bold text-gray-700 text-left mb-2">
                📁 ছবি (সর্বোচ্চ ৫টি), PDF অথবা Word Document (.docx) সিলেক্ট করুন বা পেস্ট করুন:
              </div>
              <label className="block border-2 border-dashed border-sky-500 rounded-md p-5 bg-white cursor-pointer hover:bg-slate-50 transition text-blue-700 font-bold text-sm">
                এখানে ক্লিক করে ফাইল সিলেক্ট করুন অথবা Ctrl+V চাপুন
                <input
                  type="file"
                  accept="image/*, .pdf, .docx"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && processFiles(e.target.files, 'inputText2')}
                />
              </label>
            </div>
          </div>

          {statusMsg2 && (
            <div className="mt-1 text-xs font-bold text-emerald-600 text-center">{statusMsg2}</div>
          )}

          <hr className="my-6 border-dashed border-gray-300" />

          {/* Table Output 1: SolaimanLipi */}
          <div className="mt-4">
            <label className="font-bold text-sm text-red-700 block mb-1">
              ১. SolaimanLipi ফন্ট টেবিল আউটপুট (৮টি বক্স ফরম্যাট):
            </label>
            <div
              id="tableBox1Result"
              className="dual-preview-box max-h-[600px]"
              contentEditable
              dangerouslySetInnerHTML={{ __html: formatterSolaimanTableHtml }}
            />
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-3">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="টেবিল কপি করুন"
                onClick={() => copyHtmlTable('tableBox1Result', setActionMsgT1)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('tableBox1Result');
                  downloadWordDoc(el?.innerHTML || formatterSolaimanTableHtml, 'SolaimanLipi', uploadedFileName2 || 'solaiman-table.docx', setActionMsgT1, true);
                }}
              ></i>
              {actionMsgT1 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsgT1}</span>}
            </div>
          </div>

          {/* Table Output 2: SutonnyMJ */}
          <div className="mt-4">
            <label className="font-bold text-sm text-sky-700 block mb-1">
              ২. SutonnyMJ ফন্ট টেবিল আউটপুট (৮টি বক্স ফরম্যাট):
            </label>
            <div
              id="tableBox2Result"
              className="dual-preview-box max-h-[600px]"
              contentEditable
              dangerouslySetInnerHTML={{ __html: formatterSutonnyTableHtml }}
            />
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-2">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="টেবিল কপি করুন"
                onClick={() => copyHtmlTable('tableBox2Result', setActionMsgT2)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('tableBox2Result');
                  downloadWordDoc(el?.innerHTML || formatterSutonnyTableHtml, 'SutonnyMJ', uploadedFileName2 || 'sutonny-table.docx', setActionMsgT2, true);
                }}
              ></i>
              {actionMsgT2 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsgT2}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2.5: TEXT RIGHT FORMATTER ================= */}
      {activeTab === 'right-formatter' && (
        <div>
          {/* Selection boxes */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSubjectCodeRight('Ban')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCodeRight === 'Ban'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Bangla
            </button>
            <button
              onClick={() => setSubjectCodeRight('Eng')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCodeRight === 'Eng'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSubjectCodeRight('GK')}
              className={`px-4 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                subjectCodeRight === 'GK'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              GK
            </button>
          </div>

          <div className="flex justify-between items-center mt-3 mb-1">
            <label className="font-bold text-sm text-gray-800">
              মূল টেক্সট পেস্ট করুন অথবা টাইপ করুন (সঠিক উত্তরের পাশে টিক ✓, √ বা * দিন):
            </label>
            <button
              onClick={() => setInputTextRight('')}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition"
            >
              সব মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-xl bg-white p-3 mt-2 shadow-sm">
            <textarea
              value={inputTextRight}
              onChange={(e) => setInputTextRight(e.target.value)}
              onPaste={(e) => handleTextAreaPaste(e, inputTextRight, setInputTextRight, 'inputTextRight')}
              className="w-full h-24 border-none outline-none resize-none text-base bg-transparent font-solaiman"
              placeholder="এখানে প্রশ্নপত্র বা অ্যাসাইনমেন্টের টেক্সট পেস্ট করুন..."
            />
            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-gray-600 hover:text-blue-600 text-lg" title="ছবি/ফাইল আপলোড করুন">
                  <i className="fa-regular fa-image"></i>
                  <input
                    type="file"
                    accept="image/*, .pdf, .docx"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && processFiles(e.target.files, 'inputTextRight')}
                  />
                </label>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('tableRightBox1Result');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition text-xs cursor-pointer"
                title="প্রসেস ও প্রিভিউ দেখুন"
              >
                <i className="fa-solid fa-arrow-up"></i>
              </button>
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div className="mt-5 text-center">
            <div className="text-red-700 text-base font-bold mb-3">ফাইলের (ছবি, PDF, Word) মাধ্যমে টাইপ</div>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-5">
              <div className="text-xs font-bold text-gray-700 text-left mb-2">
                📁 ছবি (সর্বোচ্চ ৫টি), PDF অথবা Word Document (.docx) সিলেক্ট করুন বা পেস্ট করুন:
              </div>
              <label className="block border-2 border-dashed border-sky-500 rounded-md p-5 bg-white cursor-pointer hover:bg-slate-50 transition text-blue-700 font-bold text-sm">
                এখানে ক্লিক করে ফাইল সিলেক্ট করুন অথবা Ctrl+V চাপুন
                <input
                  type="file"
                  accept="image/*, .pdf, .docx"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && processFiles(e.target.files, 'inputTextRight')}
                />
              </label>
            </div>
          </div>

          {statusMsgRight && (
            <div className="mt-1 text-xs font-bold text-emerald-600 text-center">{statusMsgRight}</div>
          )}

          <hr className="my-6 border-dashed border-gray-300" />

          {/* Table Output 1: SolaimanLipi */}
          <div className="mt-4">
            <label className="font-bold text-sm text-red-700 block mb-1">
              ১. SolaimanLipi ফন্ট টেবিল আউটপুট (৮টি বক্স ফরম্যাট - ডানের বক্সে আউটপুট):
            </label>
            <div
              id="tableRightBox1Result"
              className="dual-preview-box max-h-[600px]"
              contentEditable
              dangerouslySetInnerHTML={{ __html: formatterRightSolaimanTableHtml }}
            />
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-3">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="টেবিল কপি করুন"
                onClick={() => copyHtmlTable('tableRightBox1Result', setActionMsgTR1)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('tableRightBox1Result');
                  downloadWordDoc(el?.innerHTML || formatterRightSolaimanTableHtml, 'SolaimanLipi', uploadedFileNameRight || 'solaiman-table-right.docx', setActionMsgTR1, true);
                }}
              ></i>
              {actionMsgTR1 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsgTR1}</span>}
            </div>
          </div>

          {/* Table Output 2: SutonnyMJ */}
          <div className="mt-4">
            <label className="font-bold text-sm text-sky-700 block mb-1">
              ২. SutonnyMJ ফন্ট টেবিল আউটপুট (৮টি বক্স ফরম্যাট - ডানের বক্সে আউটপুট):
            </label>
            <div
              id="tableRightBox2Result"
              className="dual-preview-box max-h-[600px]"
              contentEditable
              dangerouslySetInnerHTML={{ __html: formatterRightSutonnyTableHtml }}
            />
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-2">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="টেবিল কপি করুন"
                onClick={() => copyHtmlTable('tableRightBox2Result', setActionMsgTR2)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('tableRightBox2Result');
                  downloadWordDoc(el?.innerHTML || formatterRightSutonnyTableHtml, 'SutonnyMJ', uploadedFileNameRight || 'sutonny-table-right.docx', setActionMsgTR2, true);
                }}
              ></i>
              {actionMsgTR2 && <span className="text-xs font-bold text-emerald-600 ml-1">{actionMsgTR2}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: QUESTION COLLECT ================= */}
      {activeTab === 'question-collect' && (
        <div>
          <div className="border border-sky-400 bg-sky-50 text-sky-800 p-3 rounded text-xs mb-4">
            <strong className="block mb-1 text-sm text-sky-900">নিয়মাবলী:</strong>
            <ol className="list-decimal list-inside space-y-1">
              <li>প্রথমে এখানে আমাদের একটা বইয়ের PDF বা ফাইল আপলোড করুন।</li>
              <li>তারপর সেখানে বইয়ের ভেতর পেজ নাম্বার ও প্রশ্ন নাম্বার লিখুন। যেমন: পৃষ্ঠা: ০৩, প্রশ্ন: ০৫ বা ১১</li>
              <li>এই অনুযায়ী সিস্টেম স্বয়ংক্রিয়ভাবে নির্দিষ্ট প্রশ্নটি কালেক্ট করে দেবে এবং নিচে PDF-এর প্রিভিউ দেখাবে।</li>
            </ol>
          </div>

          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-sm text-gray-800">বইয়ের PDF বা ডকুমেন্ট আপলোড করুন:</label>
            <button
              onClick={() => {
                setPdfDoc(null);
                setQcFileStatus('');
                setPdfTotalPages(0);
                setPdfPageNum(1);
              }}
              className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold hover:bg-red-700"
            >
              মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg p-2 bg-white mb-2">
            <input
              type="file"
              accept=".pdf"
              className="w-full text-sm text-gray-700"
              onChange={(e) => e.target.files && e.target.files[0] && handleQcPdfUpload(e.target.files[0])}
            />
          </div>
          {qcFileStatus && <div className="text-xs text-emerald-600 font-bold mb-4">{qcFileStatus}</div>}

          <div className="flex justify-between items-center mt-4 mb-1">
            <label className="font-bold text-sm text-gray-800">পেজ নাম্বার ও প্রশ্ন নাম্বার লিখুন:</label>
            <button
              onClick={() => {
                setQcInputText('');
                setQcResultText('');
                setQcStatusMsg('');
              }}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700"
            >
              সব মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg p-2 bg-white mb-4">
            <textarea
              value={qcInputText}
              onChange={(e) => setQcInputText(e.target.value)}
              className="w-full h-20 border-none outline-none resize-none text-base font-solaiman"
              placeholder="যেমন: পৃষ্ঠা: ১০, প্রশ্ন: ০৪ বা ৪..."
            />
          </div>

          <button
            onClick={collectQuestionsFromPdf}
            className="bg-emerald-600 text-white w-full py-3 rounded font-bold text-base hover:bg-emerald-700 transition mb-6 shadow"
          >
            প্রশ্ন সংগ্রহ করুন (Collect Questions)
          </button>

          {/* Output Box */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
              <label className="font-bold text-sm text-red-700">সংগৃহীত প্রশ্ন আউটপুট:</label>
              {(isCollecting || qcStatusMsg) && (
                <div className="bg-emerald-50 border border-emerald-400 text-emerald-700 text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                  {isCollecting && <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>}
                  <span>{qcStatusMsg || 'প্রশ্ন সংগৃহীত হচ্ছে...'}</span>
                </div>
              )}
            </div>
            <div id="qcResultBox" className="dual-preview-box">
              {renderFormattedSpans(qcResultText, 'SolaimanLipi')}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-4">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="কপি করুন"
                onClick={() => copyFormattedContent('qcResultBox', setMsgQc, qcResultText)}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('qcResultBox');
                  downloadWordDoc(el?.innerHTML || qcResultText, 'SolaimanLipi', qcFileName || 'collected-questions.docx', setMsgQc);
                }}
              ></i>
              {msgQc && <span className="text-xs font-bold text-emerald-600 ml-1">{msgQc}</span>}
            </div>
          </div>

          {/* PDF Viewer Canvas */}
          <div>
            <label className="font-bold text-sm text-gray-800 block mb-1">PDF প্রিভিউ (পৃষ্ঠা অনুযায়ী):</label>
            <div className="border border-gray-300 rounded bg-slate-900 overflow-hidden">
              <div className="flex justify-between items-center bg-slate-800 p-2 text-white text-xs">
                <button
                  onClick={() => {
                    if (pdfDoc && pdfPageNum > 1) {
                      const prev = pdfPageNum - 1;
                      setPdfPageNum(prev);
                      renderPdfPage(pdfDoc, prev);
                    }
                  }}
                  className="bg-slate-700 hover:bg-sky-600 px-2.5 py-1 rounded"
                >
                  <i className="fa-solid fa-chevron-left mr-1"></i> পূর্ববর্তী পৃষ্ঠা
                </button>
                <div className="flex items-center gap-1">
                  <span>পেজ:</span>
                  <input
                    type="text"
                    value={pdfPageNum}
                    onChange={(e) => {
                      const val = parseInt(convertToEnglishDigits(e.target.value));
                      if (!isNaN(val) && val >= 1 && val <= pdfTotalPages) {
                        setPdfPageNum(val);
                        renderPdfPage(pdfDoc, val);
                      }
                    }}
                    className="w-14 px-1 py-0.5 border border-slate-600 rounded text-center text-black font-bold"
                  />
                  <span>/ {pdfTotalPages}</span>
                </div>
                <button
                  onClick={() => {
                    if (pdfDoc && pdfPageNum < pdfTotalPages) {
                      const next = pdfPageNum + 1;
                      setPdfPageNum(next);
                      renderPdfPage(pdfDoc, next);
                    }
                  }}
                  className="bg-slate-700 hover:bg-sky-600 px-2.5 py-1 rounded"
                >
                  পরবর্তী পৃষ্ঠা <i className="fa-solid fa-chevron-right ml-1"></i>
                </button>
              </div>

              <div className="p-4 flex justify-center min-h-[300px]">
                {pdfDoc ? (
                  <canvas ref={pdfCanvasRef} className="max-w-full shadow-lg rounded" />
                ) : (
                  <p className="text-gray-400 text-center mt-24 text-sm">
                    কোনো PDF ফাইল সিলেক্ট করা হয়নি বা প্রিভিউ উপলব্ধ নেই।
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: VERSION ================= */}
      {activeTab === 'version' && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-sm text-gray-800">১. বাংলা লেখা পেস্ট করুন:</label>
            <button
              onClick={() => {
                setInputVersionText('');
                setVersionResultText('');
              }}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700"
            >
              সব মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg p-2 bg-white mb-2">
            <textarea
              value={inputVersionText}
              onChange={(e) => {
                const val = e.target.value;
                setInputVersionText(val);
                setVersionResultText(localRuleBasedTranslate(val));

                if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
                if (val.trim()) {
                  translateTimerRef.current = setTimeout(async () => {
                    setIsTranslating(true);
                    try {
                      const res = await translateBengaliToEnglish(val);
                      if (res) setVersionResultText(res);
                    } catch (err) {
                      // fallback stays
                    } finally {
                      setIsTranslating(false);
                    }
                  }, 600);
                }
              }}
              className="w-full h-28 border-none outline-none resize-none text-base font-solaiman"
              placeholder="এখানে বাংলা প্রশ্ন বা টেক্সট পেস্ট করুন..."
            />
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => handleTranslateVersionText(inputVersionText)}
              disabled={isTranslating || !inputVersionText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-md shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> অনুবাদ হচ্ছে...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-language"></i> ইংরেজি ভার্সনে রূপান্তর করুন (Translate)
                </>
              )}
            </button>
          </div>

          <div className="mb-4">
            <label className="font-bold text-sm text-red-700 block mb-1">ইংরেজি Translate আউটপুট:</label>
            <div id="versionResultBox1" className="dual-preview-box max-h-[600px] overflow-auto">
              {versionResultText.trim().startsWith('<') ? (
                <div dangerouslySetInnerHTML={{ __html: versionResultText }} />
              ) : (
                renderFormattedSpans(versionResultText, 'SolaimanLipi')
              )}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-6">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="কপি করুন"
                onClick={() => {
                  if (versionResultText.trim().startsWith('<')) {
                    copyHtmlTable('versionResultBox1', setMsgVer1);
                  } else {
                    copyFormattedContent('versionResultBox1', setMsgVer1, versionResultText);
                  }
                }}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('versionResultBox1');
                  downloadWordDoc(el?.innerHTML || versionResultText, 'SolaimanLipi', 'version-translated.docx', setMsgVer1);
                }}
              ></i>
              {msgVer1 && <span className="text-xs font-bold text-emerald-600 ml-1">{msgVer1}</span>}
            </div>
          </div>

          <div className="bg-emerald-600 text-white p-2.5 rounded font-bold text-center text-sm mb-4">
            সরাসরি .docx ফাইল থেকে Version
          </div>

          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-sm text-gray-800">২. আপনার .docx ফাইল আপলোড করুন:</label>
            <button
              onClick={() => {
                setVersionFileName('No file chosen');
                setVersionFileStatus('');
                setVersionFileResultText('');
              }}
              className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold hover:bg-red-700"
            >
              মুছে ফেলুন
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg p-2 bg-white mb-2">
            <input
              type="file"
              accept=".docx"
              className="w-full text-sm text-gray-700"
              onChange={(e) => e.target.files && e.target.files[0] && handleVersionFileSelect(e.target.files[0])}
            />
          </div>
          {versionFileStatus && <div className="text-xs font-bold text-emerald-600 mb-4">{versionFileStatus}</div>}

          <div>
            <label className="font-bold text-sm text-gray-800 block mb-1">প্রিভিউ দেখুন এবং কপি বা ডাউনলোড করুন:</label>
            <div id="versionFileResultBox" className="dual-preview-box max-h-[600px] overflow-auto">
              {versionFileResultText.trim().startsWith('<') ? (
                <div dangerouslySetInnerHTML={{ __html: versionFileResultText }} />
              ) : (
                renderFormattedSpans(versionFileResultText, 'SolaimanLipi')
              )}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-4">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title="কপি করুন"
                onClick={() => {
                  if (versionFileResultText.trim().startsWith('<')) {
                    copyHtmlTable('versionFileResultBox', setMsgVer2);
                  } else {
                    copyFormattedContent('versionFileResultBox', setMsgVer2, versionFileResultText);
                  }
                }}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title="ডাউনলোড করুন"
                onClick={() => {
                  const el = document.getElementById('versionFileResultBox');
                  const dName = (versionFileName && versionFileName !== 'No file chosen') ? versionFileName : 'version-file-translated.docx';
                  downloadWordDoc(el?.innerHTML || versionFileResultText, 'SolaimanLipi', dName, setMsgVer2);
                }}
              ></i>
              {msgVer2 && <span className="text-xs font-bold text-emerald-600 ml-1">{msgVer2}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
