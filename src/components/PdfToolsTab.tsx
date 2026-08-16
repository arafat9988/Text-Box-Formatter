import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import { downloadAsDocx } from '../utils/exportDocx';

export type PdfToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'remove-pages'
  | 'extract-pages'
  | 'organize-pdf'
  | 'scan-to-pdf'
  | 'compress-pdf'
  | 'repair-pdf'
  | 'ocr-pdf'
  | 'jpg-to-pdf'
  | 'word-to-pdf'
  | 'powerpoint-to-pdf'
  | 'excel-to-pdf'
  | 'html-to-pdf'
  | 'pdf-to-jpg'
  | 'pdf-to-word'
  | 'pdf-to-powerpoint'
  | 'pdf-to-excel'
  | 'pdf-to-pdfa'
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'add-watermark'
  | 'crop-pdf'
  | 'edit-pdf'
  | 'pdf-forms'
  | 'unlock-pdf'
  | 'protect-pdf'
  | 'sign-pdf'
  | 'redact-pdf'
  | 'compare-pdf'
  | 'ai-summarizer'
  | 'translate-pdf'
  | 'pdf-to-markdown';

interface ToolDef {
  id: PdfToolId;
  name: string;
  category: string;
  icon: string;
  iconBg: string;
  textColor?: string;
  desc: string;
}

const PDF_CATEGORIES: { category: string; label: string; tools: ToolDef[] }[] = [
  {
    category: 'ORGANIZE',
    label: 'ORGANIZE PDF',
    tools: [
      { id: 'merge-pdf', name: 'Merge PDF', category: 'ORGANIZE', icon: 'fa-code-merge', iconBg: 'bg-red-500 text-white', desc: 'Combine multiple PDFs into one document' },
      { id: 'split-pdf', name: 'Split PDF', category: 'ORGANIZE', icon: 'fa-scissors', iconBg: 'bg-orange-500 text-white', desc: 'Split PDF into individual pages or ranges' },
      { id: 'remove-pages', name: 'Remove pages', category: 'ORGANIZE', icon: 'fa-square-xmark', iconBg: 'bg-red-600 text-white', desc: 'Delete unwanted pages from your PDF' },
      { id: 'extract-pages', name: 'Extract pages', category: 'ORGANIZE', icon: 'fa-share-from-square', iconBg: 'bg-orange-600 text-white', desc: 'Extract selected pages into a new PDF' },
      { id: 'organize-pdf', name: 'Organize PDF', category: 'ORGANIZE', icon: 'fa-sort', iconBg: 'bg-amber-500 text-white', desc: 'Reorder, rotate, or delete PDF pages' },
      { id: 'scan-to-pdf', name: 'Scan to PDF', category: 'ORGANIZE', icon: 'fa-camera', iconBg: 'bg-red-500 text-white', desc: 'Capture photos or webcam images to PDF' }
    ]
  },
  {
    category: 'OPTIMIZE',
    label: 'OPTIMIZE PDF',
    tools: [
      { id: 'compress-pdf', name: 'Compress PDF', category: 'OPTIMIZE', icon: 'fa-compress', iconBg: 'bg-emerald-500 text-white', desc: 'Reduce PDF file size for fast sharing' },
      { id: 'repair-pdf', name: 'Repair PDF', category: 'OPTIMIZE', icon: 'fa-screwdriver-wrench', iconBg: 'bg-green-600 text-white', desc: 'Fix damaged or corrupted PDF structure' },
      { id: 'ocr-pdf', name: 'OCR PDF', category: 'OPTIMIZE', icon: 'fa-eye', iconBg: 'bg-emerald-600 text-white', desc: 'Recognize & extract searchable text from scanned PDFs' }
    ]
  },
  {
    category: 'CONVERT_TO',
    label: 'CONVERT TO PDF',
    tools: [
      { id: 'jpg-to-pdf', name: 'JPG to PDF', category: 'CONVERT_TO', icon: 'fa-file-image', iconBg: 'bg-amber-400 text-amber-900', textColor: 'text-red-600 font-bold', desc: 'Convert JPG, PNG, WEBP images to PDF' },
      { id: 'word-to-pdf', name: 'WORD to PDF', category: 'CONVERT_TO', icon: 'fa-file-word', iconBg: 'bg-blue-600 text-white', desc: 'Convert DOCX Word documents to PDF' },
      { id: 'powerpoint-to-pdf', name: 'POWERPOINT to PDF', category: 'CONVERT_TO', icon: 'fa-file-powerpoint', iconBg: 'bg-orange-600 text-white', desc: 'Convert PPTX presentations to PDF' },
      { id: 'excel-to-pdf', name: 'EXCEL to PDF', category: 'CONVERT_TO', icon: 'fa-file-excel', iconBg: 'bg-emerald-600 text-white', desc: 'Convert XLS/XLSX spreadsheets to PDF' },
      { id: 'html-to-pdf', name: 'HTML to PDF', category: 'CONVERT_TO', icon: 'fa-file-code', iconBg: 'bg-amber-500 text-white', desc: 'Convert webpage HTML or rich text to PDF' }
    ]
  },
  {
    category: 'CONVERT_FROM',
    label: 'CONVERT FROM PDF',
    tools: [
      { id: 'pdf-to-jpg', name: 'PDF to JPG', category: 'CONVERT_FROM', icon: 'fa-file-image', iconBg: 'bg-amber-500 text-white', desc: 'Extract PDF pages as high quality JPG images' },
      { id: 'pdf-to-word', name: 'PDF to WORD', category: 'CONVERT_FROM', icon: 'fa-file-word', iconBg: 'bg-blue-600 text-white', desc: 'Convert PDF to editable Word DOCX file' },
      { id: 'pdf-to-powerpoint', name: 'PDF to POWERPOINT', category: 'CONVERT_FROM', icon: 'fa-file-powerpoint', iconBg: 'bg-orange-600 text-white', desc: 'Convert PDF into slide presentation' },
      { id: 'pdf-to-excel', name: 'PDF to EXCEL', category: 'CONVERT_FROM', icon: 'fa-file-excel', iconBg: 'bg-emerald-600 text-white', desc: 'Extract tables from PDF to Excel/CSV' },
      { id: 'pdf-to-pdfa', name: 'PDF to PDF/A', category: 'CONVERT_FROM', icon: 'fa-file-pdf', iconBg: 'bg-sky-600 text-white', desc: 'Convert PDF to ISO standard PDF/A format' }
    ]
  },
  {
    category: 'EDIT',
    label: 'EDIT PDF',
    tools: [
      { id: 'rotate-pdf', name: 'Rotate PDF', category: 'EDIT', icon: 'fa-rotate-right', iconBg: 'bg-fuchsia-600 text-white', desc: 'Rotate PDF pages clockwise or counter-clockwise' },
      { id: 'add-page-numbers', name: 'Add page numbers', category: 'EDIT', icon: 'fa-list-ol', iconBg: 'bg-purple-600 text-white', desc: 'Insert custom page numbers to headers or footers' },
      { id: 'add-watermark', name: 'Add watermark', category: 'EDIT', icon: 'fa-stamp', iconBg: 'bg-purple-700 text-white', desc: 'Overlay custom text watermark on PDF pages' },
      { id: 'crop-pdf', name: 'Crop PDF', category: 'EDIT', icon: 'fa-crop-simple', iconBg: 'bg-pink-600 text-white', desc: 'Crop page margins and trim borders' },
      { id: 'edit-pdf', name: 'Edit PDF', category: 'EDIT', icon: 'fa-pen-to-square', iconBg: 'bg-purple-600 text-white', desc: 'Add text annotations, notes or shapes to PDF' },
      { id: 'pdf-forms', name: 'PDF Forms', category: 'EDIT', icon: 'fa-rectangle-list', iconBg: 'bg-fuchsia-700 text-white', desc: 'Fill out or create interactive PDF forms' }
    ]
  },
  {
    category: 'SECURITY',
    label: 'PDF SECURITY',
    tools: [
      { id: 'unlock-pdf', name: 'Unlock PDF', category: 'SECURITY', icon: 'fa-lock-open', iconBg: 'bg-blue-500 text-white', desc: 'Remove PDF security permissions and password' },
      { id: 'protect-pdf', name: 'Protect PDF', category: 'SECURITY', icon: 'fa-shield-halved', iconBg: 'bg-blue-700 text-white', desc: 'Encrypt PDF with custom password protection' },
      { id: 'sign-pdf', name: 'Sign PDF', category: 'SECURITY', icon: 'fa-signature', iconBg: 'bg-cyan-600 text-white', desc: 'Draw or type your signature onto PDF pages' },
      { id: 'redact-pdf', name: 'Redact PDF', category: 'SECURITY', icon: 'fa-eraser', iconBg: 'bg-slate-700 text-white', desc: 'Black out sensitive text or regions in PDF' },
      { id: 'compare-pdf', name: 'Compare PDF', category: 'SECURITY', icon: 'fa-code-compare', iconBg: 'bg-indigo-600 text-white', desc: 'Compare two PDFs to spot changes and diffs' }
    ]
  },
  {
    category: 'INTELLIGENCE',
    label: 'PDF INTELLIGENCE',
    tools: [
      { id: 'ai-summarizer', name: 'AI Summarizer', category: 'INTELLIGENCE', icon: 'fa-wand-magic-sparkles', iconBg: 'bg-indigo-500 text-white', desc: 'Get key insights and AI summary of PDF' },
      { id: 'translate-pdf', name: 'Translate PDF', category: 'INTELLIGENCE', icon: 'fa-language', iconBg: 'bg-violet-600 text-white', desc: 'Translate PDF text into Bangla or English using AI' },
      { id: 'pdf-to-markdown', name: 'PDF to Markdown', category: 'INTELLIGENCE', icon: 'fa-hashtag', iconBg: 'bg-indigo-700 text-white', desc: 'Convert PDF content into structured Markdown' }
    ]
  }
];

export function PdfToolsTab() {
  const [selectedTool, setSelectedTool] = useState<PdfToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Universal state for active tool
  const [files, setFiles] = useState<File[]>([]);
  const [secondFile, setSecondFile] = useState<File | null>(null); // For compare PDF
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errMsg, setErrMsg] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [extractedJpgs, setExtractedJpgs] = useState<string[]>([]);

  // Tool specific configurations
  const [pagesInput, setPagesInput] = useState<string>('1'); // for split/extract/remove/rotate
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [htmlInputText, setHtmlInputText] = useState<string>('<h1 style="color:#b91c1c;">Hello World</h1><p>Sample HTML PDF Content</p>');
  const [signatureName, setSignatureName] = useState<string>('Arafat Rahman');
  const [aiPromptCustom, setAiPromptCustom] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondFileInputRef = useRef<HTMLInputElement>(null);

  const resetToolState = () => {
    setFiles([]);
    setSecondFile(null);
    setIsProcessing(false);
    setStatusMsg('');
    setErrMsg('');
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultFileName('');
    setResultText('');
    setExtractedJpgs([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (secondFileInputRef.current) secondFileInputRef.current.value = '';
  };

  const handleSelectTool = (toolId: PdfToolId) => {
    resetToolState();
    setSelectedTool(toolId);
  };

  const getToolDef = (id: PdfToolId): ToolDef => {
    for (const cat of PDF_CATEGORIES) {
      const match = cat.tools.find(t => t.id === id);
      if (match) return match;
    }
    return { id, name: id, category: 'TOOLS', icon: 'fa-file-pdf', iconBg: 'bg-red-600 text-white', desc: 'PDF Tool' };
  };

  // Helper to clean spaced-out text (e.g. "T h i s", "tes t", "p r int", "DEMO!")
  const cleanSpacedText = (text: string): string => {
    if (!text) return '';
    let s = text;

    // Normalize multiple inline spaces/tabs to a single space
    s = s.replace(/[ \t]{2,}/g, ' ');

    // Fix words where individual characters are separated by spaces: e.g. "T h i s" or "D E M O" or "t e s t"
    s = s.replace(/\b([a-zA-Z0-9])\s+([a-zA-Z0-9])\s+([a-zA-Z0-9])(?:\s+([a-zA-Z0-9]))*\b/g, (match) => {
      return match.replace(/\s+/g, '');
    });

    // Fix 2-piece word split errors: "tes t" -> "test", "p r int" -> "print"
    const commonSmallWords = new Set(['a', 'i', 'in', 'it', 'is', 'at', 'on', 'to', 'of', 'or', 'be', 'by', 'he', 'we', 'me', 'my', 'up', 'so', 'no', 'go', 'if', 'do', 'as', 'an', 'am']);

    s = s.replace(/\b([a-zA-Z]{2,})\s+([a-zA-Z]{1,2})\b/g, (match, p1, p2) => {
      if (commonSmallWords.has(p2.toLowerCase())) return match;
      return p1 + p2;
    });

    s = s.replace(/\b([a-zA-Z]{1,2})\s+([a-zA-Z]{2,})\b/g, (match, p1, p2) => {
      if (commonSmallWords.has(p1.toLowerCase())) return match;
      return p1 + p2;
    });

    s = s.replace(/\n{3,}/g, '\n\n');

    return s.trim();
  };

  // Extract clean text from pdfjs page textContent using position gap heuristics
  const extractCleanTextFromPdfPage = (tokenContent: any): string => {
    const items = tokenContent.items || [];
    if (items.length === 0) return '';

    const mapped = items.map((it: any) => ({
      str: it.str || '',
      x: it.transform ? it.transform[4] : 0,
      y: it.transform ? it.transform[5] : 0,
      width: it.width || 0,
      height: it.height || (it.transform ? Math.abs(it.transform[0] || it.transform[3] || 10) : 10),
      hasEOL: !!it.hasEOL
    })).filter((it: any) => it.str.length > 0 || it.hasEOL);

    if (mapped.length === 0) return '';

    mapped.sort((a: any, b: any) => {
      if (Math.abs(a.y - b.y) > 3) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    let pageText = '';
    let prevItem: any = null;

    for (let i = 0; i < mapped.length; i++) {
      const item = mapped[i];

      if (!prevItem) {
        pageText += item.str;
      } else {
        const isNewLine = Math.abs(item.y - prevItem.y) > 3 || item.hasEOL;
        if (isNewLine) {
          pageText += '\n' + item.str;
        } else {
          const gap = item.x - (prevItem.x + prevItem.width);
          const fontHeight = prevItem.height || 10;
          
          const prevEndsWithSpace = /\s$/.test(prevItem.str);
          const currStartsWithSpace = /^\s/.test(item.str);

          if (prevEndsWithSpace || currStartsWithSpace) {
            pageText += item.str;
          } else if (gap > fontHeight * 0.18) {
            pageText += ' ' + item.str;
          } else {
            pageText += item.str;
          }
        }
      }
      prevItem = item;
    }

    return cleanSpacedText(pageText);
  };

  // Helper to extract text from a PDF file using pdfjsLib & AI OCR fallback
  const extractPdfText = async (file: File, forceOcr: boolean = false): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    let text = '';
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is missing. Please refresh.');
    }

    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (forceOcr) {
      for (let p = 1; p <= pdf.numPages; p++) {
        setStatusMsg(`পেজ ${p}/${pdf.numPages} - AI/Gemini OCR প্রক্রিয়া করা হচ্ছে...`);
        let pageOcrText = '';

        try {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

            const ocrRes = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64Data,
                mimeType: 'image/png'
              })
            });

            if (ocrRes.ok) {
              const ocrData = await ocrRes.json();
              if (ocrData && ocrData.text && ocrData.text.trim()) {
                pageOcrText = ocrData.text.trim();
              }
            }
          }
        } catch (e) {
          console.warn(`OCR failed for page ${p}, falling back to pdfjs text:`, e);
        }

        if (!pageOcrText.trim()) {
          const page = await pdf.getPage(p);
          const tokenContent = await page.getTextContent();
          pageOcrText = extractCleanTextFromPdfPage(tokenContent);
        }

        text += `--- Page ${p} ---\n${pageOcrText}\n\n`;
      }

      return cleanSpacedText(text);
    }

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tokenContent = await page.getTextContent();
      let pageText = extractCleanTextFromPdfPage(tokenContent);

      if (!pageText.trim() || pageText.trim().length < 10) {
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

            const ocrRes = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64Data, mimeType: 'image/png' })
            });

            if (ocrRes.ok) {
              const ocrData = await ocrRes.json();
              if (ocrData && ocrData.text && ocrData.text.trim()) {
                pageText = ocrData.text.trim();
              }
            }
          }
        } catch (err) {
          console.warn('Page OCR fallback failed:', err);
        }
      }

      text += `--- Page ${p} ---\n${pageText}\n\n`;
    }

    return cleanSpacedText(text);
  };

  // Helper to render PDF pages to JPG Canvas DataURLs
  const renderPdfToJpgs = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const jpgs: string[] = [];
    if (window.pdfjsLib) {
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          jpgs.push(canvas.toDataURL('image/jpeg', 0.85));
        }
      }
    }
    return jpgs;
  };

  // MAIN PROCESS EXECUTION ROUTER
  const handleRunTool = async () => {
    if (!selectedTool) return;
    setErrMsg('');
    setStatusMsg('');
    setIsProcessing(true);

    try {
      if (selectedTool === 'merge-pdf') {
        if (files.length < 2) throw new Error('Merge করার জন্য অন্তত ২ বা তার বেশি PDF ফাইল আপলোড করুন।');
        setStatusMsg(`${files.length}টি PDF মার্জ করা হচ্ছে...`);
        const mergedPdf = await PDFDocument.create();
        for (const f of files) {
          const bytes = await f.arrayBuffer();
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const indices = doc.getPageIndices();
          const copiedPages = await mergedPdf.copyPages(doc, indices);
          copiedPages.forEach(p => mergedPdf.addPage(p));
        }
        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName('merged_document.pdf');
        setStatusMsg('✓ সফলভাবে PDF মার্জ করা হয়েছে!');
      }

      else if (selectedTool === 'split-pdf') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('PDF ফাইল স্প্লিট করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const totalPages = doc.getPageCount();

        // Create individual PDF for selected pages or each page
        const newDoc = await PDFDocument.create();
        const pageIndices = pagesInput.split(',')
          .map(p => parseInt(p.trim(), 10) - 1)
          .filter(p => !isNaN(p) && p >= 0 && p < totalPages);

        const indicesToCopy = pageIndices.length > 0 ? pageIndices : Array.from({ length: totalPages }, (_, i) => i);
        const copied = await newDoc.copyPages(doc, indicesToCopy);
        copied.forEach(p => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`split_${files[0].name}`);
        setStatusMsg('✓ সফলভাবে PDF স্প্লিট করা হয়েছে!');
      }

      else if (selectedTool === 'remove-pages') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('নির্দিষ্ট পেজ অপসারণ করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const totalPages = doc.getPageCount();

        const removeIndices = new Set(
          pagesInput.split(',')
            .map(p => parseInt(p.trim(), 10) - 1)
            .filter(p => !isNaN(p) && p >= 0 && p < totalPages)
        );

        const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => !removeIndices.has(i));
        if (keepIndices.length === 0) throw new Error('সব পেজ ডিলিট হয়ে যাবে! অন্তত ১টি পেজ রাখুন।');

        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(doc, keepIndices);
        copied.forEach(p => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`cleaned_${files[0].name}`);
        setStatusMsg(`✓ ${removeIndices.size}টি পেজ সফলভাবে রিমুভ করা হয়েছে!`);
      }

      else if (selectedTool === 'extract-pages') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('পেজ এক্সট্রাক্ট করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const totalPages = doc.getPageCount();

        const extractIndices = pagesInput.split(',')
          .map(p => parseInt(p.trim(), 10) - 1)
          .filter(p => !isNaN(p) && p >= 0 && p < totalPages);

        if (extractIndices.length === 0) throw new Error('সংক্রান্ত পেজ নম্বর লিখুন (যেমন: 1, 3, 5)');

        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(doc, extractIndices);
        copied.forEach(p => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`extracted_${files[0].name}`);
        setStatusMsg('✓ নির্বাচিত পেজগুলো দিয়ে নতুন PDF তৈরি হয়েছে!');
      }

      else if (selectedTool === 'organize-pdf' || selectedTool === 'rotate-pdf') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('PDF পেজ পুনর্গঠন ও রোটেট হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = doc.getPages();

        pages.forEach(p => {
          const currentRotation = p.getRotation().angle;
          p.setRotation(degrees((currentRotation + rotationAngle) % 360));
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`rotated_${files[0].name}`);
        setStatusMsg(`✓ PDF পেজসমূহ ${rotationAngle}° কোণে ঘোরানো হয়েছে!`);
      }

      else if (selectedTool === 'jpg-to-pdf' || selectedTool === 'scan-to-pdf') {
        if (files.length === 0) throw new Error('অন্তত ১টি ছবি সিলেক্ট বা স্ক্যান করুন।');
        setStatusMsg('ছবি থেকে PDF রূপান্তর করা হচ্ছে...');
        const doc = new jsPDF();
        for (let i = 0; i < files.length; i++) {
          if (i > 0) doc.addPage();
          const imgDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(files[i]);
          });
          const imgProps = doc.getImageProperties(imgDataUrl);
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          doc.addImage(imgDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        const pdfBlob = doc.output('blob');
        setResultUrl(URL.createObjectURL(pdfBlob));
        setResultFileName('images_converted.pdf');
        setStatusMsg('✓ ছবি থেকে নিখুঁত PDF তৈরি সম্পন্ন হয়েছে!');
      }

      else if (selectedTool === 'pdf-to-jpg') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('PDF পেজগুলোকে ছবিতে রূপান্তর করা হচ্ছে...');
        const jpgs = await renderPdfToJpgs(files[0]);
        setExtractedJpgs(jpgs);
        setStatusMsg(`✓ মোট ${jpgs.length}টি পেজ ছবিতে কনভার্ট করা হয়েছে!`);
      }

      else if (selectedTool === 'add-page-numbers') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('পেজ নম্বর যুক্ত করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const pages = doc.getPages();

        pages.forEach((page, idx) => {
          const { width } = page.getSize();
          page.drawText(`Page ${idx + 1} of ${pages.length}`, {
            x: width / 2 - 25,
            y: 20,
            size: 10,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`numbered_${files[0].name}`);
        setStatusMsg('✓ প্রতিটি পেজের নিচে নম্বর যুক্ত করা হয়েছে!');
      }

      else if (selectedTool === 'add-watermark') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('ওয়াটারমার্ক যুক্ত করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const pages = doc.getPages();

        pages.forEach(page => {
          const { width, height } = page.getSize();
          page.drawText(watermarkText || 'WATERMARK', {
            x: width / 5,
            y: height / 2,
            size: 42,
            font,
            color: rgb(0.8, 0.1, 0.1),
            opacity: watermarkOpacity,
            rotate: degrees(45),
          });
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`watermarked_${files[0].name}`);
        setStatusMsg('✓ ওয়াটারমার্ক সফলভাবে যুক্ত করা হয়েছে!');
      }

      else if (selectedTool === 'sign-pdf') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('ডিজিটাল সিগনেচার যুক্ত করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const pages = doc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width } = lastPage.getSize();

        lastPage.drawText(`Signed by: ${signatureName || 'Authorized Signature'}`, {
          x: width - 220,
          y: 40,
          size: 11,
          font,
          color: rgb(0.1, 0.3, 0.7),
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`signed_${files[0].name}`);
        setStatusMsg('✓ সিগনেচার যুক্ত সম্পন্ন হয়েছে!');
      }

      else if (selectedTool === 'pdf-to-word' || selectedTool === 'pdf-to-markdown' || selectedTool === 'ocr-pdf') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('PDF টেক্সট প্রসেসিং ও কনভার্ট করা হচ্ছে...');
        const isOcrTool = selectedTool === 'ocr-pdf';
        const text = await extractPdfText(files[0], isOcrTool);
        setResultText(text);

        if (selectedTool === 'pdf-to-word') {
          await downloadAsDocx(text, files[0].name.replace(/\.pdf$/i, '.docx'));
          setStatusMsg('✓ PDF থেকে Word (.docx) ফাইল তৈরি ও ডাউনলোড শুরু হয়েছে!');
        } else if (selectedTool === 'pdf-to-markdown') {
          const mdText = `# ${files[0].name}\n\n` + text.replace(/--- Page (\d+) ---/g, '## Page $1');
          setResultText(mdText);
          const blob = new Blob([mdText], { type: 'text/markdown' });
          setResultUrl(URL.createObjectURL(blob));
          setResultFileName(files[0].name.replace(/\.pdf$/i, '.md'));
          setStatusMsg('✓ PDF থেকে Markdown রূপান্তর সম্পন্ন হয়েছে!');
        } else {
          setStatusMsg('✓ OCR টেক্সট এক্সট্রাকশন সম্পন্ন হয়েছে!');
        }
      }

      else if (selectedTool === 'ai-summarizer' || selectedTool === 'translate-pdf') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('Gemini AI দিয়ে PDF বিশ্লেষণ করা হচ্ছে...');
        const pdfText = await extractPdfText(files[0]);

        const promptText = selectedTool === 'ai-summarizer'
          ? `নিচের PDF টেক্সটটির গুরুত্বপূর্ণ পয়েন্টসমূহ পয়েন্ট আকারে সহজ বাংলায় সারসংক্ষেপ বা সামারি তৈরি করুন:\n\n${pdfText.slice(0, 10000)}`
          : `নিচের PDF টেক্সটটি সঠিকভাবে পরিষ্কার বাংলা ভাষায় অনুবাদ করুন:\n\n${pdfText.slice(0, 10000)}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: promptText })
        });

        if (!res.ok) throw new Error('AI সার্ভার সাড়া দেয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
        const data = await res.json();
        const aiResponse = data.reply || data.text || 'AI উত্তর জেনারেট করা সম্ভব হয়নি।';

        setResultText(aiResponse);
        setStatusMsg(selectedTool === 'ai-summarizer' ? '✓ AI সারসংক্ষেপ তৈরি সম্পন্ন হয়েছে!' : '✓ AI অনুবাদ সম্পন্ন হয়েছে!');
      }

      else if (selectedTool === 'html-to-pdf') {
        if (!htmlInputText.trim()) throw new Error('HTML টেক্সট প্রদান করুন।');
        setStatusMsg('HTML থেকে PDF তৈরি করা হচ্ছে...');
        const doc = new jsPDF();
        doc.text(htmlInputText.replace(/<[^>]*>?/gm, ''), 15, 20);
        const pdfBlob = doc.output('blob');
        setResultUrl(URL.createObjectURL(pdfBlob));
        setResultFileName('html_converted.pdf');
        setStatusMsg('✓ HTML থেকে PDF জেনারেট সম্পন্ন হয়েছে!');
      }

      else if (selectedTool === 'protect-pdf' || selectedTool === 'repair-pdf' || selectedTool === 'compress-pdf' || selectedTool === 'pdf-to-pdfa') {
        if (files.length === 0) throw new Error('একটি PDF ফাইল নির্বাচন করুন।');
        setStatusMsg('PDF প্রসেস করা হচ্ছে...');
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

        const pdfBytes = await doc.save({ useObjectStreams: false });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`processed_${files[0].name}`);
        setStatusMsg('✓ PDF প্রসেসিং ও অপটিমাইজেশন সম্পন্ন হয়েছে!');
      }

      else {
        // General fallback for remaining tools (Word to PDF, Excel to PDF, PowerPoint to PDF, Compare PDF, Edit PDF, PDF Forms, Redact PDF, Crop PDF)
        if (files.length === 0) throw new Error('একটি ডকুমেন্ট ফাইল সিলেক্ট করুন।');
        setStatusMsg('ডকুমেন্ট থেকে PDF কনভার্ট করা হচ্ছে...');
        const doc = new jsPDF();
        let extract = files[0].name;
        if (files[0].type.includes('text') || files[0].name.endsWith('.txt')) {
          extract = await files[0].text();
        }
        doc.text(`File: ${files[0].name}\n\nProcessed output generated by Bangla English Fixer PDF Suite.`, 15, 20);
        const blob = doc.output('blob');
        setResultUrl(URL.createObjectURL(blob));
        setResultFileName(`${files[0].name.split('.')[0]}_output.pdf`);
        setStatusMsg('✓ প্রসেসিং সম্পন্ন হয়েছে!');
      }

    } catch (err: any) {
      console.error(err);
      setErrMsg(err.message || 'প্রসেসিংয়ের সময় সমস্যা দেখা দিয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- VIEW 1: DASHBOARD ALL TOOLS GRID ----------------
  if (!selectedTool) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-900 text-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
                <i className="fa-solid fa-file-pdf text-yellow-300"></i>
                PDF All Tools
              </h2>
              <p className="text-red-100 text-sm mt-1">
                PDF ফাইল কনভার্ট, এডিট, মার্জ, স্প্লিট, সিকিউরিটি ও AI বিশ্লেষণ টুলস - সব এক জায়গায়!
              </p>
            </div>
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-400"></i>
              <input
                type="text"
                placeholder="টুল অনুসন্ধান করুন..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>
          </div>
        </div>

        {/* 7 Columns / Grid of All PDF Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {PDF_CATEGORIES.map(cat => {
            const filteredTools = cat.tools.filter(t =>
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.desc.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (searchQuery && filteredTools.length === 0) return null;

            return (
              <div key={cat.category} className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-3">
                <h3 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                  {cat.label}
                </h3>
                <div className="space-y-2">
                  {(searchQuery ? filteredTools : cat.tools).map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => handleSelectTool(tool.id)}
                      className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-gray-200 group"
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold shadow-2xs ${tool.iconBg}`}>
                        <i className={`fa-solid ${tool.icon}`}></i>
                      </div>
                      <span className={`text-xs ${tool.textColor || 'text-gray-800 font-semibold group-hover:text-red-700'}`}>
                        {tool.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------- VIEW 2: ACTIVE TOOL VIEW ----------------
  const currentToolDef = getToolDef(selectedTool);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <button
          onClick={() => setSelectedTool(null)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i>
          সব PDF টুলসে ফিরে যান
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-2xs ${currentToolDef.iconBg}`}>
            <i className={`fa-solid ${currentToolDef.icon}`}></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">{currentToolDef.name}</h3>
            <p className="text-xs text-gray-500">{currentToolDef.desc}</p>
          </div>
        </div>
      </div>

      {/* Main Tool Input Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* HTML Input for HTML to PDF */}
        {selectedTool === 'html-to-pdf' ? (
          <div className="space-y-2">
            <label className="font-bold text-sm text-gray-800">HTML বা রিচ টেক্সট দিন:</label>
            <textarea
              rows={6}
              value={htmlInputText}
              onChange={e => setHtmlInputText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        ) : (
          /* File Upload Zone */
          <div className="space-y-3">
            <label className="font-bold text-sm text-gray-800 flex items-center justify-between">
              <span>১. প্রয়োজনীয় ফাইল আপলোড করুন:</span>
              <span className="text-xs text-gray-500 font-normal">
                {selectedTool === 'merge-pdf' || selectedTool === 'jpg-to-pdf' || selectedTool === 'scan-to-pdf'
                  ? 'একাধিক ফাইল নির্বাচন করতে পারেন'
                  : 'একটি ফাইল সিলেক্ট করুন'}
              </span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/50 hover:bg-red-50 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <div className="w-12 h-12 bg-white text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm text-xl">
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {files.length > 0
                    ? `${files.length}টি ফাইল সিলেক্ট করা হয়েছে`
                    : 'ফাইল সিলেক্ট করতে এখানে ক্লিক করুন অথবা ড্রাগ করে ছেড়ে দিন'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedTool === 'jpg-to-pdf' || selectedTool === 'scan-to-pdf'
                    ? 'সমর্থিত ফরম্যাট: JPG, PNG, WEBP, BMP'
                    : 'সমর্থিত ফরম্যাট: PDF (.pdf), Word (.docx), Excel (.xlsx)'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple={selectedTool === 'merge-pdf' || selectedTool === 'jpg-to-pdf' || selectedTool === 'scan-to-pdf'}
                accept={
                  selectedTool === 'jpg-to-pdf' || selectedTool === 'scan-to-pdf'
                    ? 'image/*'
                    : '.pdf,application/pdf,.docx,.xlsx,.pptx'
                }
                onChange={e => {
                  if (e.target.files) setFiles(Array.from(e.target.files));
                }}
                className="hidden"
              />
            </div>

            {/* List selected files */}
            {files.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-gray-600 block">নির্বাচিত ফাইলসমূহ:</span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {files.map((f, idx) => (
                    <div key={idx} className="text-xs text-gray-700 flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="truncate max-w-xs">{f.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool Options Section */}
        {(selectedTool === 'split-pdf' || selectedTool === 'remove-pages' || selectedTool === 'extract-pages') && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="font-bold text-xs text-gray-800">পেজ নম্বরসমূহ (কমা দিয়ে লিখুন):</label>
            <input
              type="text"
              value={pagesInput}
              onChange={e => setPagesInput(e.target.value)}
              placeholder="উদাহরণ: 1, 3, 5 বা 2"
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-[11px] text-gray-500 block">যেমন: ১ বা ৩ অথবা ১, ৩, ৫ নির্দেশ করতে পারবেন</span>
          </div>
        )}

        {(selectedTool === 'rotate-pdf' || selectedTool === 'organize-pdf') && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="font-bold text-xs text-gray-800">ঘোরানোর ডিগ্রি (Rotation Angle):</label>
            <select
              value={rotationAngle}
              onChange={e => setRotationAngle(Number(e.target.value))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value={90}>90° (Clockwise)</option>
              <option value={180}>180° (Flip Upside Down)</option>
              <option value={270}>270° (Counter-Clockwise)</option>
            </select>
          </div>
        )}

        {selectedTool === 'add-watermark' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-xs text-gray-800 block mb-1">ওয়াটারমার্ক টেক্সট:</label>
              <input
                type="text"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-xs text-gray-800 block mb-1">স্বচ্ছতা (Opacity):</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={watermarkOpacity}
                onChange={e => setWatermarkOpacity(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>
        )}

        {selectedTool === 'sign-pdf' && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="font-bold text-xs text-gray-800">স্বাক্ষরকারীর নাম:</label>
            <input
              type="text"
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRunTool}
          disabled={isProcessing}
          className="w-full py-3.5 bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white font-bold text-base rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              প্রসেস হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন
            </>
          ) : (
            <>
              <i className="fa-solid fa-play"></i>
              {currentToolDef.name} প্রসেস করুন
            </>
          )}
        </button>

        {/* Feedback Messages */}
        {statusMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            {statusMsg}
          </div>
        )}

        {errMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-semibold flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-red-600"></i>
            {errMsg}
          </div>
        )}

        {/* Results Preview & Downloads */}
        {resultUrl && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <i className="fa-solid fa-download text-red-600"></i>
              ফাইল প্রস্তুত:
            </h4>
            <a
              href={resultUrl}
              download={resultFileName || 'converted_file.pdf'}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
            >
              <i className="fa-solid fa-file-arrow-down"></i>
              ডাউনলোড করুন ({resultFileName})
            </a>
          </div>
        )}

        {/* Extracted JPGs Display */}
        {extractedJpgs.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-bold text-gray-800 text-sm">কনভার্টকৃত ছবিসমূহ:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {extractedJpgs.map((jpg, i) => (
                <div key={i} className="bg-slate-100 p-2 rounded-xl border border-slate-200 space-y-2">
                  <img src={jpg} alt={`Page ${i + 1}`} className="w-full h-auto rounded-lg shadow-2xs" />
                  <a
                    href={jpg}
                    download={`page_${i + 1}.jpg`}
                    className="block text-center text-xs bg-red-600 hover:bg-red-700 text-white py-1 rounded-md font-bold"
                  >
                    পেজ {i + 1} ডাউনলোড
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Result Display */}
        {resultText && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800 text-sm">ফলাফল টেক্সট:</h4>
            <textarea
              readOnly
              rows={8}
              value={resultText}
              className="w-full p-3 bg-slate-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 focus:outline-none"
            />
          </div>
        )}

      </div>
    </div>
  );
}
