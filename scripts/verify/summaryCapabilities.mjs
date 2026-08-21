// The pattern pairs the store-listing check uses to prove no summary quietly lost a
// capability. Kept in its own module so the tests can import the table without running
// the checker, and so a new locale that arrives without an entry fails loudly.
//
// Anchor on the posting verb wherever the language has one. A bare noun keeps matching
// after the capability is demoted from posting to reading, which is exactly the rewrite
// that defeated an earlier version of this table in five locales out of five.

/** English needs the verb to govern the noun: "read comments" must not satisfy it. */
const POSTS_A_COMMENT = /\b(?:post|write|send|type)(?:s|ing)?\s+(?:a\s+|your\s+|new\s+)?comments?\b/i

export const SUMMARY_CAPABILITIES = {
  fr: [/\bcomment(?:ez|er|es|e|ons|ent|aires?)\b/i, /super[\s-]?chat/i],
  it: [/\bcomment(?:a|are|i|ate|ando|o)\b/i, /super[\s-]?chat/i],
  es: [/\bcoment(?:a|ar|as|an|ando|arios?)\b/i, /super[\s-]?chat/i],
  es_419: [/\bcoment(?:a|ar|as|an|ando|arios?)\b/i, /super[\s-]?chat/i],
  pt_PT: [/\bcoment(?:e|a|ar|em|ando|[áa]rios?)\b/i, /super[\s-]?chat/i],
  pt_BR: [/\bcoment(?:e|a|ar|em|ando|[áa]rios?)\b/i, /super[\s-]?chat/i],
  ca: [/\bcoment(?:a|ar|i|eu|aris?)\b/i, /super[\s-]?chat/i],
  ro: [/\bcoment(?:arii|ariu|ariile|ariul|eaz|ezi)/i, /super[\s-]?chat/i],
  de: [/komment(ar|ier)/i, /super[\s-]?chat/i],
  nl: [/reage(er|ren)|reactie/i, /super[\s-]?chat/i],
  sv: [/komment(ar|er)/i, /super[\s-]?chat/i],
  da: [/komment(ar|er)/i, /super[\s-]?chat/i],
  no: [/komment(ar|er)/i, /super[\s-]?chat/i],
  fi: [/komment/i, /super[\s-]?chat/i],
  et: [/komment(aar|eeri)/i, /super[\s-]?chat/i],
  hu: [/hozzászól|komment/i, /super[\s-]?chat/i],
  ru: [/коммент/i, /super\s*chat/i],
  uk: [/комент/i, /super\s*chat/i],
  sr: [/комент/i, /super\s*chat/i],
  hr: [/koment/i, /super\s*chat/i],
  sl: [/koment/i, /super\s*chat/i],
  lt: [/koment/i, /super\s*chat/i],
  lv: [/koment/i, /super\s*chat/i],
  bg: [/комент/i, /super\s*chat/i],
  pl: [/koment/i, /super\s*chat/i],
  cs: [/koment/i, /super\s*chat/i],
  sk: [/koment/i, /super\s*chat/i],
  el: [/σχ[οό]λ[ιί]/i, /super\s*chat/i],
  tr: [/\byorum/i, /super\s*chat/i],
  sw: [/toa\s+maoni/i, /super\s*chat/i],
  fil: [/koment/i, /super\s*chat/i],
  am: [/አስተያየ/i, /super\s*chat/i],
  th: [/คอมเมนต์|พิมพ์ตอบ/i, /super\s*chat/i],
  vi: [/bình\s*luận/i, /super\s*chat/i],
  id: [/komentar|balas/i, /super\s*chat/i],
  ms: [/komen|balas/i, /super\s*chat/i],
  hi: [/क(?:ॉ)?मे(?:ं|न्)ट|टिप्पण/i, /super\s*chat/i],
  bn: [/মন্তব্য|কমেন্ট/i, /super\s*chat/i],
  ta: [/கருத்த|கமெண்ட/i, /super\s*chat/i],
  te: [/క(?:ా)?మెంట|వ్యాఖ్య/i, /super\s*chat/i],
  ml: [/കമ[നൻ]്റ/i, /super ?chat/i],
  kn: [/ಕಾಮೆಂಟ/i, /super ?chat/i],
  gu: [/ટિપ્પણ/i, /super ?chat/i],
  mr: [/टिप्पण/i, /super ?chat/i],
  ja: [/コメント/i, /スーパーチャット|スパチャ/i],
  ko: [/댓글/i, /슈퍼챗|super ?chat/i],
  zh_CN: [/评论|发(送|表)?留言/i, /super ?chat|超级留言/i],
  zh_TW: [/評論|發(送|表)?(訊息|留言)/i, /super ?chat|超級留言/i],
  ar: [/تعليق/i, /super\s*chat/i],
  he: [/כתב/i, /super\s*chat/i],
  fa: [/نظر[\s\S]{0,40}بفرست/i, /super\s*chat/i],
  en: [POSTS_A_COMMENT, /super\s*chats?/i],
  en_US: [POSTS_A_COMMENT, /super\s*chats?/i],
  en_GB: [POSTS_A_COMMENT, /super\s*chats?/i],
  en_AU: [POSTS_A_COMMENT, /super\s*chats?/i],
}
