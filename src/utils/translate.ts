/**
 * Translation logic for Tab 4 (Version) using Gemini API backend & local smart parser
 */

export async function translateBengaliToEnglish(benText: string): Promise<string> {
  if (!benText || !benText.trim()) return "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch("/api/translate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: benText }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && data.translation) {
        return data.translation;
      }
    } else {
      console.warn("Translation API returned non-JSON or non-ok status, using local fallback.");
    }
  } catch (err) {
    console.warn("Backend translation endpoint failed or timed out, using smart parser fallback:", err);
  }

  // Fallback: Smart local rule-based translation & option converter
  return localRuleBasedTranslate(benText);
}

export function localRuleBasedTranslate(benText: string): string {
  if (!benText) return "";

  const commonWords: [RegExp, string][] = [
    [/ব্যাখ্যা\s*:/gi, "Explanation:"],
    [/উত্তরের ব্যাখ্যা\s*:/gi, "Explanation:"],
    [/সঠিক উত্তর\s*:/gi, "Correct Answer:"],
    [/আমাদের দেশের নাম কী\?/g, "What is the name of our country?"],
    [/আমাদের দেশের নাম কী/g, "What is the name of our country?"],
    [/আমাদের দেশের নাম/g, "the name of our country"],
    [/আমাদের দেশের/g, "of our country"],
    [/বাংলাদেশের/g, "Bangladesh's"],
    [/বাংলাদেশ/g, "Bangladesh"],
    [/প্রথম ও একমাত্র/g, "first and only"],
    [/ক্রিকেটার হিসেবে/g, "as a cricketer"],
    [/ক্রিকেটার/g, "cricketer"],
    [/শততম টেস্ট/g, "100th Test"],
    [/টেস্ট খেলার/g, "playing Test"],
    [/টেস্ট ম্যাচটি/g, "Test match"],
    [/গৌরব অর্জন করেছেন/g, "achieved the milestone of"],
    [/মুশফিকুর রহিম/g, "Mushfiqur Rahim"],
    [/মুশফিকুর/g, "Mushfiqur"],
    [/রহিম/g, "Rahim"],
    [/তিনি/g, "He"],
    [/সালের/g, "year's"],
    [/নভেম্বরে/g, "in November"],
    [/মিরপুর/g, "Mirpur"],
    [/শেরেবাংলা/g, "Sher-e-Bangla"],
    [/জাতীয়|জাতীয়/g, "National"],
    [/ক্রিকেট/g, "Cricket"],
    [/স্টেডিয়ামে|স্টেডিয়ামে/g, "Stadium"],
    [/আয়ারল্যান্ডের|আয়ারল্যান্ডের/g, "Ireland's"],
    [/বিপরুদ্ধে|বিরুদ্ধে|বিপক্ষে/g, "against"],
    [/নিজের ক্যারিয়ারের|নিজের ক্যরিয়ারের/g, "of his career"],
    [/এই ঐতিহাসিক/g, "this historic"],
    [/শততম/g, "100th"],
    [/খেলেন/g, "played"],
    [/ম্যাচটি/g, "match"],
    [/খেলার/g, "playing"],
    [/বাংলা সাহিত্যে/g, "In Bengali Literature"],
    [/সাহিত্যসম্রাট/g, "Literary Emperor"],
    [/হিসেবে/g, "as"],
    [/কে পরিচিত\?/g, "who is known?"],
    [/রবীন্দ্রনাথ ঠাকুর/g, "Rabindranath Tagore"],
    [/বঙ্কিমচন্দ্র চট্টোপাধ্যায়|বঙ্কিমচন্দ্র চট্টোপাধ্যায়/g, "Bankim Chandra Chattopadhyay"],
    [/বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের|বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের/g, "Bankim Chandra Chattopadhyay's"],
    [/মানিক বন্দ্যোপাধ্যায়|মানিক বন্দ্যোপাধ্যায়/g, "Manik Bandyopadhyay"],
    [/ঈশ্বরচন্দ্র বিদ্যাসাগর/g, "Ishwar Chandra Vidyasagar"],
    [/মুক্তিযুদ্ধের সময়ে|মুক্তিযুদ্ধের সময়/g, "during the Liberation War"],
    [/চীনের প্রেসিডেন্ট কে ছিলেন।/g, "who was the President of China?"],
    [/চীনের প্রেসিডেন্ট কে ছিলেন\?/g, "who was the President of China?"],
    [/রাজনৈতিক/g, "territorial"],
    [/সমুদ্রসীমা/g, "maritime boundary"],
    [/কত নটিক্যাল মাইল\?/g, "how many nautical miles?"],
    [/নটিক্যাল মাইল/g, "nautical miles"],
    [/একচেটিয়া অর্থনৈতিক অঞ্চল/g, "Exclusive Economic Zone (EEZ)"],
    [/আন্তর্জাতিক আদালত/g, "International Tribunal"],
    [/রায় অনুযায়ী|রায় অনুযায়ী/g, "according to verdict"],
    [/প্রথম নারী/g, "first woman"],
    [/হাইকোর্টের বিচারপতি/g, "High Court Judge"],
    [/রেল চালক/g, "Railway Driver"],
    [/জাতীয় অধ্যাপক/g, "National Professor"],
    [/বাংলা একাডেমির পরিচালক/g, "Director of Bangla Academy"],
    [/কাবিওয়ালা|কবিওয়ালা|কবিওয়ালা/g, "Poet Singer (Kabiwala)"],
    [/পুস্তক ব্যবসায়ী|পুস্তক ব্যবসায়ী/g, "Book Trader"],
    [/যাত্রাওয়ালা/g, "Jatra Actor"],
    [/মুদ্রাকর/g, "Printer"],
    [/মানুষের মঙ্গল/g, "Human welfare"],
    [/অথবা/g, "or"],
    [/সৌন্দর্য সৃষ্টি/g, "creation of beauty"],
    [/ব্যতিরেকে/g, "apart from"],
    [/যারা অন্য উদ্দেশ্যে লিখে থাকেন/g, "those who write for other purposes"],
    [/মতে/g, "according to"],
    [/তারা কাদের সঙ্গে তুলনীয়\?/g, "who are they comparable to?"],
    [/সকল অলংকারের শ্রেষ্ঠ অলংকার/g, "the best ornament among all ornaments"],
    [/সরলতা/g, "simplicity"],
    [/সৌন্দর্য/g, "beauty"],
    [/সম্প্রীতি/g, "harmony"],
    [/সাহস/g, "courage"],
    [/লেখকের পক্ষে অবনতিকর কোনটি\?/g, "which is degrading for a writer?"],
    [/সাময়িক সাহিত্য/g, "periodical literature"],
    [/লোকরঞ্জন-প্রবৃত্তি/g, "popular-pleasing tendency"],
    [/যশাকাঙ্ক্ষা/g, "desire for fame"],
    [/অনুকরণ/g, "imitation"],
    [/সাহিত্যধর্মী রচনা/g, "literary composition"],
    [/কত বছর ফেলে রেখে/g, "how many years left aside"],
    [/সংশোধন করলে/g, "when revised"],
    [/উৎকর্ষ লাভ করে\?/g, "achieves excellence?"],
    [/দুই-এক বছর/g, "one or two years"],
    [/দুই-তিন বছর/g, "two or three years"],
    [/তিন-চার বছর/g, "three or four years"],
    [/চার-পাঁচ বছর/g, "four or five years"],
    [/সাহিত্যমুকুট/g, "Literary Crown"],
    [/সাহিত্যপ্রভা/g, "Literary Light"],
    [/নাজমুন আরা সুলতানা/gi, "Nazmun Ara Sultana"],
    [/আমাদের দেশের মাটির ভেতরে থাকে।/g, "Stays inside the soil of our country."],
    [/আমাদের দেশের মাটির ভেতরে থাকে/g, "Stays inside the soil of our country"],
    [/কোনটি\?/g, "Which one?"],
    [/কোনটি/g, "Which one"],
    [/কোন শব্দগুচ্ছ সমার্থক\?/g, "Which set of words are synonymous?"],
    [/ভিন্নার্থক শব্দযুগল কোনটি\?/g, "Which pair of words has different meanings?"],
    [/বাংলাদেশের প্রথম নারী/gi, "first female of Bangladesh"],
    [/বাংলাদেশ প্রথম নারী/gi, "first female of Bangladesh"],
    [/বাংলাদেশের|বাংলাদেশ-এর/gi, "of Bangladesh"],
    [/বাংলাদেশ/gi, "Bangladesh"],
    [/জাতীয় অধ্যাপক|জাতীয় অধ্যাপক/gi, "National Professor"],
    [/জাতীয়|জাতীয়/gi, "National"],
    [/অধ্যাপক/gi, "Professor"],
    [/বিচারপতি/gi, "Justice"],
    [/হাইকোর্টের|হাইকোর্ট/gi, "High Court"],
    [/পরিচালক/gi, "Director"],
    [/রেল চালক|রেলচালক/gi, "Railway Driver"],
    [/রেল/gi, "Railway"],
    [/চালক/gi, "Driver"],
    [/প্রথম/gi, "first"],
    [/নারী/gi, "female"],
    [/বাংলা একাডেমি|বাংলা একাডেমির/gi, "Bangla Academy"],
    [/একাডেমি|একাডেমির/gi, "Academy"]
  ];

  let lines = benText.split('\n');
  let translatedLines = lines.map(line => {
    let cleanLine = line.trim();
    if (!cleanLine) return "";

    // Replace Option prefixes (ক) -> (a), (খ) -> (b), (গ) -> (c), (ঘ) -> (d)
    let formattedLine = cleanLine.replace(/[\(\（]?([ক-ঘa-d])[\)\）\.\-\:]\s*/gi, (match, char) => {
      let lower = char.toLowerCase();
      let mapChar = ({'ক': 'a', 'খ': 'b', 'গ': 'c', 'ঘ': 'd', 'a':'a', 'b':'b', 'c':'c', 'd':'d'} as Record<string, string>)[lower] || lower;
      return `(${mapChar}) `;
    });

    // Replace Bengali numbers at line start: ০১. -> 01., ০২. -> 02.
    formattedLine = formattedLine.replace(/^([০-৯]+)[\.\।]?/g, (m, digits) => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      let eng = digits.split('').map((d: string) => bengaliDigits.indexOf(d) !== -1 ? bengaliDigits.indexOf(d) : d).join('');
      if (eng.length === 1) eng = '0' + eng;
      return `${eng}.`;
    });

    // Replace Bengali numbers throughout line
    formattedLine = formattedLine.replace(/[০-৯]/g, (digit) => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      let idx = bengaliDigits.indexOf(digit);
      return idx !== -1 ? String(idx) : digit;
    });

    for (let [pattern, replacement] of commonWords) {
      formattedLine = formattedLine.replace(pattern, replacement);
    }

    // Clean remaining possessive 'এর like Chattopadhyay'এর -> Chattopadhyay's
    formattedLine = formattedLine.replace(/([a-zA-Z]+)['’]এর/g, "$1's");

    return formattedLine;
  });

  return translatedLines.join('\n');
}
