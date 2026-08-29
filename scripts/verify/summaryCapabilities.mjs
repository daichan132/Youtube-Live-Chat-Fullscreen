// The pattern pairs the store-listing check uses to prove no summary quietly lost a
// capability. Kept in its own module so the tests can import the table without running
// the checker, and so a new locale that arrives without an entry fails loudly.
//
// Anchor on the posting verb wherever the language has one. A bare noun keeps matching
// after the capability is demoted from posting to reading, which is exactly the rewrite
// that defeated an earlier version of this table in five locales out of five.
//
// Anchor on the right OBJECT too. Every locale's word for the comment section under the
// video — comment, コメント's cousins, komentar, yorum, bình luận, 댓글 — names a surface
// this extension never reaches; the overlay posts a live chat message. A row that accepts
// the comment-section noun pins the wrong surface in place, because correcting the copy
// then breaks the check. Match the reply/send verb governing the message object, and do
// not keep the comment noun as an accepted branch.

/** English needs the verb: "read messages" and "post comments" must both fail. */
const POSTS_A_MESSAGE = /\b(?:repl(?:y|ies|ying)|(?:post|write|send|type)(?:s|ing)?\s+(?:a\s+|your\s+|new\s+)?messages?)\b/i

export const SUMMARY_CAPABILITIES = {
  fr: [/\brépond(?:ez|re|s|ons)\b/i, /super[\s-]?chat/i],
  it: [/\brispond(?:i|e|ere|ete)\b/i, /super[\s-]?chat/i],
  es: [/\brespond(?:e|es|er|an)\b/i, /super[\s-]?chat/i],
  es_419: [/\brespond(?:e|es|er|an)\b/i, /super[\s-]?chat/i],
  pt_PT: [/\brespond(?:a|e|er|am)\b/i, /super[\s-]?chat/i],
  pt_BR: [/\brespond(?:a|e|er|am)\b/i, /super[\s-]?chat/i],
  ca: [/\brespon(?:s|eu|dre)?\b/i, /super[\s-]?chat/i],
  ro: [/\br[ăa]spund(?:e|i|em|eți)\b/i, /super[\s-]?chat/i],
  de: [/\bantwort(?:e|est|et|en)\b/i, /super[\s-]?chat/i],
  nl: [/\breage(?:er|ert|ren)\b/i, /super[\s-]?chat/i],
  sv: [/\bsvarar?\b/i, /super[\s-]?chat/i],
  da: [/\bsvar(?:er)?\b/i, /super[\s-]?chat/i],
  no: [/\bsvar(?:er)?\b/i, /super[\s-]?chat/i],
  fi: [/\bvastaat?\b/i, /super[\s-]?chat/i],
  et: [/\bvasta(?:d|ta)?\b/i, /super[\s-]?chat/i],
  hu: [/írj\s+hozzászól|hozzászólsz/i, /super[\s-]?chat/i],
  ru: [/отвеча(?:йте|ете)/i, /super\s*chat/i],
  uk: [/відповіда(?:йте|єте)/i, /super\s*chat/i],
  sr: [/одговар(?:ајте|ај|аш)/i, /super\s*chat/i],
  hr: [/odgovar(?:aj|aš|ati)/i, /super\s*chat/i],
  sl: [/odgovar(?:jaj|jaš)|odgovori/i, /super\s*chat/i],
  lt: [/atsak(?:ykite|ote|yti)/i, /super\s*chat/i],
  lv: [/atbild(?:iet|at|ēt)/i, /super\s*chat/i],
  bg: [/отговар(?:яйте|яте)/i, /super\s*chat/i],
  pl: [/odpis(?:uj|ujesz|ać)/i, /super\s*chat/i],
  cs: [/odpov(?:ídejte|ídáte|íte|ěz)/i, /super\s*chat/i],
  sk: [/odpoved(?:ajte|áte)|odpovi(?:ete|edzte)/i, /super\s*chat/i],
  el: [/απαντ(?:ήστε|άτε|ήσετε)/i, /super\s*chat/i],
  tr: [/yanıt\s+yaz|mesaj\s+(?:yaz|gönder)/i, /super\s*chat/i],
  sw: [/\b(?:u?jibu|jibuni)\b/i, /super\s*chat/i],
  fil: [/\b(?:sumagot|makasagot|sagutin)\b/i, /super\s*chat/i],
  am: [/መልስ\s*(?:ይስጡ|መስጠት)|መልዕክት\s*(?:ይላኩ|መላክ)/i, /super\s*chat/i],
  th: [/พิมพ์ตอบ|ตอบกลับ|ส่งข้อความ/i, /super\s*chat/i],
  vi: [/trả\s*lời|gửi\s+tin\s+nhắn/i, /super\s*chat/i],
  id: [/\b(?:mem)?balas\b/i, /super\s*chat/i],
  ms: [/\b(?:mem)?balas\b/i, /super\s*chat/i],
  hi: [/जवाब\s*(?:दें|दीजिए|द)|मैसेज\s*भेज/i, /super\s*chat/i],
  bn: [/উত্তর\s*(?:দিন|দাও)|মেসেজ\s*পাঠান/i, /super\s*chat/i],
  ta: [/பதில்\s*(?:சொல்|அனுப்)/i, /super\s*chat/i],
  te: [/రిప్లై\s*ఇవ్వండి|మెసేజ్\s*పంప/i, /super\s*chat/i],
  ml: [/മറുപടി\s*(?:പറയാം|അയയ്ക്ക)/i, /super ?chat/i],
  kn: [/ಉತ್ತರಿಸಿ|ಸಂದೇಶ\s*ಕಳುಹಿಸಿ/i, /super ?chat/i],
  gu: [/જવાબ\s*આપો|મેસેજ\s*મોકલો/i, /super ?chat/i],
  mr: [/उत्तर\s*द्या|मेसेज\s*पाठव/i, /super ?chat/i],
  ja: [/コメント[^。]{0,24}(?:送れる|送信|書き込)/i, /スーパーチャット|スパチャ/i],
  // 댓글 is the comment section under the video, a surface this extension never reaches.
  // The summary posts a live chat message, so anchor on that object and its posting verb.
  ko: [/(?:채팅|메시지)[을를도]?\s*(?:보내|보냅|남기|남깁)/i, /슈퍼챗|super ?chat/i],
  zh_CN: [/发(?:送|表)?(?:留言|消息)|发言/i, /super ?chat|超级留言/i],
  zh_TW: [/發(?:送|表)?(?:訊息|留言)|發言/i, /super ?chat|超級留言/i],
  ar: [/ردّ?\s*عليها|(?:اكتب|أرسل|ارسل)\s+رسال/i, /super\s*chat/i],
  he: [/(?:כתבו|שלחו)\s+הודע/i, /super\s*chat/i],
  fa: [/پاسخ\s*(?:بدهید|دهید)|پیام[\s\S]{0,20}بفرست/i, /super\s*chat/i],
  en: [POSTS_A_MESSAGE, /super\s*chats?/i],
  en_US: [POSTS_A_MESSAGE, /super\s*chats?/i],
  en_GB: [POSTS_A_MESSAGE, /super\s*chats?/i],
  en_AU: [POSTS_A_MESSAGE, /super\s*chats?/i],
}
