import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import JSZip from "jszip";
import * as mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";
const parsePdf: any = (pdfParseModule as any).default || pdfParseModule;
import { unicodeToBijoy, bijoyToUnicode, formatHtmlTextPiece } from "./src/utils/bijoy";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
});

function xmlUnescapeText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlEscapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function processDocxXmlContent(xmlContent: string): string {
  return xmlContent.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
    let fullRawText = "";
    rXml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_, tContent) => {
      fullRawText += xmlUnescapeText(tContent);
      return "";
    });

    if (!fullRawText) return rXml;

    const hasBengali = /[\u0964\u0965\u0980-\u09FF]/.test(fullRawText);

    const rPrMatch = rXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/);
    const baseRPr = rPrMatch ? rPrMatch[0] : "";

    function getUpdatedRPr(fontName: 'SutonnyMJ' | 'Times New Roman'): string {
      const fontXml = `<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:eastAsia="${fontName}"/>`;
      if (!baseRPr) {
        return `<w:rPr>${fontXml}</w:rPr>`;
      }
      if (/<w:rFonts\s+[^>]*\/>/.test(baseRPr)) {
        return baseRPr.replace(/<w:rFonts\s+[^>]*\/>/, fontXml);
      } else {
        return baseRPr.replace(/(<w:rPr(?:\s[^>]*)?>)/, `$1${fontXml}`);
      }
    }

    if (!hasBengali) {
      // Pure English / non-Bengali run: leave completely untouched (preserve original font and properties)
      return rXml;
    }

    // Has Bengali: set font to SutonnyMJ and convert Bengali text in <w:t>
    const newRPr = getUpdatedRPr('SutonnyMJ');
    let updated = rXml;
    if (baseRPr) {
      updated = updated.replace(baseRPr, newRPr);
    } else {
      updated = updated.replace(/(<w:r(?:\s[^>]*)?>)/, `$1${newRPr}`);
    }

    updated = updated.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
      const raw = xmlUnescapeText(tContent);
      const converted = raw.split(/([\u0964\u0965\u0980-\u09FF]+[\?\!\,\;\:]*)/g).map(part => {
        if (/[\u0964\u0965\u0980-\u09FF]/.test(part)) {
          return unicodeToBijoy(part);
        }
        return part;
      }).join('');
      const escaped = xmlEscapeText(converted);
      return `${tOpen}${escaped}${tClose}`;
    });

    return updated;
  });
}

function isBijoyFont(rPrXml: string): boolean {
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
}

function processDocxXmlContentToUnicode(xmlContent: string): string {
  return xmlContent.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (rXml) => {
    let fullRawText = "";
    rXml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_, tContent) => {
      fullRawText += xmlUnescapeText(tContent);
      return "";
    });

    if (!fullRawText) return rXml;

    const rPrMatch = rXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/i);
    const baseRPr = rPrMatch ? rPrMatch[0] : "";

    function getUpdatedRPr(): string {
      const fontXml = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SolaimanLipi" w:eastAsia="Times New Roman"/>`;
      if (!baseRPr) {
        return `<w:rPr>${fontXml}</w:rPr>`;
      }
      if (/<w:rFonts\s+[^>]*\/>/i.test(baseRPr)) {
        return baseRPr.replace(/<w:rFonts\s+[^>]*\/>/i, fontXml);
      } else {
        return baseRPr.replace(/(<w:rPr(?:\s[^>]*)?>)/i, `$1${fontXml}`);
      }
    }

    const fontIsBijoy = isBijoyFont(baseRPr);
    const hasExtendedAscii = /[^\x00-\x7F]/.test(fullRawText);
    const hasBijoyMarkers = /[‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏ×Ø™¢ÙÜßáäå¤§©®¯°±³µ¶º»¿ÀÇÈÍÐÑÒÓÔÕÖÚÛÝÞàâãæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(fullRawText);

    const shouldConvert = fontIsBijoy || hasExtendedAscii || hasBijoyMarkers;

    if (!shouldConvert) {
      // English text / numbers / non-Bijoy run: keep text and font completely intact (preserve original font)
      return rXml;
    }

    // Bijoy text: convert to Unicode Bengali and set font to SolaimanLipi for complex script and Times New Roman for ASCII
    const newRPr = getUpdatedRPr();
    let updated = rXml;
    if (baseRPr) {
      updated = updated.replace(baseRPr, newRPr);
    } else {
      updated = updated.replace(/(<w:r(?:\s[^>]*)?>)/i, `$1${newRPr}`);
    }

    updated = updated.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_, tOpen, tContent, tClose) => {
      const raw = xmlUnescapeText(tContent);
      const converted = bijoyToUnicode(raw);
      const escaped = xmlEscapeText(converted);
      return `${tOpen}${escaped}${tClose}`;
    });

    return updated;
  });
}

// Model Cooldown Manager to prevent repeating rate-limited / quota-exhausted models
const modelCooldowns: Record<string, number> = {};

function getActiveCandidateModels(models: string[]): string[] {
  const now = Date.now();
  const active = models.filter((m) => !modelCooldowns[m] || modelCooldowns[m] <= now);
  return active.length > 0 ? active : models;
}

function markModelCooldown(modelName: string, durationMs = 60000) {
  modelCooldowns[modelName] = Date.now() + durationMs;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  // API Route: Convert Docx Unicode to Bijoy
  app.post("/api/convert-docx", upload.single("file"), async (req: express.Request, res: express.Response) => {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      // 1. Extract HTML using Mammoth to preserve tables and document structure for preview
      const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });
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
      const textResult = await mammoth.extractRawText({ buffer: file.buffer });
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
      const zip = await JSZip.loadAsync(file.buffer);
      const xmlFiles = Object.keys(zip.files).filter(fName => fName.startsWith("word/") && fName.endsWith(".xml"));

      for (const fileName of xmlFiles) {
        const xmlContent = await zip.file(fileName)?.async("string");
        if (xmlContent) {
          const convertedXml = processDocxXmlContent(xmlContent);
          zip.file(fileName, convertedXml);
        }
      }

      const buffer = await zip.generateAsync({ type: "nodebuffer" });

      res.json({
        file: buffer.toString('base64'),
        text: convertedPlainText,
        htmlPreview: convertedHtmlPreview
      });
    } catch (error: any) {
      console.error("Docx conversion error:", error);
      res.status(500).json({ error: error.message || "Conversion failed" });
    }
  });

  // API Route: Convert Docx Bijoy to Unicode
  app.post("/api/convert-docx-bijoy-to-unicode", upload.single("file"), async (req: express.Request, res: express.Response) => {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const zip = await JSZip.loadAsync(file.buffer);
      const xmlFiles = Object.keys(zip.files).filter(fName => fName.startsWith("word/") && fName.endsWith(".xml"));

      for (const fileName of xmlFiles) {
        const xmlContent = await zip.file(fileName)?.async("string");
        if (xmlContent) {
          const convertedXml = processDocxXmlContentToUnicode(xmlContent);
          zip.file(fileName, convertedXml);
        }
      }

      const buffer = await zip.generateAsync({ type: "nodebuffer" });

      // Convert the processed buffer (containing Unicode Bengali and untouched English) to HTML preview and text
      const htmlResult = await mammoth.convertToHtml({ buffer });
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

      const textResult = await mammoth.extractRawText({ buffer });
      const convertedPlainText = textResult.value || "";

      res.json({
        file: buffer.toString('base64'),
        text: convertedPlainText,
        htmlPreview: convertedHtmlPreview
      });
    } catch (error: any) {
      console.error("Docx Bijoy to Unicode conversion error:", error);
      res.status(500).json({ error: error.message || "Conversion failed" });
    }
  });

  // API Route: High-Accuracy Image OCR for Bengali & English Question Papers
  app.post("/api/ocr", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "No image data provided" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(400).json({
          error: "GEMINI_API_KEY is missing. Please configure it in your Secrets.",
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const prompt = `You are an expert OCR transcription engine specializing in Bengali and English question papers, exam books, multiple-choice questions, and text documents.

INSTRUCTIONS:
1. Accurately transcribe ALL Bengali and English text from the image line-by-line.
2. CRITICAL FOR UNDERLINED TEXT: If any word, phrase, sentence, or clause in the question stem or options has an UNDERLINE beneath it (such as in grammar questions: "The underlined clause/phrase/word is..."), YOU MUST PRESERVE the underline by wrapping the exact underlined word(s) in <u>...</u> HTML tags (for example: "What <u>the board ultimately resolved after several rounds of negotiation</u> surprised the shareholders.").
3. CRITICAL FOR HIGHLIGHTED / TICKED / CIRCLE-BADGE CORRECT ANSWERS:
   - If any option text is HIGHLIGHTED with a GREEN or YELLOW background, or has a checkmark (✓), tick, or circle around it, place an asterisk (*) right after that option text (e.g. "(a) noun clause*").
   - If the answer is given in the margin/column beside the question as a letter inside a circle badge (e.g. a teal/green circle badge with 'a', 'b', 'c', or 'd' next to question 33, 34, etc.), identify that letter as the correct answer and mark that corresponding option with an asterisk (*) (e.g. if the circled letter next to question 33 is 'a', mark option '(a) noun clause*').
4. Preserve question numbers (e.g., 01., 02., ১৫., ১৬.), options ((ক), (খ), (গ), (ঘ) or (a), (b), (c), (d)), references in brackets like [JU(C)'24-25, Pb,page-280], and explanations.
5. CRITICAL FOR FIGURES, DIAGRAMS, MIRROR IMAGES, SHAPES, & GEOMETRY:
   - When a question or option contains a diagram, figure, drawing, shape, circuit, mirror image puzzle, or geometrical figure:
     a) DO NOT skip or ignore the diagram, and DO NOT replace it with vague text like "(প্রদত্ত চিত্র)" or "(উত্তর চিত্র)".
     b) If the figure can be visually reconstructed using SVG or clean HTML vector diagrams, generate a clean inline SVG (e.g. <svg width="220" height="120" viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg">...</svg>) or HTML diagram representing the exact geometric shapes, arrows, lines, mirror lines, and option figures so that the diagram is visually drawn in full detail in the output!
     c) If it is a complex photo or illustration, provide a clear, detailed descriptor tag or representation: e.g. [চিত্র: <চিত্রে কি দেখানো হয়েছে তার বিস্তারিত বিবরণ>] or [চিত্র / Figure].
6. Fix any physical distortion or blur logically so the Bengali and English words are spelled cleanly and correctly.
7. CRITICAL FOR MATHEMATICAL EQUATIONS & FRACTIONS:
   - Transcribe all fractions in math equations and step-by-step solutions using standard LaTeX fraction format (e.g. \frac{x}{20} = \frac{20}{100 - x}).
   - Preserve equation step symbols like ⇒, ∴, =, :, এবং, শর্তমতে:, সমাধান:.
8. Output ONLY the raw transcribed text. Do not add any conversational introductions, conclusions, or markdown code blocks.`;

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.6-flash",
      ];
      let transcribedText = "";
      let lastErr: any = null;

      const activeModels = getActiveCandidateModels(candidateModels);

      for (const modelName of activeModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      data: imageBase64,
                      mimeType: mimeType || "image/png",
                    },
                  },
                ],
              },
            });
            transcribedText = response.text || "";
            if (transcribedText.trim()) break;
          } catch (mErr: any) {
            const errMsg = mErr?.message || String(mErr);
            lastErr = mErr;
            if (
              errMsg.includes("404") ||
              errMsg.includes("NOT_FOUND") ||
              errMsg.includes("429") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("quota")
            ) {
              markModelCooldown(modelName, 60000);
              console.log(`[OCR Model Fallback] ${modelName} limit/quota reached. Cooling down 60s, switching model.`);
              break; // Don't retry same model if quota exhausted or not found; try next model immediately
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (transcribedText.trim()) break;
      }

      if (!transcribedText.trim() && lastErr) {
        throw lastErr;
      }

      res.json({ text: transcribedText.trim() });
    } catch (error: any) {
      console.error("OCR error:", error);
      let message = error.message || "Failed to extract text using Gemini API.";
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
        message = "Gemini API ফ্রি কোটা সীমা সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।";
      }
      res.status(500).json({ error: message });
    }
  });

  // API Route: Translate Bengali Questions / Text to English Version
  app.post("/api/translate", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        res.json({ translation: "" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(400).json({
          error: "GEMINI_API_KEY is missing. Please configure it in your Secrets.",
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const prompt = `You are an expert educational translator specializing in converting Bengali exam questions, question banks, multiple-choice options, answer keys, and explanations into accurate, high-quality English for English-version students.

CRITICAL MANDATORY INSTRUCTIONS:
1. ABSOLUTELY NO BENGALI CHARACTERS ALLOWED IN THE OUTPUT. Every single Bengali sentence, question, option, word, name, phrase, and explanation MUST be converted 100% into standard academic English.
2. Maintain exact question numbers (e.g. 01., 02., 03.), option letters ((a), (b), (c), (d)), question bank references in brackets like [JU(C)'24-25] or [PB BD - 88, 4.], and correct answer indicators (* or ✓ or √) in place.
3. Convert Bengali literary names, author names, historical events, and general terms into standard English transliterations / academic terms (e.g., Bankim Chandra Chattopadhyay, Rabindranath Tagore, Liberation War, President of China, Jatra Artist, Printer, Book Trader).
4. IF THE INPUT CONTAINS STRUCTURED BLOCK HEADERS LIKE [BLOCK 1], [BLOCK 2], etc., AND TAGS LIKE Q:, A:, B:, C:, D:, EXP:, YOU MUST PRESERVE ALL [BLOCK n] HEADERS AND TAGS EXACTLY AS PROVIDED. Translate ONLY the text following each tag.
5. Maintain line-by-line formatting matching the original input structure.
6. Output ONLY the translated English text directly without any extra commentary, markdown code blocks, or intro text.

Bengali Input Text to Translate:
${text}`;

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.6-flash",
      ];
      let translatedText = "";
      let lastErr: any = null;

      const activeModels = getActiveCandidateModels(candidateModels);

      for (const modelName of activeModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });
            translatedText = response.text || "";
            if (translatedText.trim()) break;
          } catch (mErr: any) {
            const errMsg = mErr?.message || String(mErr);
            lastErr = mErr;
            if (
              errMsg.includes("404") ||
              errMsg.includes("NOT_FOUND") ||
              errMsg.includes("429") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("quota")
            ) {
              markModelCooldown(modelName, 60000);
              console.log(`[Translate Model Fallback] ${modelName} limit/quota reached. Cooling down 60s, switching model.`);
              break;
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (translatedText.trim()) break;
      }

      if (!translatedText.trim() && lastErr) {
        throw lastErr;
      }

      res.json({ translation: translatedText.trim() });
    } catch (error: any) {
      console.error("Translation error:", error);
      let message = error.message || "Failed to translate using Gemini API.";
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
        message = "Gemini API ফ্রি কোটা সীমা সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।";
      }
      res.status(500).json({
        error: message,
      });
    }
  });

  // File Parser Endpoint (Unlimited PDF, DOCX, TXT parser via multipart streaming)
  app.post("/api/parse-file", upload.single("file"), async (req: express.Request, res: express.Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "কোনো ফাইল পাওয়া যায়নি।" });
      }

      const mimeType = file.mimetype || "";
      const originalName = file.originalname || "document";
      const isPdf = mimeType.includes("pdf") || originalName.toLowerCase().endsWith(".pdf");
      const isDocx = mimeType.includes("wordprocessingml") || originalName.toLowerCase().endsWith(".docx");
      const isTextLike = mimeType.startsWith("text/") || 
                         mimeType.includes("json") || 
                         mimeType.includes("xml") || 
                         originalName.toLowerCase().match(/\.(txt|csv|json|xml|html|css|js|ts|py|c|cpp|java|md|log)$/i);

      let extractedText = "";

      if (isPdf) {
        try {
          if (typeof parsePdf === "function") {
            const pdfData = await parsePdf(file.buffer);
            extractedText = pdfData?.text || "";
          }
        } catch (pdfErr: any) {
          console.warn("PDF parse error:", pdfErr);
        }
      } else if (isDocx) {
        try {
          const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = docxResult.value || "";
        } catch (docxErr: any) {
          console.warn("Docx parse error:", docxErr);
        }
      } else if (isTextLike) {
        try {
          extractedText = file.buffer.toString("utf-8");
        } catch (txtErr: any) {
          console.warn("Text parse error:", txtErr);
        }
      }

      // Format human-readable size
      const bytes = file.size;
      let sizeFormatted = bytes + " B";
      if (bytes >= 1024 * 1024) {
        sizeFormatted = (bytes / (1024 * 1024)).toFixed(1) + " MB";
      } else if (bytes >= 1024) {
        sizeFormatted = (bytes / 1024).toFixed(1) + " KB";
      }

      res.json({
        success: true,
        fileName: originalName,
        mimeType: isPdf ? "application/pdf" : mimeType,
        sizeFormatted,
        fileSizeBytes: bytes,
        extractedText: extractedText.trim(),
        textLength: extractedText.trim().length
      });
    } catch (err: any) {
      console.error("Parse file error:", err);
      res.status(500).json({ error: "ফাইল প্রসেস করতে সমস্যা হয়েছে।" });
    }
  });

  // API Route: WCR - Word Correction & Revision (Comparing Word File against Reference Files/Images)
  app.post("/api/wcr-correct", upload.fields([
    { name: "wordFile", maxCount: 1 },
    { name: "refFiles", maxCount: 10 }
  ]), async (req: express.Request, res: express.Response) => {
    try {
      const filesObj = (req as any).files || {};
      const wordFile = filesObj["wordFile"]?.[0];
      const refFiles: any[] = filesObj["refFiles"] || [];

      if (!wordFile) {
        return res.status(400).json({ error: "ওয়ার্ড (.docx) ফাইলটি প্রদান করা হয়নি।" });
      }

      // 1. Extract text & HTML from original Word File
      let wordRawText = "";
      try {
        const textRes = await mammoth.extractRawText({ buffer: wordFile.buffer });
        wordRawText = textRes.value || "";
      } catch (docErr: any) {
        console.error("WCR Word extract error:", docErr);
        return res.status(400).json({ error: "আপলোডকৃত ফাইলটি একটি বৈধ .docx (Word Document) ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত। অনুগ্রহ করে একটি সঠিক .docx ফাইল আপলোড করুন।" });
      }

      if (!wordRawText.trim()) {
        return res.status(400).json({ error: "আপলোডকৃত ওয়ার্ড ফাইলটি থেকে কোনো টেক্সট পাওয়া যায়নি।" });
      }

      // 2. Extract contents from Reference files
      const referenceParts: any[] = [];
      let refTextAccumulator = "";

      for (const rFile of refFiles) {
        const rName = rFile.originalname || "reference";
        const rMime = rFile.mimetype || "";
        const isImg = rMime.startsWith("image/") || rName.match(/\.(png|jpe?g|webp|bmp)$/i);
        const isPdf = rMime.includes("pdf") || rName.endsWith(".pdf");
        const isDocx = rMime.includes("wordprocessingml") || rName.endsWith(".docx");

        if (isImg) {
          const base64 = rFile.buffer.toString("base64");
          let effectiveMime = rMime || "image/png";
          if (effectiveMime === "image/jpg") effectiveMime = "image/jpeg";
          referenceParts.push({
            inlineData: {
              mimeType: effectiveMime,
              data: base64
            }
          });
        } else if (isPdf) {
          let pdfText = "";
          try {
            if (typeof parsePdf === "function") {
              const pData = await parsePdf(rFile.buffer);
              pdfText = pData?.text || "";
            }
          } catch (pErr) {
            console.warn("WCR Ref PDF parse note:", pErr);
          }
          if (pdfText.trim()) {
            refTextAccumulator += `\n\n[রেফারেন্স PDF ফাইল: "${rName}"]\n${pdfText.trim()}`;
          }
          const base64 = rFile.buffer.toString("base64");
          if (base64.length < 6000000) {
            referenceParts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: base64
              }
            });
          }
        } else if (isDocx) {
          try {
            const dText = (await mammoth.extractRawText({ buffer: rFile.buffer })).value || "";
            if (dText.trim()) {
              refTextAccumulator += `\n\n[রেফারেন্স Word ফাইল: "${rName}"]\n${dText.trim()}`;
            }
          } catch (dErr) {
            console.warn("WCR Ref DOCX parse note:", dErr);
          }
        }
      }

      if (refTextAccumulator.trim()) {
        referenceParts.unshift({
          text: refTextAccumulator.trim().slice(0, 100000)
        });
      }

      // 3. Build Gemini Request
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY কনফিগার করা নেই।" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `আপনি একটি অত্যন্ত নিখুঁত ও অভিজ্ঞ ডকুমেন্টস প্রুফরিডার ও কারেকশন সিস্টেম (Proofreader & Corrector AI Engine)। আপনার কাজ হলো ব্যবহারকারীর আপলোডকৃত আসল Word Document-এর টেক্সটকে তার প্রদানকৃত রেফারেন্স (Reference Image / PDF / Docx) উৎসের সাথে নিখুঁতভাবে মিলিয়ে সকল ভুলত্রুটি সংশোধন করা।
      
অলঙ্ঘনীয় কারেকশন নিয়মাবলী:
১. মূল ওয়ার্ড টেক্সটের প্রতিটি বাক্য ও শব্দের সাথে রেফারেন্স উৎসের হুবহু মিল রেখে বানান ভুল, টাইপো, যুক্তবর্ণের বিভ্রাট, শব্দ বাদ যাওয়া বা ভুল শব্দ সংশোধন করুন।
২. প্রশ্ন নম্বর (যেমন: 01., 02., ১., ২.), বিষয় কোড (যেমন: Ban, GK), অপশন লেবেল ((ক), (খ), (গ), (ঘ) বা (a), (b), (c), (d)), এবং রেফারেন্স ব্র্যাকেট ([JU(C)'24-25] ইত্যাদি) হুবহু সঠিক রাখুন।
৩. উদ্ধৃতি চিহ্ন/কমা (Quotation Marks vs Underline - বিশেষ সতর্কবার্তা):
   - রেফারেন্স ছবিতে বা ফাইলে কোনো কবিতার নাম, গল্পের নাম, বই বা শব্দের পাশে/উপরে যদি একক বা দ্বৈত উদ্ধৃতি চিহ্ন বা ফার্স্ট কমা/লাস্ট কমা থাকে (যেমন: 'তাহারে পড়ে মনে', 'বইপড়া', "রক্তাক্ত প্রান্তর", 'কবিতায়'), সেগুলোকে কখনোই আন্ডারলাইন (<u>...</u>) বানাবেন না! সেগুলোকে হুবহু উদ্ধৃতি চিহ্ন / কমা ('...' বা "...") হিসেবেই প্রদান করুন।
   - আন্ডারলাইন (Underline): কেবলমাত্র যদি কোনো নির্দিষ্ট শব্দ বা বাক্যাংশের সম্পূর্ণ নিচে সুস্পষ্ট টানা রেখা (Underline) থাকে, তবেই সেই শব্দ/বাক্যাংশটিকে <u>...</u> এইচটিএমএল ট্যাগে মুড়িয়ে দিন (যেমন: "তিনি <u>গল্পকার</u> হিসেবে পরিচিত।")।
৪. উত্তর নির্দেশক (Correct Answer Mark): রেফারেন্স উৎসে কোনো অপশনে টিক চিহ্ন (✓), তারকা (*), হাইলাইট বা বৃত্ত চিহ্ন থাকলে, কারেক্টকৃত টেক্সটে সংশ্লিষ্ট অপশনের পাশে একটি তারকা (*) বা টিক চিহ্ন (✓) বজায় রাখুন (যেমন: 'খ. গল্পকার *')।
৫. সকল লাইন, প্যারাগ্রাফ ও কলাম টেবিলের গঠন এবং ক্রম হুবহু অপরিবর্তিত রাখুন।
৬. উত্তর বর্ণ (যেমন: d, c, b, a, ঘ, গ, খ, ক) কখনোই ব্যাখ্যার বাক্যের শেষে বা ভেতরে যুক্ত করবেন না। ব্যাখ্যার বাক্য এবং উত্তর বর্ণ সম্পূর্ণ পৃথক লাইনে বা ঘরে থাকবে।
৭. আউটপুটে কোনো অপ্রাসঙ্গিক ভূমিকা, উপসংহার বা মার্কডাউন কোড ব্লক (যেমন \`\`\`) রাখবেন না। শুধুমাত্র কারেক্টকৃত মূল প্লেইন টেক্সট প্রদান করুন।`;

      const promptParts: any[] = [
        ...referenceParts,
        {
          text: `[মূল কারেকশনযোগ্য WORD DOCUMENT-এর বর্তমান টেক্সট]:\n${wordRawText}\n\n[কাজ]: উপরের রেফারেন্স উৎস(সমূহ)-এর সাথে এই মূল Word Document-এর টেক্সট মিলিয়ে সকল ভুল বানান, যুক্তবর্ণ, আন্ডারলাইন (<u>...</u>) ও অপশনের ভুল সংশোধন করে সম্পুর্ণ নিখুঁত কারেক্টকৃত টেক্সট প্রদান করুন।`
        }
      ];

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.6-flash",
      ];
      let correctedText = "";
      let lastErr: any = null;

      const activeModels = getActiveCandidateModels(candidateModels);

      for (const modelName of activeModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: promptParts,
              config: {
                systemInstruction,
                temperature: 0.2,
              }
            });
            correctedText = response.text || "";
            if (correctedText.trim()) break;
          } catch (mErr: any) {
            const errMsg = mErr?.message || String(mErr);
            lastErr = mErr;
            if (
              errMsg.includes("404") ||
              errMsg.includes("NOT_FOUND") ||
              errMsg.includes("429") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("quota")
            ) {
              markModelCooldown(modelName, 60000);
              console.log(`[WCR Model Fallback] ${modelName} limit/quota reached. Cooling down 60s, switching model.`);
              break;
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (correctedText.trim()) break;
      }

      if (!correctedText.trim() && lastErr) {
        throw lastErr;
      }

      const finalCorrectedText = correctedText.trim();

      res.json({
        success: true,
        correctedText: finalCorrectedText,
        originalTextLength: wordRawText.length,
        correctedTextLength: finalCorrectedText.length
      });
    } catch (error: any) {
      console.error("WCR Correction Error:", error);
      let message = error.message || "WCR প্রসেস ব্যর্থ হয়েছে।";
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
        message = "Gemini API ফ্রি কোটা সীমা সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।";
      }
      res.status(500).json({ error: message });
    }
  });

  // Gemini AI Chat Route
  app.post("/api/chat", express.json({ limit: "500mb" }), async (req: express.Request, res: express.Response) => {
    try {
      const { messages, prompt, files, fileBase64, imageBase64, fileName, mimeType, fileText, reservedBooks } = req.body;
      const fileList = Array.isArray(files) ? files : ((fileBase64 || imageBase64 || fileText) ? [{ name: fileName || 'file', type: mimeType || 'application/octet-stream', dataUrl: fileBase64 || imageBase64, extractedText: fileText, isImage: !fileText && !!(fileBase64 || imageBase64) }] : []);

      if ((!prompt || !prompt.trim()) && fileList.length === 0 && (!reservedBooks || reservedBooks.length === 0)) {
        return res.status(400).json({ error: "প্রম্পট বা ফাইল প্রয়োজন।" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY কনফিগার করা নেই।" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `আপনি একটি অত্যন্ত বুদ্ধিমান, বন্ধুত্বপূর্ণ এবং দক্ষ বাংলা ও ইংরেজি এআই অ্যাসিস্ট্যান্ট (Gemini-এর মতো)। আপনি 'Bangla English Fixer' অ্যাপের অন্তর্ভুক্ত Chat সেবা।

মূল দায়িত্ব ও ফরম্যাটিংয়ের অলঙ্ঘনীয় নির্দেশাবলী:
১. ব্যবহারকারীর যেকোনো প্রশ্ন (শিক্ষা, বিজ্ঞান, ইতিহাস, গণিত, কোডিং, বাংলা সাহিত্য, ব্যাকরণ, অনুবাদ, সাধারণ জ্ঞান ইত্যাদি) সুন্দর, স্পষ্ট ও নির্ভুলভাবে উত্তর দেবেন।
২. প্রশ্নপত্র ফরম্যাটিং ও উত্তর উপস্থাপনের বিশেষ নিয়ম (অত্যন্ত গুরুত্বপূর্ণ):
   - কোনো অবস্থাতেই প্রতিটি প্রশ্নের শেষে আলাদা করে 'সঠিক উত্তর:', 'উত্তর:', 'Ans:', 'Answer:' ইত্যাদি লিখে আলাদা উত্তর সেকশন যোগ করবেন না।
   - ফাইলে/ইনপুটে যে চিহ্ন দ্বারা উত্তর বোঝানো রয়েছে (যেমন: টিক চিহ্ন ✓, তারকা *, √, বোল্ড বা হাইলাইট), আউটপুটে সংশ্লিষ্ট অপশনটির পাশে ঠিক সেই চিহ্নটিই হুবহু বজায় রাখবেন (যেমন: 'খ. গল্পকার ✓' বা 'খ. গল্পকার *')।
   - যদি মূল ফাইল বা প্রশ্নে উত্তরের কোনো চিহ্ন উল্লেখ না থাকে, কিন্তু উত্তর নির্দেশ করতে হয় বা ব্যবহারকারী সমাধান চান, তবে স্বয়ংক্রিয়ভাবে সঠিক অপশনটির ঠিক পাশে একটি টিক চিহ্ন '✓' বসিয়ে দেবেন (যেমন: 'খ. গল্পকার ✓')। প্রশ্নের শেষে আলাদা করে 'সঠিক উত্তর: ...' লিখবেন না।
   - প্রতিটি প্রশ্ন ও তার ৪টি অপশন সুন্দরভাবে সুবিন্যস্ত লাইনে উপস্থাপন করুন (যেমন: ১। প্রশ্ন... ক. ... খ. ... গ. ... ঘ. ...)।
৩. উত্তর প্রদানে কোনো প্রকার বোল্ড টেক্সট (যেমন **ট্যাগের ভেতর**) বা ** মার্কিং ব্যবহার করবেন না। কোনো প্রশ্ন, অপশন, হেডিং বা সাধারণ বাক্যে অটোমেটিক বোল্ড করবেন না। সম্পূর্ণ রেসপন্স সাধারণ প্লেইন টেক্সট মোডে প্রদান করবেন।
৪. ব্যবহারকারী যেকোনো ছবি বা ফাইল (যেমন প্রশ্নপত্রের ছবি, PDF, Word ডকুমেন্ট, Excel বা টেক্সট ফাইল) দিলে তা বিশ্লেষণ করে সমাধান ও নির্ভুলভাবে উপরে উল্লেখিত নিয়মে ফরম্যাট করে দিন। একাধিক ছবি বা ফাইল একসাথে দিলে সবগুলোর বিষয়বস্তু পুঙ্খানুপুঙ্খভাবে বিশ্লেষণ করবেন।
৫. ব্যবহারকারী যে ভাষায় (বাংলা বা ইংরেজি) প্রশ্ন করবেন, সেই ভাষায় সুন্দরভাবে রেসপন্স করবেন। সৌজন্যমূলক ও সহায়তাপূর্ণ মনোভাব বজায় রাখবেন।
৬. Book Reserve (বইয়ের রেফারেন্স থেকে প্রশ্ন সংগ্রহ): ব্যবহারকারী তার নিজস্ব সংরক্ষিত বই (Book Reserve) লাইব্রেরি থেকে বই প্রদান করেছেন। ব্যবহারকারী যখন কোনো বইয়ের রেফারেন্স (যেমন বইয়ের নাম/কোড, পৃষ্ঠা নম্বর, প্রশ্ন নম্বর, অনুশীলনী বা নির্দিষ্ট বিষয়) দিয়ে প্রশ্ন চাইবেন, তখন এই সংরক্ষিত বইগুলো থেকে সেই রেফারেন্স অনুযায়ী নির্ভুলভাবে মূল প্রশ্ন, অপশন ও সঠিক সমাধান খুঁজে বের করে উপরের নিয়ম অনুযায়ী (অপশনের পাশে টিক ✓ দিয়ে) সুন্দরভাবে ফরম্যাট করে দিন।`;

      // Build conversation contents
      let contentsList: any[] = [];

      if (Array.isArray(messages) && messages.length > 0) {
        contentsList = messages.map((m: { role: string; text: string }) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text || "" }]
        }));
      }

      // Latest message parts
      const latestParts: any[] = [];

      // Add reserved books into prompt context if provided
      if (Array.isArray(reservedBooks) && reservedBooks.length > 0) {
        for (const book of reservedBooks) {
          const bookName = book.title || book.fileName || "Reserved Book";
          const bookCode = book.code ? ` (Code/Tag: ${book.code})` : "";
          const extractedText = (book.extractedText || book.text || "").trim();

          if (extractedText.length > 0) {
            latestParts.push({
              text: `[📚 সংরক্ষিত বইয়ের রেফারেন্স (Book Reserve): "${bookName}"${bookCode}]\n[বইয়ের টেক্সট / অধ্যায় বিষয়বস্তু]:\n${extractedText.slice(0, 100000)}`
            });
          } else if (book.fileBase64 || book.dataUrl) {
            const rawBase64 = (book.fileBase64 || book.dataUrl).replace(/^data:[^;]+;base64,/, "");
            if (rawBase64.length < 5000000) {
              latestParts.push({
                inlineData: {
                  mimeType: book.mimeType || "application/pdf",
                  data: rawBase64
                }
              });
            }
          }
        }
      }

      // Handle attached files (multiple or single)
      for (const f of fileList) {
        const fName = f.name || "file";
        const fType = f.type || "application/octet-stream";
        const fText = f.extractedText;
        const fDataUrl = f.dataUrl;

        if (fText && typeof fText === "string" && fText.trim()) {
          latestParts.push({
            text: `[সংযুক্ত ফাইল: "${fName}"]\nফাইলের বিষয়বস্তু:\n${fText.trim().slice(0, 100000)}`
          });
        } else if (fDataUrl) {
          const cleanBase64 = fDataUrl.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(cleanBase64, "base64");

          const isDocx = fType.includes("wordprocessingml") || fName.toLowerCase().endsWith(".docx");
          const isPdf = fType.includes("pdf") || fName.toLowerCase().endsWith(".pdf");
          const isTextLike = fType.startsWith("text/") || 
                             fType.includes("json") || 
                             fType.includes("xml") || 
                             fName.toLowerCase().match(/\.(txt|csv|json|xml|html|css|js|ts|py|c|cpp|java|md|log)$/i);

          if (isDocx) {
            try {
              const docxText = (await mammoth.extractRawText({ buffer })).value || "";
              if (docxText.trim()) {
                latestParts.push({
                  text: `[ব্যবহারকারী একটি Word ডকুমেন্ট আপলোড করেছেন: "${fName}"]\nডকুমেন্টের বিষয়বস্তু:\n${docxText.trim().slice(0, 80000)}`
                });
              }
            } catch (docErr) {
              console.warn("Docx text extraction failed:", docErr);
            }
          } else if (isPdf) {
            let extractedPdfText = "";
            try {
              if (typeof parsePdf === "function") {
                const pdfData = await parsePdf(buffer);
                extractedPdfText = pdfData?.text || "";
              }
            } catch (pdfErr) {
              console.warn("PDF text extraction note:", pdfErr);
            }

            if (cleanBase64.length < 5000000) {
              latestParts.push({
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanBase64
                }
              });
            }

            if (extractedPdfText.trim().length > 10) {
              latestParts.push({
                text: `[PDF ফাইল নাম: "${fName}"]\n[PDF টেক্সট এক্সট্রাকশন]:\n${extractedPdfText.trim().slice(0, 80000)}`
              });
            }
          } else if (isTextLike) {
            try {
              const textContent = buffer.toString("utf-8");
              if (textContent.trim()) {
                latestParts.push({
                  text: `[ব্যবহারকারী একটি ফাইল আপলোড করেছেন: "${fName}"]\nফাইলের বিষয়বস্তু:\n${textContent.trim().slice(0, 80000)}`
                });
              }
            } catch (txtErr) {
              console.warn("Text decoding failed:", txtErr);
            }
          } else {
            let effectiveMime = fType;
            if (effectiveMime === "image/jpg") effectiveMime = "image/jpeg";

            if (cleanBase64.length < 8000000) {
              latestParts.push({
                inlineData: {
                  mimeType: effectiveMime,
                  data: cleanBase64
                }
              });
            }
          }
        }
      }

      if (prompt && prompt.trim()) {
        latestParts.push({ text: prompt.trim() });
      } else if (fileList.length > 0 && latestParts.length > 0) {
        latestParts.push({ text: `[সংযুক্ত ফাইলসমূহ (${fileList.length}টি)] অনুগ্রহ করে এই ফাইলগুলোর সমস্ত বিষয়বস্তু পুঙ্খানুপুঙ্খ বিশ্লেষণ করুন এবং প্রয়োজনীয় সকল প্রশ্নের সঠিক সমাধান ও বিস্তারিত ব্যাখ্যা প্রদান করুন।` });
      }

      if (contentsList.length > 0) {
        contentsList.push({
          role: "user",
          parts: latestParts
        });
      } else {
        contentsList = [{
          role: "user",
          parts: latestParts
        }];
      }

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.6-flash",
      ];
      let replyText = "";
      let lastErr: any = null;

      const activeModels = getActiveCandidateModels(candidateModels);

      for (const modelName of activeModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contentsList,
              config: {
                systemInstruction,
                temperature: 0.7,
              }
            });
            replyText = response.text || "";
            if (replyText.trim()) break;
          } catch (mErr: any) {
            const errMsg = mErr?.message || String(mErr);
            lastErr = mErr;
            if (
              errMsg.includes("404") ||
              errMsg.includes("NOT_FOUND") ||
              errMsg.includes("429") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("quota")
            ) {
              markModelCooldown(modelName, 60000);
              console.log(`[Chat Model Fallback] ${modelName} limit/quota reached. Cooling down 60s, switching model.`);
              break;
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (replyText.trim()) break;
      }

      if (!replyText.trim() && lastErr) {
        throw lastErr;
      }

      res.json({ reply: replyText.trim() });
    } catch (error: any) {
      console.error("Chat API error:", error);
      let message = error.message || "Gemini AI উত্তর দিতে পারছে না। অনুগ্রহ করে আবার চেষ্টা করুন।";
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
        message = "Gemini API ফ্রি কোটা সীমা সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।";
      }
      res.status(500).json({
        error: message
      });
    }
  });

  // Global API error handler ensuring JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express API Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "Server Error"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
