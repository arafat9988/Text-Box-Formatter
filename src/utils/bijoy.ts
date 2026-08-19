/**
 * Bijoy (SutonnyMJ) Font Conversion & Language Formatting Utilities
 * Ported from the robust, regex-based converter engine.
 */

const uni2bijoy_string_conversion_map: { [key: string]: string } = {
  "।": "|", "‘": "Ô", "’": "Õ", "“": "Ò", "”": "Ó",
  "্র্য": "ª¨", "র্য": "i¨",
  "ক্ক": "°", "ক্ট": "±", "ক্ত": "³", "ক্ব": "K¡", "স্ক্র": "¯Œ", "ক্র": "µ", "ক্ল": "K¬",
  "ক্ষ্ন": "¶è", "ক্ষ্ণ": "¶è", "হ্ম": "þ", "ক্ষ্ম": "²", "ঙ্ক্ষ": "•¶", "ক্ষ": "¶", "ক্স": "·", "ক্ম": "´",
  "ঙ্গু": "½y", "গু": "¸", "গ্ধ": "»", "গ্ন": "Mœ", "গ্ম": "M¥", "গ্লু": "Møæ", "গ্ল": "Mø", "গ্রু": "Mªæ",
  "ঘ্ন": "Nœ", "ঙ্ক": "¼", "ঙ্খ": "•L", "ঙ্গ": "½", "ঙ্ঘ": "•N",
  "চ্চ": "”P", "চ্ছ": "”Q", "চ্ছ্ব": "”Q¡", "চ্ঞ": "”T",
  "জ্জ্ব": "¾¡", "জ্জ": "¾", "জ্ঝ": "À", "জ্ঞ": "Á", "জ্ব": "R¡",
  "ঞ্চ": "Â", "ঞ্ছ": "Ã", "ঞ্জ": "Ä", "ঞ্ঝ": "Å",
  "ট্ট": "Æ", "ট্ব": "U¡", "ট্ম": "U¥", "ড্ড": "Ç",
  "ণ্ট": "È", "ণ্ঠ": "É", "ন্স": "Ý", "ণ্ড": "Ð", "ন্তু": "š‘", "ণ্ব": "Y^",
  "ত্ত্ব": "Ë¡", "ন্ত্ব": "šÍ¡", "ত্ত": "Ë", "ত্থ": "Ì", "ত্ন": "Zœ", "ত্ম": "Z¥", "ত্ব": "Z¡",
  "ত্রু": "Îæ", "ত্রূ": "Îƒ", "থ্ব": "_¡",
  "দ্গ": "˜M", "দ্ঘ": "˜N", "দ্দ": "Ï", "দ্ধ": "×", "ন্দ্ব": "›Ø", "দ্ব": "Ø", "দ্ভ্র": "™£", "দ্ভ": "™¢",
  "দ্ম": "Ù", "দ্রু": "`ªæ", "শ্রু": "kÖæ", "প্রু": "cÖæ", "প্লু": "cøæ",
  "ধ্ব": "aŸ", "ধ্ম": "a¥",
  "ন্ট": "›U", "ন্ঠ": "Ú", "ন্ড": "Û", "ন্ত্র": "š¿", "ন্ত": "šÍ", "স্ত্র": "¯¿", "ত্র": "Î",
  "ন্থ": "š’", "ন্দ": "›`", "ন্ধ": "Ü", "ণ্ণ": "Yœ", "ণ্ন": "Yœ", "ন্ন": "bœ", "ন্ব": "š^", "ন্ম": "b¥",
  "প্ট": "Þ", "প্ত": "ß", "প্ন": "cœ", "প্প": "à", "প্ল": "cø", "প্স": "á", "ফ্ল": "d¬",
  "ব্জ": "â", "ব্দ": "ã", "ব্ধ": "ä", "ব্ব": "eŸ", "ব্ল": "eø",
  "ভ্র": "å", "ম্ন": "gœ", "ম্প": "¤ú", "ম্ফ": "ç", "ম্ব": "¤^", "ম্ভ": "¤¢", "ম্ভ্র": "¤£", "ম্ম": "¤§", "ম্ল": "¤ø",
  "\u09DCু": "o–", "\u09DDু": "p–", "রু": "iæ", "রূ": "iƒ",
  "ল্ক": "é", "ল্গ": "ê", "ল্প": "í", "ল্ট": "ë", "ল্ড": "ì", "ল্ফ": "î", "ল্ব": "j¦", "ল্ম": "j¥", "ল্ল": "jø",
  "শু": "ï", "শ্চ": "ð", "শ্ছ": "ñ", "শ্ন": "kœ", "শ্ব": "k¦", "শ্ম": "k¥", "শ্ল": "kø",
  "ষ্ক": "®‹", "ষ্ক্র": "®Œ", "ষ্ট": "ó", "ষ্ঠ": "ô", "ষ্ণ": "ò", "ষ্প": "®ú", "ষ্ফ": "õ", "ষ্ম": "®§",
  "স্ক": "¯‹", "স্ট": "÷", "স্খ": "ö", "স্তু": "¯‘", "স্ত": "¯Í", "স্থ": "¯’", "স্ন": "mœ", "স্প": "¯ú",
  "স্ফ": "ù", "স্ব": "¯^", "স্ম": "¯§", "স্ল": "¯ø",
  "হ্ব": "nŸ", "হু": "û", "হ্ণ": "nè", "হ্ন": "ý", "হ্ল": "n¬", "হৃ": "ü",
  "র্": "©", "্র": "ª", "্য": "¨", "্": "&",
  "আ": "Av", "অ": "A", "ই": "B", "ঈ": "C", "উ": "D", "ঊ": "E", "ঋ": "F", "এ": "G", "ঐ": "H", "ও": "I", "ঔ": "J",
  "ক": "K", "খ": "L", "গ": "M", "ঘ": "N", "ঙ": "O", "চ": "P", "ছ": "Q", "জ": "R", "ঝ": "S", "ঞ": "T",
  "ট": "U", "ঠ": "V", "ড": "W", "ঢ": "X", "ণ": "Y", "ত": "Z", "থ": "_", "দ": "`", "ধ": "a", "ন": "b",
  "প": "c", "ফ": "d", "ব": "e", "ভ": "f", "ম": "g", "য": "h", "র": "i", "ল": "j", "শ": "k", "ষ": "l",
  "স": "m", "হ": "n", "\u09DC": "o", "\u09DD": "p", "\u09DF": "q", "ৎ": "r",
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  "া": "v", "ি": "w", "ী": "x", "ু": "y", "ূ": "~", "…": "...", "ৃ": "…", "ে": "‡", "ৈ": "‰", "ৗ": "Š",
  "ং": "s", "ঃ": "t", "ঁ": "u", "—": "Ñ"
};

const bijoyKarReplacements: { [key: string]: string } = {
  "¨y": "y¨", "¨~": "~¨", "vu": "uv", "¨u": "u¨", "Ky": "Kz", "K~": "K‚", "Py": "Pz", "P~": "P‚",
  "Qy": "Qz", "Q~": "Q‚", "Sy": "Sz", "S~": "S‚", "Uy": "Uz", "U~": "U‚", "Vy": "Vz", "V~": "V‚",
  "Wy": "Wz", "W~": "W‚", "Xy": "Xz", "X~": "X‚", "Zy": "Zz", "Z~": "Z‚", "dy": "dz", "d~": "d‚",
  "fy": "fz", "f~": "f‚", "¶y": "¶z", "¶~": "¶‚", "Áy": "Áz", "Á~": "Á‚", "þy": "þz", "þ~": "þ‚",
  "¾y": "¾z", "¾~": "¾‚", "°y": "°z", "°~": "°‚", "¼y": "¼z", "¼~": "¼‚", "Üy": "Üz", "Ü~": "Ü‚",
  "×y": "×z", "×~": "x‚", "äy": "äz", "ä~": "ä‚",
  "§…": "§„", "¥…": "¥„", "c…": "c„", "N…": "N„", "g…": "g„", "e…": "e„", "k…": "k„", "L…": "L„",
  "M…": "M„", "m…": "m„", "l…": "l„", "R…": "R„", "_…": "_„", "`…": "`„", "a…": "a„", "b…": "b„",
  "j…": "j„", "h…": "h„", "Y…": "Y„",
  "j&¸": "êy",
  "'‡": "'†", '"‡': '"†', "{‡": "{†", "-‡": "-†",
  "'‰": "'ˆ", '"‰': '"ˆ', "{‰": "{ˆ", "-‰": "-ˆ",
  "©y": "©z", "©~": "©‚", "‹y": "‹z", "‹~": "‹‚", "÷y": "÷z", "÷~": "÷‚", "ùy": "ùz", "ù~": "ù‚"
};

const bijoyRoFolaReplacements: { [key: string]: string } = {
  "&iæ": "ªæ", "&iƒ": "ªƒ", "Mª": "MÖ", "cª": "cÖ", "dª": "d«",
  "Nªæ": "Nªy", "Pªæ": "Pªy", "Qªæ": "Qªy", "Sªæ": "Sªy", "Uªæ": "Uªy", "Vªæ": "Vªy", "Wªæ": "Wªy",
  "Xªæ": "Xªy", "Yªæ": "Yªy", "bªæ": "bªy", "d«æ": "d«y", "hªæ": "hªy", "jªæ": "jªy", "lªæ": "lªy", "nªæ": "nªy",
  "åy": "åæ",
  "Nªƒ": "Nª~", "Pªƒ": "Pª~", "Qªƒ": "Qª~", "Sªƒ": "Sª~", "Uªƒ": "Uª~", "Vªƒ": "Vª~", "Wªƒ": "Wª~",
  "Xªƒ": "Xª~", "Yªƒ": "Yª~", "bªƒ": "bª~", "d«ƒ": "d«~", "hªƒ": "hª~", "jªƒ": "jª~", "lªƒ": "lª~", "nªƒ": "nª~",
  "å~": "åƒ",
  "”Q&e": "”Q¡", "kª": "kÖ", "mª": "mÖ", "g&å": "¤£"
};

function escRe(k: string): string { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildPatterns(map: { [key: string]: string }): { combined: RegExp | null; map: { [key: string]: string } } {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  const combined = keys.length ? new RegExp(keys.map(escRe).join('|'), 'g') : null;
  return { combined, map };
}

function replaceAll(text: string, patterns: { combined: RegExp | null; map: { [key: string]: string } }): string {
  if (!patterns.combined) return text;
  return text.replace(patterns.combined, (m) => patterns.map[m]);
}

const IsBanglaHalant = (c: string) => c === "্";
const IsBanglaPreKar = (c: string) => ["ি", "ৈ", "ে"].includes(c);
const IsBanglaPostKar = (c: string) => ["া", "ো", "ৌ", "ৗ", "ু", "ূ", "ী", "ৃ"].includes(c);
const IsBanglaKar = (c: string) => IsBanglaPreKar(c) || IsBanglaPostKar(c);
const IsBanglaBanjonborno = (c: string) => /[\u0995-\u09B9\u09DC\u09DD\u09DF]/.test(c);
const IsBanglaOther = (c: string) => /[\u09CE\u0982\u0983\u0981]/.test(c);
const IsSpace = (c: string) => [" ", "\t", "\n", "\r", "\u00A0"].includes(c);
const IsBanglaNukta = (c: string) => c === "\u09BC";
const IsBanglaChandrabindu = (c: string) => c === "\u0981";

function normalizeBengaliNukta(text: string): string {
  if (!text) return text;
  return text
    .replace(/\u09A1\u09BC/g, "\u09DC") // ড + ় -> ড়
    .replace(/\u09A2\u09BC/g, "\u09DD") // ঢ + ় -> ঢ়
    .replace(/\u09AF\u09BC/g, "\u09DF"); // য + ় -> য়
}

// ---- Unicode to Bijoy Logic ----

const uni2bijoyPatterns = buildPatterns(uni2bijoy_string_conversion_map);
const karPatterns = buildPatterns(bijoyKarReplacements);
const roFolaPatterns = buildPatterns(bijoyRoFolaReplacements);

function ReArrangeUnicodeText(str: string): string {
  let n = str;
  let o = 0;
  for (let t = 0; t < n.length; t++) {
    if (t < n.length && IsBanglaPreKar(n.charAt(t))) {
      let r = 1;
      while (IsBanglaBanjonborno(n.charAt(t - r))) {
        if (t - r < 0 || t - r <= o) break;
        if (IsBanglaHalant(n.charAt(t - r - 1))) r += 2; else break;
      }
      let f = n.substring(0, t - r);
      f += n.charAt(t);
      f += n.substring(t - r, t);
      f += n.substring(t + 1, n.length);
      n = f;
      o = t + 1;
      continue;
    }
    if (t < n.length - 1 && IsBanglaHalant(n.charAt(t)) && n.charAt(t - 1) === "র") {
      let i = 1, e = 0;
      while (true) {
        if (IsBanglaBanjonborno(n.charAt(t + i)) && IsBanglaHalant(n.charAt(t + i + 1))) {
          i += 2;
        } else if (IsBanglaBanjonborno(n.charAt(t + i)) && IsBanglaPreKar(n.charAt(t + i + 1))) {
          e = 1; break;
        } else { break; }
      }
      let u = n.substring(0, t - 1);
      u += n.substring(t + i + 1, t + i + e + 1);
      u += n.substring(t + 1, t + i + 1);
      u += n.charAt(t - 1);
      u += n.charAt(t);
      u += n.substring(t + i + e + 1, n.length);
      n = u;
      t += i + e;
      o = t + 1;
      continue;
    }
  }
  return n;
}

export function unicodeToBijoy(text: string): string {
  if (!text) return "";
  let n = normalizeBengaliNukta(text);
  n = n.replace(/ব়/g, "র");
  n = n.replace(/ো/g, "ে\u09BE").replace(/ৌ/g, "ে\u09D7");
  n = n.replace(/্র্য/g, "্র\u200D্য");

  const replaceLastLetter = (str: string, find: string, rep: string) => {
    return str.replace(new RegExp(escRe(find) + "$", "gm"), rep);
  };
  const replaceFirstLetter = (str: string, find: string, rep: string) => {
    return str.replace(new RegExp("^" + escRe(find), "gm"), rep);
  };

  n = replaceLastLetter(n, "র্", "i&");
  n = replaceLastLetter(n, "র্‌", "i&");
  n = ReArrangeUnicodeText(n);
  n = replaceAll(n, uni2bijoyPatterns);
  n = replaceFirstLetter(n, "‡", "†");
  n = replaceFirstLetter(n, "‰", "ˆ");
  n = n.replace(/\(‡/g, "(†").replace(/\[‡/g, "[†").replace(/Ô‡/g, "Ô†").replace(/Ò‡/g, "Ò†");
  n = n.replace(/\(‰/g, "(ˆ").replace(/\[‰/g, "[ˆ").replace(/Ô‰/g, "Ôˆ").replace(/Ò‰/g, "Òˆ");
  n = replaceAll(n, karPatterns);
  n = replaceAll(n, roFolaPatterns);
  return n;
}

// ---- Bijoy to Unicode Logic ----

function invertConversionMap(map: { [key: string]: string }): { [key: string]: string } {
  const inv: { [key: string]: string } = {};
  for (const k in map) { inv[map[k]] = k; }
  return inv;
}

const bijoy2uni_main = invertConversionMap(uni2bijoy_string_conversion_map);
const bijoy2uni_kar = invertConversionMap(bijoyKarReplacements);
const bijoy2uni_rofola = invertConversionMap(bijoyRoFolaReplacements);

const bijoy2uniMainPatterns = buildPatterns(bijoy2uni_main);
const bijoy2uniKarPatterns = buildPatterns(bijoy2uni_kar);
const bijoy2uniRoFolaPatterns = buildPatterns(bijoy2uni_rofola);

function reArrangeBijoyToUnicode(str: string): string {
  let s = str;

  // Pass 1: pull reph (র্) that Bijoy places after a consonant chain back in front of it.
  for (let i = 0; i < s.length; i++) {
    if (i < s.length - 1 && s.charAt(i) === "র" && IsBanglaHalant(s.charAt(i + 1)) && !IsBanglaHalant(s.charAt(i - 1))) {
      let j = 1;
      while (true) {
        if (i - j < 0) break;
        if (IsBanglaBanjonborno(s.charAt(i - j)) && IsBanglaHalant(s.charAt(i - j - 1))) { j += 2; }
        else if (j === 1 && IsBanglaKar(s.charAt(i - j))) { j++; }
        else break;
      }
      let temp = s.substring(0, i - j);
      temp += s.charAt(i);
      temp += s.charAt(i + 1);
      temp += s.substring(i - j, i);
      temp += s.substring(i + 2);
      s = temp;
      i += 1;
    }
  }

  // Collapse any accidental double hasant introduced by the pass above.
  s = s.split("্্").join("্");

  for (let i = 0; i < s.length; i++) {
    if (i < s.length - 1 && s.charAt(i) === "র" && IsBanglaHalant(s.charAt(i + 1)) && !IsBanglaHalant(s.charAt(i - 1)) && IsBanglaHalant(s.charAt(i + 2))) {
      let j = 1;
      while (true) {
        if (i - j < 0) break;
        if (IsBanglaBanjonborno(s.charAt(i - j)) && IsBanglaHalant(s.charAt(i - j - 1))) { j += 2; }
        else if (j === 1 && IsBanglaKar(s.charAt(i - j))) { j++; }
        else break;
      }
      let temp = s.substring(0, i - j);
      temp += s.charAt(i);
      temp += s.charAt(i + 1);
      temp += s.substring(i - j, i);
      temp += s.substring(i + 2);
      s = temp;
      i += 1;
      continue;
    }

    // Vowel-sign/Chandrabindu + Hasant + Consonant  ->  Hasant + Consonant + Vowel-sign/Chandrabindu
    if (i > 0 && s.charAt(i) === "্" && (IsBanglaKar(s.charAt(i - 1)) || IsBanglaNukta(s.charAt(i - 1))) && i < s.length - 1) {
      let temp = s.substring(0, i - 1);
      temp += s.charAt(i);
      temp += s.charAt(i + 1);
      temp += s.charAt(i - 1);
      temp += s.substring(i + 2);
      s = temp;
    }

    // RA + HASANT + vowel-sign  ->  vowel-sign + RA + HASANT (undoes র-ফলা style typing)
    if (i > 0 && i < s.length - 1 && s.charAt(i) === "্" && s.charAt(i - 1) === "র" && s.charAt(i - 2) !== "্" && IsBanglaKar(s.charAt(i + 1))) {
      let temp = s.substring(0, i - 1);
      temp += s.charAt(i + 1);
      temp += s.charAt(i - 1);
      temp += s.charAt(i);
      temp += s.substring(i + 2);
      s = temp;
    }

    // Move pre-base vowel signs (ি/ে/ৈ) typed before the consonant back to after it.
    if (i < s.length - 1 && IsBanglaPreKar(s.charAt(i))) {
      let vowel = s.charAt(i);
      let j = 1;

      // Skip ignorable characters (ZWJ, ZWNJ, NBSP) before the consonant
      while (i + j < s.length && /[\u200C\u200D\u00A0]/.test(s.charAt(i + j))) {
        j++;
      }

      if (i + j < s.length && (IsBanglaBanjonborno(s.charAt(i + j)) || IsBanglaOther(s.charAt(i + j)))) {
        // Find the end of the consonant cluster
        let k = i + j;
        while (k + 1 < s.length) {
          let next = s.charAt(k + 1);
          if (/[\u09BC\u0981\u200C\u200D\u00A0]/.test(next)) {
            k++;
          } else if (IsBanglaHalant(next)) {
            let lookahead = k + 2;
            // Skip invisible chars between hasant and next consonant
            while (lookahead < s.length && /[\u200C\u200D\u00A0]/.test(s.charAt(lookahead))) {
              lookahead++;
            }
            if (lookahead < s.length && IsBanglaBanjonborno(s.charAt(lookahead))) {
              k = lookahead;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        let skip = 0;
        // Handle o-kar (e + cluster + a) and au-kar (e + cluster + au)
        if (vowel === "ে") {
          let lookahead = k + 1;
          while (lookahead < s.length && /[\u200C\u200D\u00A0]/.test(s.charAt(lookahead))) {
            lookahead++;
          }
          if (lookahead < s.length) {
            if (s.charAt(lookahead) === "া") {
              vowel = "ো";
              skip = lookahead - k;
            } else if (s.charAt(lookahead) === "ৗ") {
              vowel = "ৌ";
              skip = lookahead - k;
            }
          }
        }

        let temp = s.substring(0, i) + s.substring(i + 1, k + 1) + vowel + s.substring(k + 1 + skip);
        s = temp;
        i = (s.substring(0, i) + s.substring(i + 1, k + 1) + vowel).length - 1;
        continue;
      }
    }

    // Chandrabindu should follow, not precede, a post-base vowel sign.
    if (i < s.length - 1 && IsBanglaChandrabindu(s.charAt(i)) && IsBanglaPostKar(s.charAt(i + 1))) {
      let temp = s.substring(0, i);
      temp += s.charAt(i + 1);
      temp += s.charAt(i);
      temp += s.substring(i + 2);
      s = temp;
    }
  }

  // Final cleanup: remove double hasants and orphaned hasants (which cause dotted circles)
  s = s.replace(/্+/g, "্");
  s = s.replace(/্(?![ \u0995-\u09B9\u09DC\u09DD\u09DF\u200C\u200D])/g, "");

  return s;
}

export function cleanupOrphanedVowels(text: string): string {
  if (!text) return "";
  let s = text;

  // 1. Swap Anusvar and trailing vowel sign (e.g. "লংিক" -> "লিংক", "সংিক" -> "সিংক")
  s = s.replace(/([\u0995-\u09B9\u09DC\u09DD\u09DF])\u0982([\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC])/g, '$1$2\u0982');

  // 2. Fix "দিয়ো" / "দিয়ো" -> "দিয়ে" / "দিয়ে"
  s = s.replace(/\b(দিয়ো|দিয়ো)\b/g, 'দিয়ে');

  // 3. Remove space between consonant and attached vowel sign/kar (e.g. "কর ো" -> "করো", "বল ে" -> "বলে")
  s = s.replace(/([\u0995-\u09B9\u09DC\u09DD\u09DF])\s+([\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC\u09CD])/g, '$1$2');

  // 4. Fix vowel sign separated from consonant by punctuation (e.g. "বনা;ে" -> "বনাে;", "ইত্যাদি ।ি" -> "ইত্যাদি।")
  s = s.replace(/([\u0995-\u09B9\u09DC\u09DD\u09DF])([;,\.\?!\:\-।])\s*([\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC])/g, '$1$3$2');

  // 5. Remove any vowel sign attached directly after punctuation (e.g. "ইত্যাদি।ি" -> "ইত্যাদি।")
  s = s.replace(/([;,\.\?!\:\-।\(\)\[\]\{\}])[\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC\u09CD]+/g, '$1');

  // 6. Remove orphaned vowel signs preceded by space/punctuation/start of string without a Bengali consonant
  s = s.replace(/(?:^|[\s;,\.\?!\:\-।\(\)\[\]\{\}<>])[\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC]+/g, (match) => {
    return match.replace(/[\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC]+/g, '');
  });

  // 7. Collapse duplicate consecutive vowel signs (e.g. "িি" -> "ি", "েে" -> "ে")
  s = s.replace(/([\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC])\1+/g, '$1');

  return s;
}

const ENGLISH_KEYWORDS_SET = new Set([
  'float', 'double', 'char', 'int', 'long', 'short', 'void', 'struct', 'union', 'typedef',
  'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'return', 'break', 'continue',
  'include', 'stdio.h', 'main', 'printf', 'scanf', 'string', 'bool', 'boolean', 'class',
  'public', 'private', 'protected', 'import', 'export', 'byte', 'bytes', 'bit', 'bits',
  'memory', 'tag', 'tags', 'element', 'empty', 'container', 'close', 'closing',
  'gk', 'ict', 'mcq', 'exam', 'weekly', 'set', 'set-a', 'set-b', 'set-c', 'set-d',
  'page', 'no', 'offline', 'online', 'subjective', 'objective', 'vap-kha',
  'html', 'css', 'js', 'url', 'ip', 'tcp', 'udp', 'http', 'https', 'ftp', 'ram', 'rom', 'cpu', 'alu', 'bios', 'os',
  'letter', 'letters', 'link', 'links', 'code', 'src', 'href', 'img', 'br', 'hr', 'input', 'body', 'head', 'title',
  'c', 'a', 'b', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'www.bangladesh.gov.bd'
]);

export function isEnglishOrCodeToken(str: string): boolean {
  if (!str) return false;
  let trimmed = str.trim();
  if (!trimmed) return false;

  // 1. HTML tags: e.g. <br>, <html>, <body>, <p>, <img>, </p>, etc.
  if (/^<[a-zA-Z0-9\/_\-\=\s"'%]+>$/i.test(trimmed)) return true;

  // 2. URLs / Domains: e.g. www.bangladesh.gov.bd, http://...
  if (/^(?:https?:\/\/|www\.)[a-zA-Z0-9\.\-_]+/i.test(trimmed)) return true;
  if (/^[a-zA-Z0-9\.\-_]+\.(com|org|net|gov|edu|bd|io|co)$/i.test(trimmed)) return true;

  // 3. Math symbols / equations / operators
  if (/^[\=\⇒\∴\≠\≤\≥\√\π\∞\∠\∆\∑\∫\+\-\*\/\%\×\÷\±\°]+$/.test(trimmed)) return true;

  // Strip leading/trailing punctuation/brackets/quotes
  let core = trimmed.replace(/^[\s\p{P}\p{S}\u0964\u0965]+|[\s\p{P}\p{S}\u0964\u0965]+$/gu, '');
  if (!core) return true; // pure punctuation/numbers

  let lowerCore = core.toLowerCase();

  // 4. Explicit known English tech / programming / exam keywords or single English option letters
  if (ENGLISH_KEYWORDS_SET.has(lowerCore)) return true;

  // 5. Standalone English numbers or alphanumeric codes (like Set-A, Exam-15, GK-03, 2026, 2nd, 01, 02)
  if (/^[a-zA-Z0-9\-\.\_]+$/.test(core)) {
    // If it contains numbers mixed with English letters (like 2nd, GK-03, Exam-15, Set-A, VAP-KHA)
    if (/[0-9]/.test(core) && /[a-zA-Z]/.test(core)) return true;
    // If it's a pure number like 01, 02, 1, 4, 8, 10
    if (/^[0-9]+$/.test(core)) return true;
  }

  // 6. Check if it contains Bijoy-specific non-ASCII characters
  if (/[†ˆ‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏØ™¢ÙÜßáäå¤¶º»¿ÀÇÈÍÐÑÒÓÔÕÖÚÛÝÞàâãæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(core)) {
    return false; // Definitely Bijoy
  }

  return false;
}

function convertBijoyTokenToUnicode(text: string): string {
  let n = normalizeBengaliNukta(text);

  n = n.split("†").join("‡").split("ˆ").join("‰");

  n = n.replace(/ +/g, " ");
  n = n.split("yy").join("y").split("vv").join("v");
  n = n.split("y&").join("y").split("„&").join("„");
  n = n.split("‡u").join("u‡").split("wu").join("uw");

  n = replaceAll(n, bijoy2uniRoFolaPatterns);
  n = replaceAll(n, bijoy2uniKarPatterns);
  n = replaceAll(n, bijoy2uniMainPatterns);

  n = reArrangeBijoyToUnicode(n);

  n = n.split("্্").join("্");
  n = n.split("অা").join("আ");
  n = n.replace(/\u200D/g, "");

  return n;
}

export function bijoyToUnicode(text: string): string {
  if (!text) return "";

  // If text contains HTML tags, URLs, spaces, or is long, process token by token
  if (/[\s<>]/g.test(text) || text.length > 20) {
    const parts = text.split(/(<[a-zA-Z0-9\/_\-\=\s"'%]+>|(?:https?:\/\/|www\.)[a-zA-Z0-9\.\-_]+|\s+)/gi);
    const convertedParts = parts.map(part => {
      if (!part) return "";
      if (/^\s+$/.test(part)) return part;
      if (/^<[a-zA-Z0-9\/_\-\=\s"'%]+>$/i.test(part)) return part;
      if (/^(?:https?:\/\/|www\.)[a-zA-Z0-9\.\-_]+/i.test(part)) return part;
      if (isEnglishOrCodeToken(part)) return part;

      return convertBijoyTokenToUnicode(part);
    });

    return cleanupOrphanedVowels(convertedParts.join(''));
  }

  if (isEnglishOrCodeToken(text)) {
    return text;
  }

  return cleanupOrphanedVowels(convertBijoyTokenToUnicode(text));
}

export function normalizeUnicode(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u09CD\u09CD/g, "\u09CD")
    .replace(/অা/g, "আ")
    .replace(/\u200D/g, "");
}

export function isBijoyText(text: string): boolean {
  if (!text) return false;
  // If text contains Bengali Unicode characters or punctuation, it is Unicode, NOT Bijoy
  if (/[\u0964\u0965\u0980-\u09FF\?\!\,\;\:]/.test(text)) return false;

  // If text is primarily standard math / English expression (e.g. contains =>, ∴, ⇒, ×, ÷, =, +, -, *, /), do not treat as Bijoy
  if (/[\=\⇒\∴\≠\≤\≥\√\π\∞\∠\∆\∑\∫]/.test(text)) return false;
  if (/^[\s0-9a-zA-Z\+\-\*\/\=\%\(\)\[\]\{\}\<\>\.\,\:\;\!\?\_\–\—\×\÷\±\°\∠\$\#\^\&\*\®\©\™\⇒\∴]+$/.test(text)) return false;

  // True Bijoy ANSI font text contains specific SutonnyMJ glyphs
  return /[‡‰ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏØ™¢ÙÜßáäå¤¶º»]/.test(text);
}

export function convertToEnglishDigits(str: string): string {
  if (!str) return "";
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.split('').map(char => {
    let idx = bengaliDigits.indexOf(char);
    return idx !== -1 ? String(idx) : char;
  }).join('');
}

export function isEnglishWord(str: string, customDictStr: string = ""): boolean {
  if (!str) return false;
  let trimmed = str.trim();
  if (!trimmed) return false;

  if (customDictStr) {
    let customDict = customDictStr.split(/[\s,]+/).filter(Boolean);
    if (customDict.includes(trimmed)) return true;
  }

  // Strip leading and trailing punctuation, dandi (\u0964, \u0965), and whitespace to find the core word
  let core = trimmed.replace(/^[\s\p{P}\p{S}\u0964\u0965]+|[\s\p{P}\p{S}\u0964\u0965]+$/gu, '');
  if (!core) {
    return /^[0-9\.\,\?\!\:\;\-\/\(\)\[\]\{\}\@\%\&\*\+\=\_\'\"\`\~\<\>\|\°\∠\$\#\^\&\*\®\©\™\–\—\⇒\∴\×\÷\±\≠\≤\≥\≈\∞\π\θ\α\β\γ\δ\Δ\λ\μ\σ\ω\∑\∫\√\²\³\¹\⁰\ⁿ\₁\₂\₃\₀\ₙ\s\u0964\u0965]+$/.test(trimmed);
  }

  // If core contains any Bengali characters, it is not English
  if (/[\u0980-\u09FF]/.test(core)) {
    return false;
  }

  // If it contains Bijoy ANSI specific characters, it is not English (excluding Unicode math operators like × and ÷)
  if (/[ÿ¼½¾ÁÂÃÄÅÆÉÊËÌÎÏØ™¢ÙÜßáäå¤§©®¯°±³µ¶º»¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ‡‰†šÍ¨]/.test(core)) {
    return false;
  }

  // If core contains at least one Latin letter, or alphanumeric/symbols
  if (/[a-zA-Z]/.test(core)) {
    return true;
  }

  // If it consists entirely of digits / standard ASCII & math symbols / LaTeX characters
  if (/^[0-9\.\,\?\!\:\;\-\/\(\)\[\]\{\}\@\%\&\*\+\=\_\'\"\`\~\<\>\|\°\∠\$\#\^\&\*\®\©\™\–\—\⇒\∴\×\÷\±\≠\≤\≥\≈\∞\π\θ\α\β\γ\δ\Δ\λ\μ\σ\ω\∑\∫\√\²\³\¹\⁰\ⁿ\₁\₂\₃\₀\ₙ\s]+$/.test(core)) {
    return true;
  }

  return false;
}

export function formatHtmlTextPiece(text: string, fontType: 'SolaimanLipi' | 'SutonnyMJ', customDictStr: string = ""): string {
  if (!text) return "";

  // Helper to format a plain string segment (free of HTML tags)
  const formatPlainString = (str: string): string => {
    if (!str) return "";
    let tokens = str.split(/(\s+)/);
    return tokens.map(token => {
      if (!token.trim()) return token;
      if (isEnglishWord(token, customDictStr)) {
        return `<span class="eng-text" style="font-family: 'Times New Roman', serif; mso-ascii-font-family: 'Times New Roman'; mso-hansi-font-family: 'Times New Roman'; mso-bidi-font-family: 'Times New Roman';">${token}</span>`;
      } else if (/[\u0980-\u09FF]/.test(token) && /[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]/.test(token)) {
        let subParts = token.split(/([a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+)/);
        return subParts.map(part => {
          if (!part) return "";
          if (isEnglishWord(part, customDictStr) || /^[a-zA-Z0-9\.\-_/@#\+\:\~\×\÷\=\±]+$/.test(part)) {
            return `<span class="eng-text" style="font-family: 'Times New Roman', serif; mso-ascii-font-family: 'Times New Roman'; mso-hansi-font-family: 'Times New Roman'; mso-bidi-font-family: 'Times New Roman';">${part}</span>`;
          } else if (/[\u0980-\u09FF]/.test(part)) {
            if (fontType === 'SutonnyMJ') {
              return `<span class="bijoy-text" style="font-family: 'SutonnyMJ', sans-serif; mso-ascii-font-family: 'SutonnyMJ'; mso-hansi-font-family: 'SutonnyMJ'; mso-bidi-font-family: 'SutonnyMJ'; mso-cs-font-family: 'SutonnyMJ';">${unicodeToBijoy(part)}</span>`;
            } else {
              return `<span class="ben-text" style="font-family: 'SolaimanLipi', 'Solaiman Lipi', sans-serif; mso-ascii-font-family: 'SolaimanLipi'; mso-hansi-font-family: 'SolaimanLipi'; mso-bidi-font-family: 'SolaimanLipi';">${part}</span>`;
            }
          } else {
            return `<span class="eng-text" style="font-family: 'Times New Roman', serif; mso-ascii-font-family: 'Times New Roman'; mso-hansi-font-family: 'Times New Roman'; mso-bidi-font-family: 'Times New Roman';">${part}</span>`;
          }
        }).join('');
      } else {
        if (fontType === 'SutonnyMJ') {
          return `<span class="bijoy-text" style="font-family: 'SutonnyMJ', sans-serif; mso-ascii-font-family: 'SutonnyMJ'; mso-hansi-font-family: 'SutonnyMJ'; mso-bidi-font-family: 'SutonnyMJ'; mso-cs-font-family: 'SutonnyMJ';">${unicodeToBijoy(token)}</span>`;
        } else {
          return `<span class="ben-text" style="font-family: 'SolaimanLipi', 'Solaiman Lipi', sans-serif; mso-ascii-font-family: 'SolaimanLipi'; mso-hansi-font-family: 'SolaimanLipi'; mso-bidi-font-family: 'SolaimanLipi';">${token}</span>`;
        }
      }
    }).join('');
  };

  // If text contains HTML tags (such as <u>, </u>, <ins>, <b>, <i>, <mark>, <span...>, <div...>, etc.), split by HTML tags
  if (/<[a-zA-Z\/][^>]*>/i.test(text)) {
    const parts = text.split(/(<\/?[a-zA-Z0-9\:-]+(?:\s+[^>]*?)?>)/gi);
    return parts.map(part => {
      if (!part) return "";
      if (/^<\/?[a-zA-Z0-9\:-]+(?:\s+[^>]*?)?>$/i.test(part)) {
        if (/^<u\b/i.test(part) || /^<ins\b/i.test(part)) {
          return '<u style="text-decoration: underline;">';
        }
        if (/^<\/u>/i.test(part) || /^<\/ins>/i.test(part)) {
          return '</u>';
        }
        return part;
      }
      return formatPlainString(part);
    }).join('');
  }

  return formatPlainString(text);
}
