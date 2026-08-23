/**
 * Text Box Formatter & Converter Application
 * Author: arafat-3802-bangla-english-fixer
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  convertToEnglishDigits,
  isEnglishWord,
  isEnglishOrCodeToken,
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
  formatBlocksToStructuredText,
  cleanExplanationText,
  formatMathEquations
} from './utils/parser';
import { translateBengaliToEnglish, localRuleBasedTranslate } from './utils/translate';
import { ChatTab } from './components/ChatTab';
import { WcrTab } from './components/WcrTab';
import { PdfToolsTab } from './components/PdfToolsTab';
import { NewspaperTab } from './components/NewspaperTab';
import { ImportantWebTab } from './components/ImportantWebTab';
import { ErrorCheckerTab } from './components/ErrorCheckerTab';
import { DqTab } from './components/DqTab';
import { QuickLinksMenu } from './components/QuickLinksMenu';
import { BookHistoryModal } from './components/BookHistoryModal';
import { AuthorProfileModal } from './components/AuthorProfileModal';
import { MathToolbar, QuickMathBar } from './components/MathToolbar';
import { prepareHtmlForDocxWithMath, patchDocxXmlWithOmml } from './utils/mathOmml';
import { convertHtmlToNativeDocxBlob } from './utils/docxExportBuilder';
import {
  HistoryBook,
  saveHistoryBook,
  getAllHistoryBooks,
  updateHistoryBookTag
} from './utils/bookHistoryDB';

declare global {
  interface Window {
    Tesseract?: any;
    pdfjsLib?: any;
    mammoth?: any;
    htmlDocx?: any;
  }
}

export interface QcBook {
  id: string;
  name: string;
  shortTag: string;
  totalPages: number;
  doc: any;
  arrayBuffer: ArrayBuffer;
  isSelected: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'important-web' | 'formatter' | 'right-formatter' | 'question-collect' | 'version' | 'chat' | 'wcr' | 'pdf-tools' | 'newspaper' | 'error-checker' | 'dq'>('converter');
  const [subjectCode, setSubjectCode] = useState<string>('Ban');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [numMode, setNumMode] = useState<'file' | 'auto' | 'custom'>('file');
  const [customStartNum, setCustomStartNum] = useState<number>(1);

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

  const mergeAdjacentRuns = (containerXml: string): string => {
    return containerXml.replace(/(<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>)(?:\s*(<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>))+/gi, (match) => {
      const runMatches = match.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/gi);
      if (!runMatches || runMatches.length <= 1) return match;

      const mergedRuns: string[] = [];
      let currentRPr = "";
      let currentTexts: string[] = [];

      const flush = () => {
        if (currentTexts.length > 0) {
          const combinedText = currentTexts.join("");
          if (currentRPr) {
            mergedRuns.push(`<w:r>${currentRPr}<w:t xml:space="preserve">${combinedText}</w:t></w:r>`);
          } else {
            mergedRuns.push(`<w:r><w:t xml:space="preserve">${combinedText}</w:t></w:r>`);
          }
          currentTexts = [];
          currentRPr = "";
        }
      };

      for (const rXml of runMatches) {
        const rPrMatch = rXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/i);
        const rPr = rPrMatch ? rPrMatch[0] : "";
        
        let tContent = "";
        rXml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi, (_, t) => {
          tContent += t;
          return "";
        });

        if (rPr === currentRPr) {
          currentTexts.push(tContent);
        } else {
          flush();
          currentRPr = rPr;
          currentTexts.push(tContent);
        }
      }
      flush();

      return mergedRuns.join("");
    });
  };

  const processDocxXmlContentClient = (xmlContent: string): string => {
    // Process paragraph by paragraph (<w:p>) or table cell to retain Bengali context for punctuation runs (like "?")
    const processRunList = (containerXml: string, containerHasBengali: boolean): string => {
      const normalizedContainer = mergeAdjacentRuns(containerXml);
      let prevRunWasBengali = false;

      return normalizedContainer.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
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
        const isPurePunctuationOrSymbol = /^[\s\p{P}\p{S}]+$/u.test(runFullText) || /^[\s!?.:;,\-–—()[\]{}'"/<>=\+*#@%^&]+$/.test(runFullText);
        const isEnglishLetterRun = /[a-zA-Z]/.test(runFullText);

        const shouldConvertToBijoy = hasBengali || (isPurePunctuationOrSymbol && (prevRunWasBengali || containerHasBengali) && !isEnglishLetterRun);

        if (!shouldConvertToBijoy) {
          if (isEnglishLetterRun) {
            prevRunWasBengali = false;
          }
          return rXml;
        }

        if (hasBengali) {
          prevRunWasBengali = true;
        }

        // Convert full text with context-preserving logic
        let convertedFullText = "";
        if (!isEnglishLetterRun) {
          convertedFullText = unicodeToBijoy(runFullText);
        } else {
          const tokens = runFullText.split(/(\s+)/);
          convertedFullText = tokens.map(token => {
            if (!token.trim()) return token;
            if (isEnglishWord(token)) return token;
            if (/[\u0980-\u09FF]/.test(token) && /[a-zA-Z]/.test(token)) {
              let subParts = token.split(/([a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+)/);
              return subParts.map(part => {
                if (!part) return "";
                if (isEnglishWord(part) || /^[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+$/.test(part)) return part;
                return unicodeToBijoy(part);
              }).join('');
            }
            if (/[\u0980-\u09FF]/.test(token)) {
              return unicodeToBijoy(token);
            }
            return token;
          }).join('');
        }

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

    if (/<w:p(?:\s[^>]*)?>/i.test(xmlContent)) {
      return xmlContent.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (pXml) => {
        const textContent = pXml.replace(/<[^>]+>/g, ' ').toLowerCase();
        if (
          textContent.includes('syllabus check') ||
          textContent.includes('solution check') ||
          textContent.includes('repeat check') ||
          textContent.includes('parallel ensure') ||
          textContent.includes('quality ensure') ||
          textContent.includes('correction by name') ||
          textContent.includes('source') ||
          textContent.includes('vap') ||
          textContent.includes('online_live') ||
          textContent.includes('2nd time')
        ) {
          return pXml;
        }
        const paragraphHasBengali = /[\u0964\u0965\u0980-\u09FF]/.test(pXml);
        return processRunList(pXml, paragraphHasBengali);
      });
    }

    return processRunList(xmlContent, /[\u0964\u0965\u0980-\u09FF]/.test(xmlContent));
  };

  const processDocxXmlContentToUnicodeClient = (xmlContent: string): string => {
    const processRunList = (containerXml: string, containerIsBijoy: boolean): string => {
      const normalizedContainer = mergeAdjacentRuns(containerXml);
      let prevRunWasBijoy = false;

      return normalizedContainer.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
        // 1. Extract all text from this run
        let runFullText = "";
        
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
          return "";
        });

        if (!runFullText) return rXml;

        const fontIsBijoy = isBijoyFont(baseRPr);
        const fontIsEnglish = /times new roman|calibri|arial|helvetica|segoe ui|verdana|courier new|georgia/i.test(baseRPr);
        const hasExtendedAscii = /[^\x00-\x7F]/.test(runFullText);
        const hasBijoyMarkers = /[†ˆ‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏØ™¢ÙÜßáäå¤¶º»¿ÀÇÈÍÐÑÒÓÔÕÖÚÛÝÞàâãæçèéêëìíîïðñòóôõö÷øùúûüýþÿ\`~_^&|]/.test(runFullText);
        const hasExistingUnicodeBangla = /[\u0980-\u09FF]/.test(runFullText);

        if (hasExistingUnicodeBangla && !hasBijoyMarkers) {
          prevRunWasBijoy = false;
          return rXml;
        }

        if (fontIsEnglish && !hasBijoyMarkers && !fontIsBijoy) {
          prevRunWasBijoy = false;
          return rXml;
        }

        const isEnglishCode = isEnglishOrCodeToken(runFullText);
        const shouldConvert = !isEnglishCode && (fontIsBijoy || hasExtendedAscii || hasBijoyMarkers || containerIsBijoy || prevRunWasBijoy);

        if (!shouldConvert) {
          prevRunWasBijoy = false;
          return rXml;
        }

        prevRunWasBijoy = true;

        // Convert full text at once to preserve context for re-arrangement
        const convertedFullText = bijoyToUnicode(runFullText);
        const newRPr = getUpdatedRPr('SolaimanLipi');
        
        let updatedR = rXml;
        if (baseRPr) {
          updatedR = updatedR.replace(baseRPr, newRPr);
        } else {
          updatedR = updatedR.replace(/(<w:r(?:\s[^>]*)?>)/i, `$1${newRPr}`);
        }

        // Put the converted text into the FIRST <w:t> and clear the rest
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

    if (/<w:p(?:\s[^>]*)?>/i.test(xmlContent)) {
      return xmlContent.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (pXml) => {
        const textContent = pXml.replace(/<[^>]+>/g, ' ').toLowerCase();
        if (
          textContent.includes('syllabus check') ||
          textContent.includes('solution check') ||
          textContent.includes('repeat check') ||
          textContent.includes('parallel ensure') ||
          textContent.includes('quality ensure') ||
          textContent.includes('correction by name') ||
          textContent.includes('source') ||
          textContent.includes('vap') ||
          textContent.includes('online_live') ||
          textContent.includes('2nd time')
        ) {
          return pXml;
        }
        const paragraphIsBijoy = isBijoyFont(pXml) || /[†ˆ‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏØ™¢ÙÜßáäå¤¶º»¿ÀÇÈÍÐÑÒÓÔÕÖÚÛÝÞàâãæçèéêëìíîïðñòóôõö÷øùúûüýþÿ\`~_^&|]/.test(pXml);
        return processRunList(pXml, paragraphIsBijoy);
      });
    }

    return processRunList(xmlContent, isBijoyFont(xmlContent));
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

      // Convert Bengali text inside HTML text nodes to Bijoy, wrapping Bengali and question marks in bijoy-text span
      const convertedHtmlPreview = rawHtml.replace(/>([^<]+)</g, (_, textContent) => {
        return `>${formatHtmlTextPiece(textContent, 'SutonnyMJ', customDict)}<`;
      });

      // Plain text for clipboard copying
      const textResult = await window.mammoth.extractRawText({ arrayBuffer });
      const rawText = textResult.value || "";
      const convertedPlainText = rawText.split("\n").map((line: string) => {
        const tokens = line.split(/(\s+)/);
        return tokens.map((token: string) => {
          if (!token.trim()) return token;
          return isEnglishWord(token, customDict) ? token : unicodeToBijoy(token);
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
      let msg = error.message || 'Conversion failed';
      if (msg.includes("central directory") || msg.includes("zip") || msg.includes("Corrupted") || msg.includes("JSZip") || msg.includes("end of central")) {
        msg = "আপলোডকৃত ফাইলটি একটি বৈধ .docx (Word Document) ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত (Corrupted)। অনুগ্রহ করে সঠিক .docx ফাইল আপলোড করুন।";
      }
      alert(msg);
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
        return `>${formatHtmlTextPiece(textContent, 'SolaimanLipi', customDict)}<`;
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
      let msg = error.message || 'Conversion failed';
      if (msg.includes("central directory") || msg.includes("zip") || msg.includes("Corrupted") || msg.includes("JSZip") || msg.includes("end of central")) {
        msg = "আপলোডকৃত ফাইলটি একটি বৈধ .docx (Word Document) ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত (Corrupted)। অনুগ্রহ করে সঠিক .docx ফাইল আপলোড করুন।";
      }
      alert(msg);
    } finally {
      setIsB2uConverting(false);
    }
  };
  
  // Custom Dictionary State
  const [customDict, setCustomDict] = useState<string>('');
  const [dictMsg, setDictMsg] = useState<string>('');

  // Math Toolbar State & Textarea Refs
  const [isMathToolbarOpen, setIsMathToolbarOpen] = useState<boolean>(false);
  const inputText1Ref = useRef<HTMLTextAreaElement>(null);
  const inputText2Ref = useRef<HTMLTextAreaElement>(null);
  const inputTextRightRef = useRef<HTMLTextAreaElement>(null);
  const inputVersionTextRef = useRef<HTMLTextAreaElement>(null);

  // Tab 1: Converter State
  const [inputText1, setInputText1] = useState<string>('');
  const [uploadedFileName1, setUploadedFileName1] = useState<string>('');
  const [statusMsg1, setStatusMsg1] = useState<string>('');
  const [actionMsg1, setActionMsg1] = useState<string>('');
  const [actionMsg2, setActionMsg2] = useState<string>('');
  const [isDraggingCard1, setIsDraggingCard1] = useState<boolean>(false);
  const [isDraggingCard2, setIsDraggingCard2] = useState<boolean>(false);

  // Tab 2: Formatter State
  const [inputText2, setInputText2] = useState<string>('');
  const [uploadedFileName2, setUploadedFileName2] = useState<string>('');
  const [statusMsg2, setStatusMsg2] = useState<string>('');
  const [actionMsgT1, setActionMsgT1] = useState<string>('');
  const [actionMsgT2, setActionMsgT2] = useState<string>('');
  const [isDraggingTab2, setIsDraggingTab2] = useState<boolean>(false);

  // Tab 2.5: Text Right Formatter State
  const [subjectCodeRight, setSubjectCodeRight] = useState<string>('Ban');
  const [customSubjectRight, setCustomSubjectRight] = useState<string>('');
  const [numModeRight, setNumModeRight] = useState<'file' | 'auto' | 'custom'>('file');
  const [customStartNumRight, setCustomStartNumRight] = useState<number>(1);
  const [inputTextRight, setInputTextRight] = useState<string>('');
  const [uploadedFileNameRight, setUploadedFileNameRight] = useState<string>('');
  const [statusMsgRight, setStatusMsgRight] = useState<string>('');
  const [actionMsgTR1, setActionMsgTR1] = useState<string>('');
  const [actionMsgTR2, setActionMsgTR2] = useState<string>('');
  const [isDraggingTab2Right, setIsDraggingTab2Right] = useState<boolean>(false);

  // Tab 3: Question Collect State
  const [qcBooks, setQcBooks] = useState<QcBook[]>([]);
  const [activeQcBookId, setActiveQcBookId] = useState<string | null>(null);
  const [qcInputText, setQcInputText] = useState<string>('');
  const [qcFileName, setQcFileName] = useState<string>('');
  const [qcFileStatus, setQcFileStatus] = useState<string>('');
  const [qcResultText, setQcResultText] = useState<string>('');
  const [qcFontMode, setQcFontMode] = useState<'Combo' | 'SolaimanLipi' | 'SutonnyMJ'>('Combo');
  const [qcOptionPrefix, setQcOptionPrefix] = useState<'BAN' | 'ENG' | 'NO'>('NO');
  const [msgQc, setMsgQc] = useState<string>('');
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [qcStatusMsg, setQcStatusMsg] = useState<string>('');
  const [isDraggingQcPdf, setIsDraggingQcPdf] = useState<boolean>(false);
  const [isBookHistoryOpen, setIsBookHistoryOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qcFileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfRenderTaskRef = useRef<any>(null);

  // PDF Canvas Interactive Crop State
  const [isCropActive, setIsCropActive] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [cropActionMsg, setCropActionMsg] = useState<string>('');

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropActive || !pdfCanvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropBox({ startX: x, startY: y, endX: x, endY: y });
    setIsDraggingCrop(true);
    setCroppedDataUrl(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropActive || !isDraggingCrop || !cropBox) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCropBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
  };

  const handleCropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropActive || !isDraggingCrop || !cropBox || !pdfCanvasRef.current) return;
    setIsDraggingCrop(false);

    const w = Math.abs(cropBox.endX - cropBox.startX);
    const h = Math.abs(cropBox.endY - cropBox.startY);
    if (w < 10 || h < 10) {
      setCropBox(null);
      return;
    }

    const containerRect = e.currentTarget.getBoundingClientRect();
    const canvas = pdfCanvasRef.current;
    const scaleX = canvas.width / containerRect.width;
    const scaleY = canvas.height / containerRect.height;

    const realX = Math.min(cropBox.startX, cropBox.endX) * scaleX;
    const realY = Math.min(cropBox.startY, cropBox.endY) * scaleY;
    const realW = w * scaleX;
    const realH = h * scaleY;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = realW;
      offscreen.height = realH;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, realX, realY, realW, realH, 0, 0, realW, realH);
        const dataUrl = offscreen.toDataURL('image/png');
        setCroppedDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn("Error cropping figure from canvas:", err);
    }
  };

  const insertCroppedImageToResult = () => {
    if (!croppedDataUrl) return;
    const imgHtml = `<div style="text-align: center; margin: 8px 0;"><img src="${croppedDataUrl}" alt="Question Figure" style="max-width: 100%; max-height: 250px; display: inline-block; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" /></div>`;
    setQcResultText(prev => prev ? `${prev}\n${imgHtml}` : imgHtml);
    setCropActionMsg('আউটপুটে চিত্রটি যোগ করা হয়েছে!');
    setTimeout(() => setCropActionMsg(''), 2500);
  };

  const copyCroppedImageTag = () => {
    if (!croppedDataUrl) return;
    const imgHtml = `<img src="${croppedDataUrl}" alt="Figure" style="max-width: 100%; max-height: 250px; display: inline-block;" />`;
    navigator.clipboard.writeText(imgHtml);
    setCropActionMsg('HTML Tag কপি হয়েছে!');
    setTimeout(() => setCropActionMsg(''), 2500);
  };

  const downloadCroppedImage = () => {
    if (!croppedDataUrl) return;
    const link = document.createElement('a');
    link.href = croppedDataUrl;
    link.download = `pdf_page_${pdfPageNum}_figure.png`;
    link.click();
  };

  const refreshHistoryCount = async () => {
    try {
      const books = await getAllHistoryBooks();
      setHistoryCount(books.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshHistoryCount();
  }, []);

  const activeBook = qcBooks.find(b => b.id === activeQcBookId) || qcBooks[0] || null;
  const pdfDoc = activeBook?.doc || null;
  const pdfTotalPages = activeBook?.totalPages || 0;

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

          if (tag === 'br') {
            return '\n';
          }
          if (['p', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tag)) {
            const trimmed = childText.trimEnd();
            return trimmed ? trimmed + '\n' : '';
          }
          return childText;
        }
        return '';
      };

      let extractedText = processNode(doc.body);
      extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{2,}/g, '\n').trim();
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

    return cleanedLines.filter(l => l.trim()).join('\n');
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
    const rawLines = text.split('\n');
    const lines = rawLines.map(l => l.trim()).filter(Boolean);

    return lines.map((line, lIdx) => {
      const isQuestionHeading = /^\s*(?:\d+[\.\:\)]|[\u09E6-\u09EF]+[\.\:\)])/i.test(line);
      const isExplanationLine = /^\s*(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|সমাধান|বিবরণ)[\:\-\s]/i.test(line) || /^[\s]*[\=\⇒\∴\≠\≤\≥\√\π\∞\∠\∆\∑\∫]/.test(line);
      const isBookRefLine = /^\s*(?:\d+\.\s*)?(?:[A-Za-z0-9\s,\.\-_:\(\)\[\]\/]{2,60})\s*,\s*(?:Page|পৃষ্ঠা|page|p\.)/i.test(line);
      const hasHighlightIndicator = (/[*✓✔√#]\s*$/.test(line) || line.includes('mso-highlight') || line.includes('background-color') || line.includes('<mark')) && !/[a-zA-Z0-9\u0980-\u09FF]\s*\*\s*[a-zA-Z0-9\u0980-\u09FF]/.test(line);
      const isCorrectOption = hasHighlightIndicator && !isQuestionHeading && !isExplanationLine && !isBookRefLine;

      const formattedHtml = formatHtmlTextPiece(line, fontMode, customDict);

      if (isCorrectOption) {
        return (
          <p key={lIdx} style={{ margin: '1px 0', padding: 0, lineHeight: 1.25 }}>
            <span style={{ backgroundColor: '#00ff00', background: '#00ff00', msoHighlight: 'lime', color: '#000000', fontWeight: 'normal', padding: '1px 6px', borderRadius: '3px' } as any}>
              <mark style={{ backgroundColor: '#00ff00', background: '#00ff00', msoHighlight: 'lime', color: '#000000', fontWeight: 'normal' } as any} dangerouslySetInnerHTML={{ __html: formattedHtml }} />
            </span>
          </p>
        );
      }

      return (
        <p key={lIdx} style={{ margin: '1px 0', padding: 0, lineHeight: 1.25 }} dangerouslySetInnerHTML={{ __html: formattedHtml }} />
      );
    });
  };

  /* ================= QC OPTION PREFIX FORMATTER ================= */
  const applyQcOptionPrefixToText = (rawText: string, mode: 'BAN' | 'ENG' | 'NO'): string => {
    if (!rawText || !rawText.trim()) return rawText;

    const blocks = rawText.split(/\n{2,}/);
    const banPrefixes = ['(ক)', '(খ)', '(গ)', '(ঘ)'];
    const engPrefixes = ['(a)', '(b)', '(c)', '(d)'];

    const isRefHeaderLine = (line: string): boolean => {
      const t = line.trim();
      if (!t) return false;
      if (/^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|সমাধান|বিবরণ)[\:\-\s]/i.test(t)) return false;
      if (t.startsWith('<img')) return false;

      // e.g. "27. MQB page 137 q 08", "mqb p 138 q 25", "1. পেজ: ১০, প্রশ্ন: ৪", "Page 137, Q 08", "(Physics, Page 12)"
      const hasPageKeyword = /\b(?:page|পৃষ্ঠা|p\.|pg|p)\s*[\:\.\s]?\s*[\d\u09E6-\u09EF]+/i.test(t);
      const hasQKeyword = /\b(?:q|ques|question|প্রশ্ন)\s*[\:\.\s]?\s*[\d\u09E6-\u09EF]+/i.test(t);
      const hasBracketRef = /^\s*(?:\d+[\.\:\)]\s*)?\([A-Za-z0-9\u0980-\u09FF\s,\.\-_:\(\)\[\]\/]{2,60}\s*,\s*(?:Page|পৃষ্ঠা|page|p\.)/i.test(t);

      if (hasBracketRef) return true;
      if (hasPageKeyword && (hasQKeyword || /^\s*\d+[\.\:\)]/i.test(t) || /\b(?:mqb|tb|pb|biology|physics|chemistry|math|bangla|english|gk)\b/i.test(t))) {
        return true;
      }
      if (/^\s*(?:\d+[\.\:\)]\s*)?(?:[A-Za-z0-9\u0980-\u09FF\-_]+\s+)+(?:page|পৃষ্ঠা|p\.|pg)\s*[\d\u09E6-\u09EF]+/i.test(t)) {
        return true;
      }
      return false;
    };

    const processedBlocks = blocks.map(block => {
      const lines = block.split('\n');
      if (lines.length <= 1) return block;

      let questionLineIdx = -1;
      let explanationLineIdx = -1;

      // Check if first non-empty line is a reference header
      let firstNonEmptyIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          firstNonEmptyIdx = i;
          break;
        }
      }

      if (firstNonEmptyIdx !== -1 && isRefHeaderLine(lines[firstNonEmptyIdx])) {
        // Line firstNonEmptyIdx is reference header, the next non-empty line is question
        for (let i = firstNonEmptyIdx + 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            questionLineIdx = i;
            break;
          }
        }
      } else if (firstNonEmptyIdx !== -1) {
        // First line is question directly
        questionLineIdx = firstNonEmptyIdx;
      }

      // Find where explanation or images start
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const isExplanation = /^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|সমাধান|বিবরণ)[\:\-\s]/i.test(line);
        if (isExplanation && explanationLineIdx === -1) {
          explanationLineIdx = i;
          break;
        }
      }

      const optStart = questionLineIdx !== -1 ? questionLineIdx + 1 : 0;
      const optEnd = explanationLineIdx !== -1 ? explanationLineIdx : lines.length;

      let optCount = 0;
      const newLines = lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Ensure question line itself NEVER has option prefix (strip if accidentally added previously)
        if (idx === questionLineIdx) {
          return trimmed.replace(/^\s*[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i, '').trim();
        }

        // Option lines (starting from line after question)
        if (
          idx >= optStart &&
          idx < optEnd &&
          !isRefHeaderLine(trimmed) &&
          !trimmed.startsWith('<img') &&
          !/^(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|সমাধান|বিবরণ)[\:\-\s]/i.test(trimmed)
        ) {
          const cleanOpt = trimmed.replace(/^\s*[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i, '').trim();
          let prefix = '';
          if (mode === 'BAN') {
            prefix = (banPrefixes[optCount] || '') + ' ';
          } else if (mode === 'ENG') {
            prefix = (engPrefixes[optCount] || '') + ' ';
          } else {
            prefix = '';
          }
          optCount++;
          return `${prefix}${cleanOpt}`;
        }
        return line;
      });

      return newLines.join('\n');
    });

    return processedBlocks.join('\n\n');
  };

  const handleQcOptionPrefixChange = (newMode: 'BAN' | 'ENG' | 'NO') => {
    setQcOptionPrefix(newMode);
    if (qcResultText && qcResultText.trim()) {
      setQcResultText(prev => applyQcOptionPrefixToText(prev, newMode));
    }
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
    const cleanedText = rawText.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    if (isBijoyInput) {
      const converted = cleanedText.split('\n').map(line => bijoyToUnicode(line)).join('\n');
      copyFormattedContent('converterResultBox', setMsg, converted);
    } else {
      copyFormattedContent('converterResultBox', setMsg, cleanedText);
    }
  };

  const copyBijoyText = (rawText: string, setMsg: (msg: string) => void) => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
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

    const topHeaderTitle = `<p align="center" style="text-align: center; font-weight: bold; font-size: 10pt; margin-bottom: 12px; font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; mso-bidi-font-family: 'Times New Roman' !important;"><span class="eng-text" style="font-family: 'Times New Roman', serif !important; mso-ascii-font-family: 'Times New Roman' !important; mso-hansi-font-family: 'Times New Roman' !important; font-size: 10pt;"><b>VAP-KHA_(2026)_2nd Time_(Offline)_Ban/Eng/GK_MCQ_Daily/Weekly_Exam-0_Set-A</b></span></p>`;

    // If htmlInnerContent is raw text without HTML tags (<p>, <table>, <div>, etc.)
    if (!/<(?:p|table|div|tr|td)\b/i.test(formattedHtml)) {
      const lines = formattedHtml.split('\n');
      const renderLinesWithFont = (fontName: 'SolaimanLipi' | 'SutonnyMJ') => {
        return lines.map(line => {
          if (!line.trim()) return '<p style="margin:0; padding:0; min-height:1.2em; font-size: 10pt;">&nbsp;</p>';
          const isQuestionHeading = /^\s*(?:\d+[\.\:\)]|[\u09E6-\u09EF]+[\.\:\)])/i.test(line);
          const isExplanationLine = /^\s*(?:ব্যাখ্যা|Explanation|উত্তর|সঠিক উত্তর|Ans|Answer|Note|সমাধান|বিবরণ)[\:\-\s]/i.test(line) || /^[\s]*[\=\⇒\∴\≠\≤\≥\√\π\∞\∠\∆\∑\∫]/.test(line);
          const isBookRefLine = /^\s*(?:\d+\.\s*)?(?:[A-Za-z0-9\s,\.\-_:\(\)\[\]\/]{2,60})\s*,\s*(?:Page|পৃষ্ঠা|page|p\.)/i.test(line);
          const hasHighlightIndicator = (/[*✓✔√#]\s*$/.test(line) || line.includes('mso-highlight') || line.includes('background-color') || line.includes('<mark')) && !/[a-zA-Z0-9\u0980-\u09FF]\s*\*\s*[a-zA-Z0-9\u0980-\u09FF]/.test(line);
          const isCorrectOption = hasHighlightIndicator && !isQuestionHeading && !isExplanationLine && !isBookRefLine;

          const lineContent = formatHtmlTextPiece(line, fontName, customDict);

          if (isCorrectOption) {
            return `<p style="margin:0; padding:0; line-height:1.25; font-size: 10pt;"><span style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; font-weight: normal; padding: 1px 4px; font-size: 10pt;"><mark style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; color: #000000; font-weight: normal; font-size: 10pt;">${lineContent}</mark></span></p>`;
          }

          return `<p style="margin:0; padding:0; line-height:1.25; font-size: 10pt;">${lineContent}</p>`;
        }).join('');
      };

      if (primaryFont === 'Combo') {
        const solHtml = renderLinesWithFont('SolaimanLipi');
        const sutHtml = renderLinesWithFont('SutonnyMJ');
        formattedHtml = `
          <p style="margin: 4px 0 6px 0; padding: 0; font-weight: bold; font-size: 10pt; color: #dc2626;"><span style="color: #dc2626; font-weight: bold; font-size: 10pt;">SolaimanLipi আউটপুট</span></p>
          ${solHtml}
          <p style="margin: 18px 0 6px 0; padding: 0; font-weight: bold; font-size: 10pt; color: #7c3aed;"><span style="color: #7c3aed; font-weight: bold; font-size: 10pt;">SutonnyMJ আউটপুট</span></p>
          ${sutHtml}
        `;
      } else {
        formattedHtml = renderLinesWithFont(primaryFont === 'SutonnyMJ' ? 'SutonnyMJ' : 'SolaimanLipi');
      }
    } else {
      // Ensure all mark tags or highlighted elements get explicit inline mso-highlight: lime
      formattedHtml = formattedHtml.replace(/<mark([^>]*)>/gi, (match, p1) => {
        if (!/mso-highlight/i.test(p1)) {
          return `<span style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; font-size: 10pt;"><mark${p1} style="background-color: #00ff00; background: #00ff00; mso-highlight: lime; color: #000000; font-weight: normal; font-size: 10pt;">`;
        }
        return match;
      }).replace(/<\/mark>/gi, '</mark></span>');

      formattedHtml = formattedHtml.replace(/<span([^>]*)>/gi, (match, p1) => {
        if (/background/i.test(p1) && !/mso-highlight/i.test(p1)) {
          return match.replace(/style=["']/, 'style="mso-highlight: lime; background-color: #00ff00; background: #00ff00; font-size: 10pt; ');
        }
        return match;
      });
    }

    let contentBodyHtml = formattedHtml;
    let headerBlockHtml = '';

    if (includeCorrectionHeader) {
      // Remove any duplicate arafat-3802 title or VAP lines from user content
      contentBodyHtml = contentBodyHtml
        .replace(/<p[^>]*>[\s\S]*?arafat-3802-bangla-english-fixer[\s\S]*?<\/p>/gi, '')
        .replace(/<p[^>]*>[\s\S]*?VAP-KHA_[\s\S]*?<\/p>/gi, '');

      headerBlockHtml = `
        <p style="margin: 0; padding: 0; margin-bottom: 4px; font-size: 10pt; line-height: 1.15;"><span class="eng-text" style="font-size: 10pt;"><b>Correction By Name: ...........................................</b></span></p>
        <p style="margin: 0; padding: 0; margin-bottom: 2px; font-size: 10pt; line-height: 1.15;"><span class="eng-text" style="font-size: 10pt;"><b>❏ Syllabus Check &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ❏ Solution adds (At least 60%) &amp; answer check</b></span></p>
        <p style="margin: 0; padding: 0; margin-bottom: 2px; font-size: 10pt; line-height: 1.15;"><span class="eng-text" style="font-size: 10pt;"><b>❏ Proofreading, Shadow &amp; Answer Check &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ❏ Solution Check</b></span></p>
        <p style="margin: 0; padding: 0; margin-bottom: 2px; font-size: 10pt; line-height: 1.15;"><span class="eng-text" style="font-size: 10pt;"><b>❏ Repeat Check &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ❏ Parallel Ensure (Set-A+B)</b></span></p>
        <p style="margin: 0; padding: 0; margin-bottom: 6px; font-size: 10pt; line-height: 1.15;"><span class="eng-text" style="font-size: 10pt;"><b>❏ Quality Ensure &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ❏ Correction Check</b></span></p>
        <p align="center" style="text-align: center; font-weight: bold; font-size: 10pt; margin-top: 4px; margin-bottom: 4px; line-height: 1.2;"><span class="eng-text" style="font-size: 10pt;"><b>VAP-KHA_(2026)_2nd Time_(Offline)_Ban/Eng/GK_MCQ_Daily/Weekly_Exam-0_Set-A</b></span></p>
      `;
    } else {
      if (!contentBodyHtml.includes('VAP-KHA_')) {
        headerBlockHtml = topHeaderTitle;
      }
    }

    const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${headerBlockHtml}${contentBodyHtml}</body></html>`;

    let blob: Blob;
    try {
      blob = await convertHtmlToNativeDocxBlob(htmlContent, primaryFont);
    } catch (docxErr) {
      console.warn("Native DOCX builder note, fallback:", docxErr);
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
      } else {
        blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      }
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
    
    // Cancel any previous in-flight render task on this canvas
    if (pdfRenderTaskRef.current) {
      try {
        pdfRenderTaskRef.current.cancel();
      } catch {
        // ignore cancellation error
      }
      pdfRenderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderTask = page.render({ canvasContext: context, viewport });
        pdfRenderTaskRef.current = renderTask;
        await renderTask.promise;
      }
    } catch (e: any) {
      // PDF.js throws RenderingCancelledException when a render task is cancelled, which is normal
      if (e?.name !== 'RenderingCancelledException' && e?.message !== 'Rendering cancelled') {
        console.error('Error rendering PDF page:', e);
      }
    } finally {
      pdfRenderTaskRef.current = null;
    }
  };

  // Automatically render the PDF page whenever the user navigates, uploads, or switches tabs
  useEffect(() => {
    if (activeTab === 'question-collect' && pdfDoc) {
      const timer = setTimeout(() => {
        renderPdfPage(pdfDoc, pdfPageNum);
      }, 50);
      return () => {
        clearTimeout(timer);
        if (pdfRenderTaskRef.current) {
          try {
            pdfRenderTaskRef.current.cancel();
          } catch {
            // ignore
          }
          pdfRenderTaskRef.current = null;
        }
      };
    }
  }, [activeTab, pdfDoc, pdfPageNum]);

  const handleQcPdfUpload = async (files: FileList | File[] | File) => {
    const rawFiles: File[] = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
    const pdfFiles = rawFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      alert('দয়া করে একটি বা একাধিক বৈধ PDF (.pdf) ফাইল সিলেক্ট করুন!');
      return;
    }

    setQcFileStatus(`${pdfFiles.length}টি PDF ফাইল লোড হচ্ছে...`);

    const loadedBooks: QcBook[] = [];

    for (let file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const baseName = file.name.replace(/\.[^/.]+$/, '');

        // Generate clean short tag
        let shortTag = '';
        const upper = baseName.toUpperCase();
        if (upper.includes('MQB')) shortTag = 'MQB';
        else if (upper.includes('GK')) shortTag = 'GK';
        else if (upper.includes('BANGLA') || upper.includes('BAN')) shortTag = 'Bangla';
        else if (upper.includes('ENGLISH') || upper.includes('ENG')) shortTag = 'English';
        else if (upper.includes('MATH')) shortTag = 'Math';
        else if (upper.includes('BCS')) shortTag = 'BCS';
        else {
          const parts = baseName.split(/[\s_\-\.]+/).filter(Boolean);
          shortTag = parts.length > 0 ? parts[0] : 'Book';
        }

        const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        loadedBooks.push({
          id: bookId,
          name: file.name,
          shortTag: shortTag,
          totalPages: doc.numPages,
          doc: doc,
          arrayBuffer: arrayBuffer,
          isSelected: true
        });
      } catch (err) {
        console.error('Error loading PDF:', file.name, err);
      }
    }

    if (loadedBooks.length > 0) {
      setQcBooks(prev => {
        const updated = [...prev, ...loadedBooks];
        return updated;
      });
      // Save all newly loaded books to IndexedDB history
      for (const lb of loadedBooks) {
        saveHistoryBook({
          id: lb.id,
          name: lb.name,
          shortTag: lb.shortTag,
          totalPages: lb.totalPages,
          fileSizeBytes: lb.arrayBuffer.byteLength,
          uploadedAt: new Date().toISOString(),
          arrayBuffer: lb.arrayBuffer
        }).catch(err => console.error("Error saving to book history DB:", err));
      }
      refreshHistoryCount();

      // If no active book, set first new book as active
      setActiveQcBookId(prev => prev || loadedBooks[0].id);
      setPdfPageNum(1);
      setQcFileStatus(`মোট ${loadedBooks.length}টি বই সফলভাবে যুক্ত করা হয়েছে!`);
      if (!qcFileName) {
        setQcFileName(loadedBooks[0].name.replace(/\.[^/.]+$/, '') + '.docx');
      }
    } else {
      setQcFileStatus('PDF ফাইল লোড করতে সমস্যা হয়েছে!');
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setQcBooks(prev => prev.map(b => b.id === bookId ? { ...b, isSelected: !b.isSelected } : b));
  };

  const selectAllBooks = (select: boolean) => {
    setQcBooks(prev => prev.map(b => ({ ...b, isSelected: select })));
  };

  const deleteBook = (bookId: string) => {
    setQcBooks(prev => {
      const remaining = prev.filter(b => b.id !== bookId);
      if (activeQcBookId === bookId) {
        setActiveQcBookId(remaining.length > 0 ? remaining[0].id : null);
        setPdfPageNum(1);
      }
      return remaining;
    });
  };

  const updateBookTag = (bookId: string, newTag: string) => {
    const trimmed = newTag.trim();
    setQcBooks(prev => prev.map(b => b.id === bookId ? { ...b, shortTag: trimmed } : b));
    updateHistoryBookTag(bookId, trimmed).catch(e => console.error(e));
  };

  const restoreBookFromHistory = async (hBook: HistoryBook) => {
    const existing = qcBooks.find(b => b.id === hBook.id || b.name.toLowerCase() === hBook.name.toLowerCase());
    if (existing) {
      setQcBooks(prev => prev.map(b => b.id === existing.id ? { ...b, isSelected: true } : b));
      setActiveQcBookId(existing.id);
      setPdfPageNum(1);
      setQcFileStatus(`"${existing.name}" বইটি সক্রিয় তালিকায় রয়েছে!`);
      return;
    }

    let doc: any = null;
    if (window.pdfjsLib) {
      doc = await window.pdfjsLib.getDocument({ data: hBook.arrayBuffer.slice(0) }).promise;
    }

    const restoredQcBook: QcBook = {
      id: hBook.id,
      name: hBook.name,
      shortTag: hBook.shortTag,
      totalPages: hBook.totalPages || doc?.numPages || 1,
      doc: doc,
      arrayBuffer: hBook.arrayBuffer,
      isSelected: true
    };

    setQcBooks(prev => [...prev, restoredQcBook]);
    setActiveQcBookId(restoredQcBook.id);
    setPdfPageNum(1);
    setQcFileStatus(`"${hBook.name}" বইটি সক্রিয় তালিকায় ফিরিয়ে আনা হয়েছে!`);
  };

  const restoreAllBooksFromHistory = async (hBooks: HistoryBook[]) => {
    const newQcBooks: QcBook[] = [];
    for (const hBook of hBooks) {
      const existing = qcBooks.find(b => b.id === hBook.id || b.name.toLowerCase() === hBook.name.toLowerCase());
      if (existing) {
        setQcBooks(prev => prev.map(b => b.id === existing.id ? { ...b, isSelected: true } : b));
      } else {
        let doc: any = null;
        if (window.pdfjsLib) {
          try {
            doc = await window.pdfjsLib.getDocument({ data: hBook.arrayBuffer.slice(0) }).promise;
          } catch (e) {
            console.warn("Restore pdfjs error", e);
          }
        }
        newQcBooks.push({
          id: hBook.id,
          name: hBook.name,
          shortTag: hBook.shortTag,
          totalPages: hBook.totalPages || doc?.numPages || 1,
          doc: doc,
          arrayBuffer: hBook.arrayBuffer,
          isSelected: true
        });
      }
    }

    if (newQcBooks.length > 0) {
      setQcBooks(prev => [...prev, ...newQcBooks]);
      if (!activeQcBookId) {
        setActiveQcBookId(newQcBooks[0].id);
      }
    }
    setQcFileStatus(`ইতিহাসের ${hBooks.length}টি বই কার্যকারী তালিকায় লোড করা হয়েছে!`);
  };

  const handleClearQcPdf = () => {
    if (pdfRenderTaskRef.current) {
      try {
        pdfRenderTaskRef.current.cancel();
      } catch {
        // ignore
      }
      pdfRenderTaskRef.current = null;
    }
    setQcBooks([]);
    setActiveQcBookId(null);
    setQcFileStatus('');
    setPdfPageNum(1);
    if (qcFileInputRef.current) {
      qcFileInputRef.current.value = '';
    }
  };

  const findBookForReference = (line: string, books: QcBook[], defaultBook: QcBook): QcBook => {
    if (books.length <= 1) return books[0] || defaultBook;
    const lineLower = line.toLowerCase();

    // 1. Exact or partial short tag match (e.g. "mqb", "gk", "bangla", "eng", "bcs")
    for (const b of books) {
      if (b.shortTag) {
        const tagLower = b.shortTag.toLowerCase();
        const tagRegex = new RegExp(`(^|[^a-zA-Z0-9\u0980-\u09FF])${tagLower}([^a-zA-Z0-9\u0980-\u09FF]|$)`, 'i');
        if (tagRegex.test(lineLower) || lineLower.includes(tagLower)) {
          return b;
        }
      }
    }

    // 2. Filename tokens match (e.g. "2nd", "master", "vap", "bangla", "english", "gk")
    for (const b of books) {
      const tokens = b.name.replace(/\.pdf$/i, '').split(/[\s_\-\.\(\)\[\]]+/).filter(t => t.length >= 2);
      for (const t of tokens) {
        const tLower = t.toLowerCase();
        if (['pdf', 'final', 'update', 'the', 'and', 'file'].includes(tLower)) continue;
        const tokRegex = new RegExp(`(^|[^a-zA-Z0-9\u0980-\u09FF])${tLower}([^a-zA-Z0-9\u0980-\u09FF]|$)`, 'i');
        if (tokRegex.test(lineLower) || (tLower.length >= 3 && lineLower.includes(tLower))) {
          return b;
        }
      }
    }

    return defaultBook;
  };

  const collectQuestionsFromPdf = async () => {
    const selectedBooks = qcBooks.filter(b => b.isSelected);
    if (selectedBooks.length === 0) {
      alert('অনুগ্রহ করে কাজের জন্য কমপক্ষে একটি বই টিক দিয়ে সিলেক্ট করুন!');
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
    const pageTextCache = new Map<string, string>(); // Key: `${bookId}_${pageNum}`
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
        const targetBook = findBookForReference(line, selectedBooks, activeBook || selectedBooks[0]);
        const currentDoc = targetBook.doc;

        let { pageNum: targetPageNum, qNums: targetQNums } = parseReferenceLine(line, lastRenderedPage);

        if (targetPageNum > targetBook.totalPages || targetPageNum < 1) targetPageNum = 1;
        lastRenderedPage = targetPageNum;

        // Update PDF page and preview canvas in real time
        setActiveQcBookId(targetBook.id);
        setPdfPageNum(targetPageNum);
        await renderPdfPage(currentDoc, targetPageNum);

        const qNumsDisplay = targetQNums.length > 0 ? `প্রশ্ন ${targetQNums.join(', ')}` : 'সকল প্রশ্ন';
        setQcStatusMsg(`[${targetBook.shortTag || targetBook.name.slice(0, 10)}] পেজ ${targetPageNum}, ${qNumsDisplay} (${lineIndex + 1}/${lines.length})...`);

        const cacheKey = `${targetBook.id}_page_${targetPageNum}`;
        let pageText = pageTextCache.get(cacheKey) || "";

        if (!pageText) {
          let page = await currentDoc.getPage(targetPageNum);

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
            pageTextCache.set(cacheKey, pageText);
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

            // Extract question number
            let qNumStr = convertToEnglishDigits(block.questionNumber || '');
            let lineNumMatch = line ? line.match(/^\s*([০-৯\d]{1,3})\s*[\.\)\।\:]\s*/) : null;
            if (lineNumMatch) {
              qNumStr = convertToEnglishDigits(lineNumMatch[1]);
            }
            if (!qNumStr) qNumStr = String(totalCollectedCount);
            let formattedQNum = String(qNumStr).length === 1 && /^\d+$/.test(qNumStr) ? "0" + qNumStr : qNumStr;

            // Clean question text (remove leading question numbers and stray option prefixes)
            let cleanQText = (block.questionText || '')
              .replace(/^\s*([০-৯\d]{1,3})\s*[\.\)\।\:]\s*/, '')
              .replace(/^\s*[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i, '')
              .trim();

            let optionsList = [...block.options];
            let correctIdx = block.correctAnswerIndex;

            // If question text is empty or missing, check if options[0] is actually question text
            if (!cleanQText && optionsList[0] && (optionsList[0].length > 30 || /[?।\-:]/.test(optionsList[0]) || /\[U-|\b(?:is|form|sentence|correct|negative|antonym|synonym)\b/i.test(optionsList[0]))) {
              cleanQText = optionsList[0].replace(/^\s*[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i, '').trim();
              optionsList = optionsList.slice(1);
              if (correctIdx !== -1) correctIdx = Math.max(0, correctIdx - 1);
            }

            // Line 1: Question Number + Question Text
            let qOut = `${formattedQNum}. ${cleanQText}\n`;

            const banPrefixes = ['(ক)', '(খ)', '(গ)', '(ঘ)'];
            const engPrefixes = ['(a)', '(b)', '(c)', '(d)'];

            // Lines 2..5: Options
            optionsList.forEach((opt, optIdx) => {
              if (opt && optIdx < 4) {
                const cleanOpt = opt.replace(/^\s*[\(\（\[]?(?:[ক-ঘa-dA-D]|0?[1-4]|[১-৪]|0?[১-৪])[\)\）\]\.\:\-]\s*/i, '').trim();
                let prefix = '';
                if (qcOptionPrefix === 'BAN') {
                  prefix = `${banPrefixes[optIdx] || ''} `;
                } else if (qcOptionPrefix === 'ENG') {
                  prefix = `${engPrefixes[optIdx] || ''} `;
                }
                let isCorrect = block.hasTickMark && correctIdx === optIdx;
                qOut += `${prefix}${cleanOpt}${isCorrect ? '*' : ''}\n`;
              }
            });

            if (block.explanation) {
              let expText = cleanExplanationText(block.explanation);
              if (expText) {
                qOut += `ব্যাখ্যা: ${expText}\n`;
              }
            }

            // Reference line at the VERY END
            let refParts: string[] = [];
            let cleanRefLine = line ? line.replace(/^\s*([০-৯\d]{1,3})\s*[\.\)\।\:]\s*/, '').trim() : '';
            if (cleanRefLine) refParts.push(cleanRefLine);
            if (block.reference && block.reference.trim() && !refParts.includes(block.reference.trim())) {
              refParts.push(block.reference.trim());
            }
            if (block.outsideRefBefore && block.outsideRefBefore.trim() && !refParts.includes(block.outsideRefBefore.trim())) {
              refParts.push(block.outsideRefBefore.trim());
            }
            if (block.outsideRefAfter && block.outsideRefAfter.trim() && !refParts.includes(block.outsideRefAfter.trim())) {
              refParts.push(block.outsideRefAfter.trim());
            }
            if (refParts.length > 0) {
              qOut += `${refParts.join(' ')}\n`;
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
  const formattedInputText1 = formatMathEquations(inputText1);
  const converterFormattedRaw = formatConverterTextOutput(formattedInputText1);
  const isBijoyInputActive = isBijoyText(formattedInputText1);
  const unicodeInputText1 = isBijoyInputActive 
    ? formattedInputText1.split('\n').map(line => bijoyToUnicode(line)).join('\n')
    : formattedInputText1;
  const converterSolaimanTableHtml = generateFormattedTableHtml(unicodeInputText1, 'SolaimanLipi', 'Ban', customDict);
  const converterSutonnyTableHtml = generateFormattedTableHtml(unicodeInputText1, 'SutonnyMJ', 'Ban', customDict);
  
  const activeSubject = subjectCode === 'Custom' ? (customSubject.trim() || 'Ban') : subjectCode;
  const activeSubjectRight = subjectCodeRight === 'Custom' ? (customSubjectRight.trim() || 'Ban') : subjectCodeRight;

  const formatterSolaimanTableHtml = generateFormattedTableHtml(inputText2, 'SolaimanLipi', activeSubject, customDict, false, numMode, customStartNum);
  const formatterSutonnyTableHtml = generateFormattedTableHtml(inputText2, 'SutonnyMJ', activeSubject, customDict, false, numMode, customStartNum);

  const formatterRightSolaimanTableHtml = generateFormattedTableHtml(inputTextRight, 'SolaimanLipi', activeSubjectRight, customDict, true, numModeRight, customStartNumRight);
  const formatterRightSutonnyTableHtml = generateFormattedTableHtml(inputTextRight, 'SutonnyMJ', activeSubjectRight, customDict, true, numModeRight, customStartNumRight);

  return (
    <div className="max-w-[950px] mx-auto p-4 md:p-6 bg-white rounded-xl shadow-md my-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="bg-slate-100 hover:bg-indigo-50 border-2 border-gray-300 hover:border-indigo-400 px-3 py-1.5 rounded-md font-mono font-bold text-xs md:text-sm text-gray-800 hover:text-indigo-800 shadow-inner flex items-center gap-2 cursor-pointer transition-all group"
          title="ডেভেলপার পরিচিতি ও ফিচার গাইড দেখতে ক্লিক করুন"
        >
          <i className="fa-solid fa-circle-info text-indigo-600 group-hover:scale-110 transition-transform"></i>
          <span>arafat-3802-bangla-english-fixer</span>
        </button>
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
          onClick={() => setActiveTab('wcr')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'wcr'
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
          }`}
        >
          WCR
        </button>
        <button
          onClick={() => setActiveTab('important-web')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'important-web'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-extrabold'
          }`}
        >
          Important Web
        </button>
        <button
          onClick={() => setActiveTab('newspaper')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'newspaper'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-extrabold'
          }`}
        >
          Newspaper All
        </button>
        <button
          onClick={() => setActiveTab('pdf-tools')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'pdf-tools'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-extrabold'
          }`}
        >
          PDF All Tools
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-extrabold'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('error-checker')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all ${
            activeTab === 'error-checker'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-extrabold'
          }`}
        >
          Error Checker
        </button>
        <button
          onClick={() => setActiveTab('dq')}
          className={`px-5 py-2 rounded-md font-bold text-sm md:text-base border-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'dq'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-extrabold'
          }`}
          title="DQ : প্রশ্ন বিভাজন (Divide Questions)"
        >
          <i className="fa-solid fa-code-branch text-xs"></i>
          DQ
        </button>
      </div>

      {/* ================= TAB: DQ (DIVIDE QUESTIONS) ================= */}
      {activeTab === 'dq' && (
        <DqTab />
      )}

      {/* ================= TAB: IMPORTANT WEB ================= */}
      {activeTab === 'important-web' && (
        <ImportantWebTab />
      )}

      {/* ================= TAB: NEWSPAPER ALL ================= */}
      {activeTab === 'newspaper' && (
        <NewspaperTab />
      )}

      {/* ================= TAB: PDF ALL TOOLS ================= */}
      {activeTab === 'pdf-tools' && (
        <PdfToolsTab />
      )}

      {/* ================= TAB: WCR ================= */}
      {activeTab === 'wcr' && (
        <WcrTab customDict={customDict} />
      )}

      {/* ================= TAB: CHAT ================= */}
      {activeTab === 'chat' && (
        <ChatTab />
      )}

      {/* ================= TAB: ERROR CHECKER ================= */}
      {activeTab === 'error-checker' && (
        <ErrorCheckerTab />
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
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCard1(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCard1(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCard1(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-5 bg-white border-2 rounded-lg shadow-sm transition-all duration-200 ${
                  isDraggingCard1 ? 'border-red-500 bg-red-50/60 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-bold text-gray-800">SolaimanLipi ওয়ার্ড ফাইল কনভার্ট করুন <br /> (Unicode to Bijoy)</h2>
                  <button
                    onClick={handleClearConverter}
                    className="px-2.5 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1 shrink-0"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    মুছে ফেলুন
                  </button>
                </div>

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-red-300 rounded-lg bg-red-50/20 cursor-pointer hover:bg-red-50/60 transition text-center group">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-red-600 mb-1 group-hover:scale-110 transition-transform"></i>
                  <span className="text-xs font-bold text-gray-700 mb-0.5">
                    {isDraggingCard1 ? 'ফাইলটি এখানে ছেড়ে দিন...' : 'ওয়ার্ড ফাইল ড্রাগ ও ড্রপ করুন অথবা সিলেক্ট করুন'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">(.docx ফাইল সাপোর্টেড)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {converterFileName && (
                  <div className="mt-2 text-xs text-slate-600 font-medium truncate text-center">
                    📁 সিলেক্টেড ফাইল: <span className="font-bold text-slate-800">{converterFileName}</span>
                  </div>
                )}

                {isConverting && (
                  <div className="mt-3 p-2 text-center text-xs text-red-700 font-bold bg-red-50 rounded border border-red-200 animate-pulse flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    কনভার্ট হচ্ছে...
                  </div>
                )}

                {!isConverting && converterPreviewText && (
                  <div className="mt-3 flex items-center justify-center gap-2">
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
                )}
              </div>

              {/* Card 2: Bijoy to Unicode DOCX */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCard2(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCard2(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCard2(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleB2uFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-5 bg-white border-2 rounded-lg shadow-sm transition-all duration-200 ${
                  isDraggingCard2 ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-200' : 'border-gray-200 hover:border-sky-300'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-bold text-gray-800">SutonnyMJ ওয়ার্ড ফাইল কনভার্ট করুন <br /> (Bijoy to Unicode)</h2>
                  <button
                    onClick={handleB2uClearConverter}
                    className="px-2.5 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1 shrink-0"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    মুছে ফেলুন
                  </button>
                </div>

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-sky-300 rounded-lg bg-sky-50/20 cursor-pointer hover:bg-sky-50/60 transition text-center group">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-sky-600 mb-1 group-hover:scale-110 transition-transform"></i>
                  <span className="text-xs font-bold text-gray-700 mb-0.5">
                    {isDraggingCard2 ? 'ফাইলটি এখানে ছেড়ে দিন...' : 'ওয়ার্ড ফাইল ড্রাগ ও ড্রপ করুন অথবা সিলেক্ট করুন'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">(.docx ফাইল সাপোর্টেড)</span>
                  <input
                    ref={b2uFileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleB2uFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {b2uFileName && (
                  <div className="mt-2 text-xs text-slate-600 font-medium truncate text-center">
                    📁 সিলেক্টেড ফাইল: <span className="font-bold text-slate-800">{b2uFileName}</span>
                  </div>
                )}

                {isB2uConverting && (
                  <div className="mt-3 p-2 text-center text-xs text-sky-700 font-bold bg-sky-50 rounded border border-sky-200 animate-pulse flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    কনভার্ট হচ্ছে...
                  </div>
                )}

                {!isB2uConverting && b2uPreviewText && (
                  <div className="mt-3 flex items-center justify-center gap-2">
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
            <QuickMathBar targetTextareaRef={inputText1Ref} onOpenFullToolbar={() => setIsMathToolbarOpen(true)} className="mb-2" />
            <textarea
              ref={inputText1Ref}
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
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Subject Selection */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-lg">
              <span className="text-xs font-bold text-gray-700 px-1">বিষয়:</span>
              <button
                type="button"
                onClick={() => setSubjectCode('Ban')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCode === 'Ban'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Bangla
              </button>
              <button
                type="button"
                onClick={() => setSubjectCode('Eng')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCode === 'Eng'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setSubjectCode('GK')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCode === 'GK'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                GK
              </button>
              <button
                type="button"
                onClick={() => setSubjectCode('Custom')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCode === 'Custom'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                কাস্টম বিষয়
              </button>
              {subjectCode === 'Custom' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="যেমন: Phy, Math"
                  className="px-2 py-0.5 border border-purple-300 rounded text-xs w-24 font-bold bg-white focus:outline-none focus:border-purple-600"
                />
              )}
            </div>

            {/* Numbering Mode Selection */}
            <div className="flex flex-wrap items-center gap-1.5 bg-red-50/60 border border-red-200 p-1.5 rounded-lg">
              <button
                type="button"
                onClick={() => setNumMode('file')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numMode === 'file'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                ফাইল অনুযায়ী নাম্বারিং
              </button>
              <button
                type="button"
                onClick={() => setNumMode('auto')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numMode === 'auto'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                অটো নাম্বারিং
              </button>
              <button
                type="button"
                onClick={() => setNumMode('custom')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numMode === 'custom'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                কাস্টম নাম্বারিং
              </button>
              {numMode === 'custom' && (
                <input
                  type="number"
                  value={customStartNum}
                  onChange={(e) => setCustomStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="শুরু: ১"
                  className="px-2 py-0.5 border border-red-400 rounded text-xs w-16 font-bold bg-white text-center focus:outline-none focus:border-red-600"
                />
              )}
            </div>
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
              ref={inputText2Ref}
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
                📁 ছবি (সর্বোচ্চ ৫টি), PDF অথবা Word Document (.docx) সিলেক্ট করুন বা ড্রাগ করে ছেড়ে দিন:
              </div>
              <label 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingTab2(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingTab2(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTab2(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(e.dataTransfer.files, 'inputText2');
                  }
                }}
                className={`block border-2 border-dashed rounded-md p-5 transition cursor-pointer font-bold text-sm text-center ${
                  isDraggingTab2 ? 'border-emerald-500 bg-emerald-50 text-emerald-800 scale-[1.01]' : 'border-sky-500 bg-white hover:bg-slate-50 text-blue-700'
                }`}
              >
                <i className="fa-solid fa-cloud-arrow-up text-xl mr-2"></i>
                {isDraggingTab2 ? 'ফাইলগুলো এখানে ছেড়ে দিন...' : 'এখানে ফাইল ড্রাগ ও ড্রপ করুন, ক্লিক করে সিলেক্ট করুন অথবা Ctrl+V চাপুন'}
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
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Subject Selection */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-lg">
              <span className="text-xs font-bold text-gray-700 px-1">বিষয়:</span>
              <button
                type="button"
                onClick={() => setSubjectCodeRight('Ban')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCodeRight === 'Ban'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Bangla
              </button>
              <button
                type="button"
                onClick={() => setSubjectCodeRight('Eng')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCodeRight === 'Eng'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setSubjectCodeRight('GK')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCodeRight === 'GK'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                GK
              </button>
              <button
                type="button"
                onClick={() => setSubjectCodeRight('Custom')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  subjectCodeRight === 'Custom'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                কাস্টম বিষয়
              </button>
              {subjectCodeRight === 'Custom' && (
                <input
                  type="text"
                  value={customSubjectRight}
                  onChange={(e) => setCustomSubjectRight(e.target.value)}
                  placeholder="যেমন: Phy, Math"
                  className="px-2 py-0.5 border border-purple-300 rounded text-xs w-24 font-bold bg-white focus:outline-none focus:border-purple-600"
                />
              )}
            </div>

            {/* Numbering Mode Selection */}
            <div className="flex flex-wrap items-center gap-1.5 bg-red-50/60 border border-red-200 p-1.5 rounded-lg">
              <button
                type="button"
                onClick={() => setNumModeRight('file')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numModeRight === 'file'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                ফাইল অনুযায়ী নাম্বারিং
              </button>
              <button
                type="button"
                onClick={() => setNumModeRight('auto')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numModeRight === 'auto'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                অটো নাম্বারিং
              </button>
              <button
                type="button"
                onClick={() => setNumModeRight('custom')}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  numModeRight === 'custom'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-900 border border-red-200 hover:bg-red-100'
                }`}
              >
                কাস্টম নাম্বারিং
              </button>
              {numModeRight === 'custom' && (
                <input
                  type="number"
                  value={customStartNumRight}
                  onChange={(e) => setCustomStartNumRight(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="শুরু: ১"
                  className="px-2 py-0.5 border border-red-400 rounded text-xs w-16 font-bold bg-white text-center focus:outline-none focus:border-red-600"
                />
              )}
            </div>
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
              ref={inputTextRightRef}
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
                📁 ছবি (সর্বোচ্চ ৫টি), PDF অথবা Word Document (.docx) সিলেক্ট করুন বা ড্রাগ করে ছেড়ে দিন:
              </div>
              <label 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingTab2Right(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingTab2Right(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTab2Right(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(e.dataTransfer.files, 'inputTextRight');
                  }
                }}
                className={`block border-2 border-dashed rounded-md p-5 transition cursor-pointer font-bold text-sm text-center ${
                  isDraggingTab2Right ? 'border-emerald-500 bg-emerald-50 text-emerald-800 scale-[1.01]' : 'border-sky-500 bg-white hover:bg-slate-50 text-blue-700'
                }`}
              >
                <i className="fa-solid fa-cloud-arrow-up text-xl mr-2"></i>
                {isDraggingTab2Right ? 'ফাইলগুলো এখানে ছেড়ে দিন...' : 'এখানে ফাইল ড্রাগ ও ড্রপ করুন, ক্লিক করে সিলেক্ট করুন অথবা Ctrl+V চাপুন'}
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
            <strong className="block mb-1 text-sm text-sky-900">নিয়মাবলী ও বই ব্যবহারের পদ্ধতি:</strong>
            <ol className="list-decimal list-inside space-y-1">
              <li>এক বা একাধিক বইয়ের PDF ফাইল একসাথে আপলোড বা টেনে এনে (Drag & Drop) যুক্ত করতে পারবেন।</li>
              <li>কাজের সুবিধার জন্য প্রতিটি বইয়ের পাশে <strong>টিক মার্ক (✓)</strong> দিয়ে সিলেক্ট বা আনসিলেক্ট করতে পারবেন।</li>
              <li>পেজ নাম্বার ও প্রশ্ন নাম্বার লিখুন (যেমন: <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-900 font-bold">পৃষ্ঠা: ১০, প্রশ্ন: ৪</code> বা <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-900 font-bold">26. MQB P 180 q 39</code>)।</li>
              <li>সিস্টেম স্বয়ংক্রিয়ভাবে সিলেক্টকৃত বইসমূহ থেকে প্রশ্ন কালেক্ট করবে এবং নিচে বইয়ের পৃষ্ঠা প্রিভিউ দেখাবে।</li>
            </ol>
          </div>

          {/* Book Management Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-book-bookmark text-sky-600"></i>
                  বইয়ের তালিকা ({qcBooks.length}টি বই, {qcBooks.filter(b => b.isSelected).length}টি সিলেক্টেড):
                </label>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {qcBooks.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => selectAllBooks(true)}
                      className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs px-2.5 py-1 rounded font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      title="সব বই সিলেক্ট করুন"
                    >
                      <i className="fa-solid fa-check-double"></i> সব সিলেক্ট
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllBooks(false)}
                      className="bg-gray-100 text-gray-700 border border-gray-300 text-xs px-2.5 py-1 rounded font-bold hover:bg-gray-200 transition-colors flex items-center gap-1"
                      title="সব বই আনসিলেক্ট করুন"
                    >
                      <i className="fa-solid fa-xmark"></i> সব আনসিলেক্ট
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsBookHistoryOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 shadow-xs border border-purple-500/30"
                  title="আপলোডকৃত ও সংগৃহীত সব বইয়ের ইতিহাস দেখুন"
                >
                  <i className="fa-solid fa-clock-rotate-left text-purple-200"></i> Book History
                  {historyCount > 0 && (
                    <span className="bg-purple-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {historyCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => qcFileInputRef.current?.click()}
                  className="bg-sky-600 text-white text-xs px-3 py-1 rounded font-bold hover:bg-sky-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <i className="fa-solid fa-plus"></i> বই যোগ করুন
                </button>
                {qcBooks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearQcPdf}
                    className="bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition-colors flex items-center gap-1 shadow-sm"
                    title="সকল বই মুছে ফেলুন"
                  >
                    <i className="fa-solid fa-trash-can"></i> সব মুছুন
                  </button>
                )}
              </div>
            </div>

            {/* Hidden multi-file input */}
            <input
              ref={qcFileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleQcPdfUpload(e.target.files)}
            />

            {/* Book Cards List (when books uploaded) */}
            {qcBooks.length > 0 ? (
              <div className="space-y-2 mb-3">
                {qcBooks.map((book) => {
                  const isActivePreview = activeQcBookId === book.id || (!activeQcBookId && qcBooks[0]?.id === book.id);
                  return (
                    <div
                      key={book.id}
                      className={`border rounded-lg p-2.5 bg-white transition-all flex items-center justify-between flex-wrap gap-2 ${
                        book.isSelected
                          ? isActivePreview
                            ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-200 shadow-sm'
                            : 'border-emerald-400 bg-emerald-50/20 shadow-xs'
                          : 'border-gray-200 bg-gray-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox (টিক মার্ক দেওয়া ও উঠিয়ে ফেলা) */}
                        <label className="cursor-pointer flex items-center select-none group" title={book.isSelected ? 'টিক উঠিয়ে দিন' : 'কাজের জন্য টিক দিন'}>
                          <input
                            type="checkbox"
                            checked={book.isSelected}
                            onChange={() => toggleBookSelection(book.id)}
                            className="w-5 h-5 accent-emerald-600 rounded cursor-pointer transition-transform group-hover:scale-110"
                          />
                        </label>

                        {/* PDF Icon */}
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-lg shrink-0 border ${
                          book.isSelected ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          <i className="fa-solid fa-file-pdf"></i>
                        </div>

                        {/* Book Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-bold text-sm truncate max-w-md ${book.isSelected ? 'text-gray-900' : 'text-gray-500 line-through'}`} title={book.name}>
                              {book.name}
                            </p>
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                book.isSelected ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                              title="রেফারেন্স ট্যাগ (ইনপুটে এই নাম বা ট্যাগ দিয়েও প্রশ্ন সংগ্রহ করা যাবে)"
                            >
                              tag: {book.shortTag}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>মোট পেজ: <strong>{book.totalPages}</strong></span>
                            <span>•</span>
                            <span className={book.isSelected ? 'text-emerald-600 font-bold flex items-center gap-1' : 'text-gray-400'}>
                              {book.isSelected ? (
                                <>
                                  <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i> সক্রিয় (কাজের জন্য প্রস্তুত)
                                </>
                              ) : (
                                'নিষ্ক্রিয় (বাদ রাখা হয়েছে)'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQcBookId(book.id);
                            setPdfPageNum(1);
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                            isActivePreview
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300'
                          }`}
                        >
                          <i className={`fa-solid ${isActivePreview ? 'fa-eye' : 'fa-book-open'}`}></i>
                          {isActivePreview ? 'প্রিভিউ হচ্ছে' : 'প্রিভিউ দেখুন'}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteBook(book.id)}
                          title="এই বইটি মুছে ফেলুন"
                          className="w-8 h-8 flex items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Compact Drag-Drop to add more books */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingQcPdf(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingQcPdf(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingQcPdf(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingQcPdf(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleQcPdfUpload(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => qcFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                    isDraggingQcPdf
                      ? 'border-sky-500 bg-sky-100 ring-2 ring-sky-300'
                      : 'border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50'
                  }`}
                >
                  <p className="font-bold text-xs text-sky-800 flex items-center justify-center gap-1.5">
                    <i className="fa-solid fa-cloud-arrow-up text-sm"></i>
                    {isDraggingQcPdf ? 'ফাইলগুলো এখানে ছেড়ে দিন...' : '+ আরও বইয়ের PDF ফাইল টেনে এনে ছাড়ুন বা ক্লিক করে যুক্ত করুন'}
                  </p>
                </div>
              </div>
            ) : (
              /* Hero Drag & Drop Area (when no books uploaded) */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingQcPdf(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingQcPdf(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingQcPdf(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingQcPdf(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleQcPdfUpload(e.dataTransfer.files);
                  }
                }}
                onClick={() => qcFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-all duration-200 mb-3 ${
                  isDraggingQcPdf
                    ? 'border-sky-500 bg-sky-100/80 ring-4 ring-sky-100 scale-[1.01]'
                    : 'border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 shadow-sm'
                }`}
              >
                <div className="w-14 h-14 mx-auto mb-2.5 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                </div>
                <p className="font-bold text-base text-sky-900">
                  {isDraggingQcPdf ? 'বইগুলো এখানে ছেড়ে দিন...' : 'এক বা একাধিক বইয়ের PDF ফাইল আপলোড করতে এখানে ক্লিক করুন বা টেনে এনে ছেড়ে দিন'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Drag & Drop multiple .PDF files or click to browse
                </p>
                {qcFileStatus && <div className="text-xs text-sky-700 font-bold mt-2">{qcFileStatus}</div>}
              </div>
            )}
          </div>

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
              <div className="flex items-center gap-3">
                <label className="font-bold text-sm text-red-700">সংগৃহীত প্রশ্ন আউটপুট:</label>
                {(isCollecting || qcStatusMsg) && (
                  <div className="bg-emerald-50 border border-emerald-400 text-emerald-700 text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                    {isCollecting && <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>}
                    <span>{qcStatusMsg || 'প্রশ্ন সংগৃহীত হচ্ছে...'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Option Prefix Selection Tabs: ক-ঘ, A-D & NO */}
                <div className="flex items-center border-2 border-red-700 rounded-md overflow-hidden bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleQcOptionPrefixChange('BAN')}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      qcOptionPrefix === 'BAN'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="প্রশ্নের অপশনে (ক), (খ), (গ), (ঘ) যোগ করুন"
                  >
                    ক-ঘ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQcOptionPrefixChange('ENG')}
                    className={`px-3 py-1 text-xs font-bold border-l-2 border-red-700 transition-all ${
                      qcOptionPrefix === 'ENG'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="প্রশ্নের অপশনে (a), (b), (c), (d) যোগ করুন"
                  >
                    A-D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQcOptionPrefixChange('NO')}
                    className={`px-3 py-1 text-xs font-bold border-l-2 border-red-700 transition-all ${
                      qcOptionPrefix === 'NO'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="অপশনে কোনো ক-ঘ বা A-D প্রিফিক্স থাকবে না (স্বাভাবিক)"
                  >
                    NO
                  </button>
                </div>

                {/* Font Selection Tabs: Combo, SolaimanLipi & SutonnyMJ */}
                <div className="flex items-center border-2 border-red-700 rounded-md overflow-hidden bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQcFontMode('Combo')}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      qcFontMode === 'Combo'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Combo: SolaimanLipi এবং SutonnyMJ দুটি আউটপুট একসাথে"
                  >
                    Combo
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcFontMode('SolaimanLipi')}
                    className={`px-3 py-1 text-xs font-bold border-l-2 border-red-700 transition-all ${
                      qcFontMode === 'SolaimanLipi'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="SolaimanLipi (ইউনিকোড) এবং Times New Roman ফন্টে আউটপুট"
                  >
                    SolaimanLipi
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcFontMode('SutonnyMJ')}
                    className={`px-3 py-1 text-xs font-bold border-l-2 border-red-700 transition-all ${
                      qcFontMode === 'SutonnyMJ'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="SutonnyMJ (বিজয়) এবং Times New Roman ফন্টে আউটপুট"
                  >
                    SutonnyMJ
                  </button>
                </div>
              </div>
            </div>
            <div id="qcResultBox" className="dual-preview-box min-h-[140px] max-h-[500px]">
              {qcFontMode === 'Combo' ? (
                <div>
                  <p style={{ margin: '4px 0 6px 0', padding: 0 }} className="font-bold text-base text-red-600">
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>SolaimanLipi আউটপুট</span>
                  </p>
                  <div className="combo-solaiman-section mb-6">
                    {renderFormattedSpans(qcResultText, 'SolaimanLipi')}
                  </div>
                  <p style={{ margin: '18px 0 6px 0', padding: 0 }} className="font-bold text-base text-purple-600">
                    <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>SutonnyMJ আউটপুট</span>
                  </p>
                  <div className="combo-sutonny-section">
                    {renderFormattedSpans(qcResultText, 'SutonnyMJ')}
                  </div>
                </div>
              ) : (
                renderFormattedSpans(qcResultText, qcFontMode)
              )}
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 border-t-0 p-2 rounded-b-md w-fit text-sm text-gray-600 shadow-sm mb-4">
              <i
                className="fa-regular fa-copy cursor-pointer hover:text-gray-900"
                title={
                  qcFontMode === 'Combo'
                    ? 'Combo (SolaimanLipi ও SutonnyMJ) কপি করুন'
                    : `${qcFontMode} কপি করুন`
                }
                onClick={() => {
                  if (qcFontMode === 'SutonnyMJ') {
                    copyBijoyText(qcResultText, setMsgQc);
                  } else {
                    copyFormattedContent('qcResultBox', setMsgQc, qcResultText);
                  }
                }}
              ></i>
              <i
                className="fa-solid fa-download cursor-pointer hover:text-gray-900"
                title={
                  qcFontMode === 'Combo'
                    ? 'Combo Word ফাইল (.docx) ডাউনলোড করুন'
                    : `${qcFontMode} Word ফাইল (.docx) ডাউনলোড করুন`
                }
                onClick={() => {
                  const el = document.getElementById('qcResultBox');
                  downloadWordDoc(
                    el?.innerHTML || qcResultText,
                    qcFontMode,
                    qcFileName ||
                      (qcFontMode === 'Combo'
                        ? 'collected-questions-combo.docx'
                        : qcFontMode === 'SutonnyMJ'
                        ? 'collected-questions-sutonny.docx'
                        : 'collected-questions-solaiman.docx'),
                    setMsgQc
                  );
                }}
              ></i>
              {msgQc && <span className="text-xs font-bold text-emerald-600 ml-1">{msgQc}</span>}
            </div>
          </div>

          {/* PDF Viewer Canvas */}
          <div>
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
              <label className="font-bold text-sm text-gray-800">
                PDF প্রিভিউ (পৃষ্ঠা অনুযায়ী):
              </label>
              {qcBooks.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-600 font-bold">বই পরিবর্তন:</span>
                  <select
                    value={activeQcBookId || qcBooks[0]?.id || ''}
                    onChange={(e) => {
                      setActiveQcBookId(e.target.value);
                      setPdfPageNum(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 font-bold focus:outline-none focus:border-sky-500"
                  >
                    {qcBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.isSelected ? '✓ ' : '✕ '} {b.name} ({b.totalPages}p)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="border border-gray-300 rounded bg-slate-900 overflow-hidden shadow-sm">
              <div className="flex justify-between items-center bg-slate-800 p-2 text-white text-xs flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (pdfDoc && pdfPageNum > 1) {
                      setPdfPageNum(pdfPageNum - 1);
                    }
                  }}
                  className="bg-slate-700 hover:bg-sky-600 px-2.5 py-1 rounded transition-colors"
                >
                  <i className="fa-solid fa-chevron-left mr-1"></i> পূর্ববর্তী পৃষ্ঠা
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {activeBook && (
                    <span className="text-sky-300 font-bold truncate max-w-xs hidden sm:inline" title={activeBook.name}>
                      {activeBook.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <span>পেজ:</span>
                    <input
                      type="text"
                      value={pdfPageNum}
                      onChange={(e) => {
                        const val = parseInt(convertToEnglishDigits(e.target.value));
                        if (!isNaN(val) && val >= 1 && val <= pdfTotalPages) {
                          setPdfPageNum(val);
                        }
                      }}
                      className="w-14 px-1 py-0.5 border border-slate-600 rounded text-center text-black font-bold"
                    />
                    <span>/ {pdfTotalPages}</span>
                  </div>
                  {pdfDoc && (
                    <button
                      onClick={() => {
                        setIsCropActive(!isCropActive);
                        setCropBox(null);
                        setCroppedDataUrl(null);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        isCropActive
                          ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title="চিত্র বা ডায়াগ্রাম সিলেক্ট ও ক্রপ করুন"
                    >
                      <i className="fa-solid fa-crop-simple"></i>
                      <span>{isCropActive ? 'ক্রপ মোড সক্রিয় (বন্ধ করুন)' : '✂️ চিত্র ক্রপ করুন'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (pdfDoc && pdfPageNum < pdfTotalPages) {
                      setPdfPageNum(pdfPageNum + 1);
                    }
                  }}
                  className="bg-slate-700 hover:bg-sky-600 px-2.5 py-1 rounded transition-colors"
                >
                  পরবর্তী পৃষ্ঠা <i className="fa-solid fa-chevron-right ml-1"></i>
                </button>
              </div>

              <div className="p-4 flex flex-col items-center min-h-[300px]">
                {pdfDoc ? (
                  <>
                    {isCropActive && (
                      <div className="mb-2 bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold px-3 py-1 rounded-md text-center flex items-center gap-1.5 animate-pulse">
                        <i className="fa-solid fa-crosshairs"></i>
                        <span>চিত্র বা ডায়াগ্রামের উপর মাউস চেপে ধরে ড্র্যাগ করে সিলেক্ট করুন</span>
                      </div>
                    )}
                    <div 
                      className={`relative inline-block select-none ${isCropActive ? 'cursor-crosshair' : ''}`}
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                    >
                      <canvas ref={pdfCanvasRef} className="max-w-full shadow-lg rounded block" />
                      
                      {isCropActive && cropBox && (
                        <div
                          className="absolute border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none rounded shadow-lg"
                          style={{
                            left: `${Math.min(cropBox.startX, cropBox.endX)}px`,
                            top: `${Math.min(cropBox.startY, cropBox.endY)}px`,
                            width: `${Math.abs(cropBox.endX - cropBox.startX)}px`,
                            height: `${Math.abs(cropBox.endY - cropBox.startY)}px`,
                          }}
                        />
                      )}
                    </div>

                    {croppedDataUrl && (
                      <div className="mt-4 w-full max-w-xl bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-md text-white">
                        <div className="flex items-center gap-3">
                          <img src={croppedDataUrl} alt="Cropped preview" className="h-16 w-auto border border-amber-400 rounded bg-white shadow-xs" />
                          <div>
                            <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                              <i className="fa-solid fa-check-circle text-emerald-400"></i> চিত্র সিলেক্ট সম্পন্ন!
                            </div>
                            <div className="text-[11px] text-gray-300">প্রশ্নের আউটপুটে যুক্ত করতে নিচের বাটনে ক্লিক করুন:</div>
                            {cropActionMsg && <div className="text-xs font-bold text-emerald-400 mt-1">{cropActionMsg}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={insertCroppedImageToResult}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow flex items-center gap-1.5 transition"
                          >
                            <i className="fa-solid fa-plus-circle"></i> আউটপুটে চিত্র যোগ করুন
                          </button>
                          <button
                            onClick={copyCroppedImageTag}
                            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow flex items-center gap-1.5 transition"
                          >
                            <i className="fa-solid fa-copy"></i> Tag কপি
                          </button>
                          <button
                            onClick={downloadCroppedImage}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow flex items-center gap-1.5 transition"
                          >
                            <i className="fa-solid fa-download"></i> PNG ডাউনলোড
                          </button>
                          <button
                            onClick={() => {
                              setCroppedDataUrl(null);
                              setCropBox(null);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs font-bold px-2.5 py-1.5 rounded transition"
                          >
                            বাতিল
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 text-center mt-24 text-sm">
                    কোনো PDF বই সিলেক্ট করা হয়নি বা প্রিভিউ উপলব্ধ নেই।
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
              ref={inputVersionTextRef}
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

      {/* Book History Modal */}
      <BookHistoryModal
        isOpen={isBookHistoryOpen}
        onClose={() => setIsBookHistoryOpen(false)}
        activeBooks={qcBooks}
        onRestoreBook={restoreBookFromHistory}
        onRestoreAll={restoreAllBooksFromHistory}
        onHistoryUpdated={refreshHistoryCount}
      />

      {/* Author Profile & System Info Modal */}
      <AuthorProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSelectTab={(tabKey) => setActiveTab(tabKey)}
      />

      {/* Floating Math Toolbar */}
      <MathToolbar
        isOpen={isMathToolbarOpen}
        onOpenChange={setIsMathToolbarOpen}
      />
    </div>
  );
}
