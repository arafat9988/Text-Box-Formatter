import { unicodeToBijoy, formatHtmlTextPiece } from "./src/utils/bijoy";

const test1 = "‘দ্বীপ’";
console.log("unicodeToBijoy(‘দ্বীপ’):", unicodeToBijoy(test1));

const test2 = "“বাংলাদেশ”";
console.log("unicodeToBijoy(“বাংলাদেশ”):", unicodeToBijoy(test2));

console.log("formatHtmlTextPiece('‘দ্বীপ’', 'SolaimanLipi'):", formatHtmlTextPiece(test1, 'SolaimanLipi'));
console.log("formatHtmlTextPiece('‘দ্বীপ’', 'SutonnyMJ'):", formatHtmlTextPiece(test1, 'SutonnyMJ'));
