// =====================================================================
// نرمال‌سازی مشترک برای همه‌ی فایل‌های امتیازدهی
// هدف: متن خروجی STT و لغت‌نامه‌ها دقیقاً با یک تابع نرمال بشن
// =====================================================================

const MAX_PHRASE_LEN = 5

function normalize(text) {
    if (typeof text !== 'string') return ''

    let s = text.normalize('NFKC')

    s = s
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[ۀة]/g, 'ه')
        .replace(/[أإٱ]/g, 'ا')
        .replace(/ؤ/g, 'و')
        .replace(/آ/g, 'ا')
        // اعراب و کشیده
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        // ارقام فارسی و عربی -> انگلیسی
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
        .toLowerCase()

    // «می خوام» و «می‌خوام» و «میخوام» => «میخوام»
    s = s.replace(/(^|[\s\u200c])(ن?می)[\u200c\s]+(?=[^\s\u200c])/g, '$1$2')

    // نیم‌فاصله => فاصله
    s = s.replace(/\u200c/g, ' ')

    // علائم نگارشی => فاصله
    s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')

    // چسباندن پسوندهای رایج
    s = s
        .replace(/\s(ها|های|هایی|هایم|هایت|هایش|هام|هات|هاش|هامون|هاتون|هاشون)(?=\s|$)/g, '$1')
        .replace(/\s(تر|ترین)(?=\s|$)/g, '$1')
        .replace(/ه\s(ام|ای|ایم|اید|اند)(?=\s|$)/g, 'ه$1')
        .replace(/(^|\s)این که(?=\s|$)/g, '$1اینکه')
        .replace(/(^|\s)چون که(?=\s|$)/g, '$1چونکه')

    return s.replace(/\s+/g, ' ').trim()
}

// اطلاعات علائم پایان متن خام (قبل از حذف علائم)
function getPunctuationInfo(raw) {
    const t = (typeof raw === 'string' ? raw : '').trim()
    return {
        endsWithQuestion: /[؟?]\s*$/.test(t),
        endsWithTerminal: /(?<!\.)[.!۔]\s*$/.test(t) && !/(\.{2,}|…)\s*$/.test(t),
        endsWithPause: /([،,؛;:\-–—]|\.{2,}|…)\s*$/.test(t)
    }
}

function tokenize(clean) {
    return clean ? clean.split(' ') : []
}

// ساخت Set نرمال‌شده از لیست عبارت‌ها
function buildSet(list) {
    return new Set(list.map(normalize).filter(Boolean))
}

// آیا آخرِ توکن‌ها یکی از عبارت‌های Set هست؟ (مرز کلمه رعایت می‌شود)
function endsWithAny(tokens, set) {
    for (let k = 1; k <= Math.min(MAX_PHRASE_LEN, tokens.length); k++) {
        const phrase = tokens.slice(-k).join(' ')
        if (set.has(phrase)) return phrase
    }
    return null
}

// آیا ابتدای توکن‌ها یکی از عبارت‌های Set هست؟ (طولانی‌ترین تطابق)
function startsWithAny(tokens, set) {
    for (let k = Math.min(MAX_PHRASE_LEN, tokens.length); k >= 1; k--) {
        const phrase = tokens.slice(0, k).join(' ')
        if (set.has(phrase)) return { phrase, length: k }
    }
    return null
}

module.exports = {
    normalize,
    getPunctuationInfo,
    tokenize,
    buildSet,
    endsWithAny,
    startsWithAny,
    MAX_PHRASE_LEN
}
