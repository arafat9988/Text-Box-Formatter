import { isEnglishWord } from "./src/utils/bijoy.ts";

function isEng(trimmed: string) {
  let core = trimmed.replace(/^[\s\p{P}\p{S}\u0964\u0965]+|[\s\p{P}\p{S}\u0964\u0965]+$/gu, '');
  if (!core) {
    if (/[\u0964\u0965]/.test(trimmed)) return false;
    if (/^[\x20-\x7E]+$/.test(trimmed)) return true;
    return false;
  }
  return true; // Mock for other logic
}

console.log("____? :", isEng("____?"));
console.log("? :", isEng("?"));
console.log("। :", isEng("।"));
