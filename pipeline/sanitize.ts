const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** "twenty-one" -> 21, "seven" -> 7; undefined when the word is not a number under 100. */
function wordToNumber(word: string): number | undefined {
  const [a, b] = word.toLowerCase().split("-");
  if (b === undefined) {
    const one = ONES.indexOf(a);
    if (one >= 0) return one;
    const ten = TENS.indexOf(a);
    return ten >= 2 ? ten * 10 : undefined;
  }
  const ten = TENS.indexOf(a);
  const one = ONES.indexOf(b);
  return ten >= 2 && one >= 1 && one <= 9 ? ten * 10 + one : undefined;
}

const NUMBER_WORD = `(?:${TENS.slice(2).join("|")})(?:-(?:${ONES.slice(1, 10).join("|")}))?|${ONES.join("|")}`;
const COUNT_NOUN = "people|persons?|comments?|reactions?|stars?|forks?|users?|participants?|requesters?|maintainers?";
// A number word right before a count noun (not a possessive such as "one user's").
const SPELLED_COUNT = new RegExp(`\\b(${NUMBER_WORD})\\s+(${COUNT_NOUN})\\b(?!')`, "gi");

/**
 * House style for model text: no em dashes (replaced with a comma), counts written as digits
 * ("Two people" -> "2 people"; the model tends to spell out a count at the start of a reason), trimmed.
 */
export function cleanText(s: string): string {
  return s
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(SPELLED_COUNT, (match, word: string, noun: string) => {
      const n = wordToNumber(word);
      return n === undefined ? match : `${n} ${noun}`;
    })
    .trim();
}
