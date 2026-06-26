import {
  XENESIS_CONTEXT_MESSAGE_LIMIT,
  XENESIS_CONTEXT_MESSAGE_MAX_CHARS,
  type XenesisChatMessage,
} from './xenesisAgentTypes';

export interface XenesisAgentHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface BuildXenesisAgentHistoryMessagesOptions {
  currentPrompt?: string;
  limit?: number;
  maxCharsPerMessage?: number;
}

export interface XenesisContextualPromptResult {
  prompt: string;
  contextApplied: boolean;
}

function normalizeContent(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+$/g, '').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function shouldKeepHistoryMessage(message: XenesisChatMessage): boolean {
  if (message.streaming) return false;
  if (message.error) return false;
  if (message.role !== 'user' && message.role !== 'assistant') return false;
  return Boolean(message.content.trim());
}

export function buildXenesisAgentHistoryMessages(
  newestFirstMessages: XenesisChatMessage[],
  options: BuildXenesisAgentHistoryMessagesOptions = {},
): XenesisAgentHistoryMessage[] {
  const limit = Math.max(1, options.limit ?? XENESIS_CONTEXT_MESSAGE_LIMIT);
  const maxCharsPerMessage = Math.max(120, options.maxCharsPerMessage ?? XENESIS_CONTEXT_MESSAGE_MAX_CHARS);
  const currentPrompt = options.currentPrompt?.trim();
  const chronological = newestFirstMessages.filter(shouldKeepHistoryMessage).reverse();
  const history: XenesisAgentHistoryMessage[] = [];

  for (const message of chronological) {
    const content = normalizeContent(message.content, maxCharsPerMessage);
    if (!content) continue;
    if (
      currentPrompt &&
      message.role === 'user' &&
      content === currentPrompt &&
      history.length === chronological.length - 1
    ) {
      continue;
    }
    history.push({ role: message.role, content });
  }

  return history.slice(Math.max(0, history.length - limit));
}

function normalizePromptForFollowUp(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[¿¡"'“”‘’「」『』()[\]{}]+/g, '')
    .replace(/[.?!。！？؟।"'“”‘’「」『』()[\]{}]+$/g, '')
    .trim()
    .toLowerCase();
}

function isLikelyStandalonePrompt(value: string): boolean {
  const normalized = normalizePromptForFollowUp(value);
  if (!normalized) return true;
  if (normalized.length > 80) return true;
  return /\b(react|vue|angular|node|python|typescript|javascript|java|spring|django|flask|sql|postgres|mysql|mongodb|docker|kubernetes|git)\b/i.test(
    value,
  );
}

const exactFollowUpPrompts = new Set([
  // Korean
  '추천',
  '추천해',
  '추천해줘',
  '추천해주세요',
  '영어로',
  '한글로',
  '한국어로',
  '자세히',
  '더 자세히',
  '구체적으로',
  '계속',
  '계속해',
  '다음',
  '다음 단계',
  '예제로',
  '샘플로',
  'xcon으로',
  'xcon으로 보여줘',
  '화면으로 보여줘',

  // English
  'recommend it',
  'recommend this',
  'show me examples',
  'show examples',
  'give me examples',
  'make it into a web app',
  'turn it into a web app',
  'make this into a web app',
  'continue',
  'keep going',
  'next',
  'next step',
  'more details',
  'in english',
  'in korean',
  'as xcon',
  'show it as xcon',

  // Chinese
  '推荐一下',
  '推荐它',
  '给我示例',
  '给我例子',
  '做成网页应用',
  '做成web应用',
  '继续',
  '下一步',
  '详细一点',
  '用英文',
  '用中文',

  // Japanese
  'おすすめして',
  'おすすめして下さい',
  'おすすめしてください',
  '例を見せて',
  '例を見せてください',
  'webアプリにして',
  '続けて',
  '次へ',
  '次のステップ',
  '詳しく',
  '英語で',
  '日本語で',

  // Spanish
  'recomiéndalo',
  'recomiendalo',
  'recomiéndame esto',
  'recomiendame esto',
  'muéstrame ejemplos',
  'muestrame ejemplos',
  'hazlo como una aplicación web',
  'hazlo como una aplicacion web',
  'continúa',
  'continua',
  'siguiente',
  'más detalles',
  'mas detalles',
  'en inglés',
  'en ingles',
  'en español',
  'en espanol',

  // French
  'recommande-le',
  'recommande le',
  'recommande ça',
  'recommande ca',
  'montre-moi des exemples',
  'montre moi des exemples',
  'fais-en une application web',
  'fais en une application web',
  'continue',
  'suivant',
  'plus de détails',
  'plus de details',
  'en anglais',
  'en français',
  'en francais',

  // German
  'empfiehl es mir',
  'empfiehl das',
  'zeig mir beispiele',
  'zeige mir beispiele',
  'mach daraus eine web-app',
  'mach daraus eine web app',
  'weiter',
  'nächster schritt',
  'nachster schritt',
  'mehr details',
  'auf englisch',
  'auf deutsch',

  // Italian
  'consigliamelo',
  'consiglia questo',
  'mostrami degli esempi',
  'mostra esempi',
  'trasformalo in una web app',
  'continua',
  'passo successivo',
  'più dettagli',
  'piu dettagli',
  'in inglese',
  'in italiano',

  // Russian
  'порекомендуй',
  'порекомендуй это',
  'покажи примеры',
  'сделай это веб-приложением',
  'сделай это веб приложением',
  'продолжай',
  'дальше',
  'следующий шаг',
  'подробнее',
  'на английском',
  'на русском',

  // Other common languages
  'recomende isso',
  'mostre exemplos',
  'transforme isso em um aplicativo web',
  'em inglês',
  'em portugues',
  'em português',
  'buat jadi aplikasi web',
  'tunjukkan contoh',
  'lanjutkan',
  'hiển thị ví dụ',
  'hien thi vi du',
  'tiếp tục',
  'tiep tuc',
  'เว็บแอปให้หน่อย',
  'แสดงตัวอย่าง',
  'ต่อไป',
  'bunu web uygulaması yap',
  'örnekleri göster',
  'ornekleri goster',
  'devam et',
  'اعرض أمثلة',
  'تابع',
  'اجعله تطبيق ويب',
  'इसे वेब ऐप बनाओ',
  'उदाहरण दिखाओ',
  'जारी रखें',
]);

const followUpPromptPatterns = [
  // Korean
  /(이|그|위|앞|방금)\s*(내용|요청|결과|답변|화면|기능|항목|것|걸|걸로|걸로요)/,
  /(이어|계속|다음|추가|더)\s*(해|해서|진행|설명|보여|만들|정리)/,
  /(웹|앱|프로그램|화면|샘플|예제|대시보드|보고서)\s*(으로|로)\s*(만들|보여|정리|구성)/,

  // English
  /\b(this|that|it|those|them|above|previous|earlier|same)\b.*\b(recommend|show|continue|expand|explain|summari[sz]e|convert|make|turn|build|render|translate|fix)\b/,
  /\b(recommend|show|continue|expand|explain|summari[sz]e|convert|make|turn|build|render|translate|fix)\b.*\b(this|that|it|those|them|above|previous|earlier|same)\b/,
  /\b(make|turn|convert|build|render)\s+(it|this|that|them)\s+(as|into|in|to)\b/,

  // Chinese / Japanese
  /(这个|那个|上面|刚才|前面|同样).*(推荐|继续|详细|示例|例子|网页|应用|转换|做成|显示|翻译|修改)/,
  /(推荐|继续|详细|示例|例子|网页|应用|转换|做成|显示|翻译|修改).*(这个|那个|上面|刚才|前面|同样)/,
  /(これ|それ|あれ|上の|前の|さっき|同じ).*(おすすめ|続け|詳しく|例|webアプリ|アプリ|変換|作って|見せて|翻訳|修正)/,
  /(おすすめ|続け|詳しく|例|webアプリ|アプリ|変換|作って|見せて|翻訳|修正).*(これ|それ|あれ|上の|前の|さっき|同じ)/,

  // Spanish / Portuguese / French / Italian
  /\b(esto|eso|aquello|anterior|arriba|mismo|isso|aquilo|anterior|acima|mesmo|ça|ca|ceci|cela|précédent|precedent|même|meme|questo|quello|precedente|sopra|stesso)\b.*\b(recom|contin|muestra|mostra|montre|mostrami|exempl|ejempl|dettagli|detalles|détails|details|convierte|transform|haz|fais|trasform|traduc|corrige|corrigir)\b/,
  /\b(recom|contin|muestra|mostra|montre|mostrami|exempl|ejempl|dettagli|detalles|détails|details|convierte|transform|haz|fais|trasform|traduc|corrige|corrigir)\b.*\b(esto|eso|aquello|anterior|arriba|mismo|isso|aquilo|anterior|acima|mesmo|ça|ca|ceci|cela|précédent|precedent|même|meme|questo|quello|precedente|sopra|stesso)\b/,

  // German
  /\b(das|dies|diese|dieser|vorherige|oben|gleich|selbe)\b.*\b(empfiehl|zeig|zeige|weiter|mach|wandle|übersetz|uebersetz|korrigier|erklär|erklaer)\b/,
  /\b(empfiehl|zeig|zeige|weiter|mach|wandle|übersetz|uebersetz|korrigier|erklär|erklaer)\b.*\b(das|dies|diese|dieser|vorherige|oben|gleich|selbe)\b/,

  // Russian
  /\b(это|этот|эта|предыдущ|выше|то же|так же)\b.*\b(порекомендуй|продолж|покажи|пример|подробнее|сделай|преобраз|переведи|исправ)\b/,
  /\b(порекомендуй|продолж|покажи|пример|подробнее|сделай|преобраз|переведи|исправ)\b.*\b(это|этот|эта|предыдущ|выше|то же|так же)\b/,

  // Turkish / Indonesian / Vietnamese / Thai / Arabic / Hindi
  /\b(bunu|şunu|sunu|önceki|onceki|aynı|ayni|itu|ini|sebelumnya|sama|này|nay|đó|do|trước|truoc)\b.*\b(öner|oner|devam|göster|goster|örnek|ornek|buat|lanjut|contoh|hiển|hien|ví dụ|vi du|tiếp|tiep|dịch|dich|sửa|sua)\b/,
  /\b(öner|oner|devam|göster|goster|örnek|ornek|buat|lanjut|contoh|hiển|hien|ví dụ|vi du|tiếp|tiep|dịch|dich|sửa|sua)\b.*\b(bunu|şunu|sunu|önceki|onceki|aynı|ayni|itu|ini|sebelumnya|sama|này|nay|đó|do|trước|truoc)\b/,
  /(นี้|นั้น|ก่อนหน้า|เดิม).*(แนะนำ|ต่อ|ตัวอย่าง|ทำ|แปล|แก้|แสดง)/,
  /(هذا|هذه|ذلك|تلك|السابق|أعلاه).*(وص|تابع|أمثلة|مثال|حوّل|حول|ترجم|أصلح|اصلح|اعرض)/,
  /(इसे|इसको|यह|वह|पिछला|ऊपर).*(सुझ|जारी|उदाहरण|बनाओ|दिखाओ|अनुवाद|ठीक)/,
];

function isLikelyFollowUpPrompt(value: string): boolean {
  const normalized = normalizePromptForFollowUp(value);
  if (!normalized) return false;
  if (isLikelyStandalonePrompt(value)) return false;

  if (exactFollowUpPrompts.has(normalized)) return true;
  if (followUpPromptPatterns.some((pattern) => pattern.test(normalized))) return true;
  if (/(만들 수|가능|해줘|해주세요|보여줘|정리해줘|설명해줘|바꿔줘|고쳐줘)/.test(normalized) && normalized.length <= 40)
    return true;

  return false;
}

function historyContextText(history: XenesisAgentHistoryMessage[]): string {
  return history
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'Assistant' : message.role === 'user' ? 'User' : 'System';
      return `${speaker}: ${message.content}`;
    })
    .join('\n\n');
}

export function buildXenesisContextualPrompt(input: {
  prompt: string;
  messages: XenesisChatMessage[];
  limit?: number;
  maxCharsPerMessage?: number;
}): XenesisContextualPromptResult {
  const prompt = input.prompt.trim();
  if (!prompt) return { prompt, contextApplied: false };
  if (!isLikelyFollowUpPrompt(prompt)) return { prompt, contextApplied: false };

  const history = buildXenesisAgentHistoryMessages(input.messages, {
    limit: input.limit ?? Math.min(8, XENESIS_CONTEXT_MESSAGE_LIMIT),
    maxCharsPerMessage: input.maxCharsPerMessage ?? 900,
  });
  if (history.length < 2) return { prompt, contextApplied: false };

  const contextText = historyContextText(history);
  if (!contextText.trim()) return { prompt, contextApplied: false };

  return {
    contextApplied: true,
    prompt: [
      'The user is continuing an ongoing Xenesis Agent conversation.',
      'Treat the current request as a follow-up unless it clearly introduces a new topic.',
      'Preserve the recent topic, constraints, target artifact, and requested format from the conversation.',
      'Do not ask what the recommendation is about if the recent conversation already establishes the topic.',
      'Answer in the same natural language as the current user request.',
      '',
      'Recent conversation context:',
      contextText,
      '',
      'Current user request:',
      prompt,
    ].join('\n'),
  };
}
