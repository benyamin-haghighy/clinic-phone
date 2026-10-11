
const {
    normalize,
    getPunctuationInfo,
    tokenize,
    endsWithAny,
    startsWithAny
} = require('./normalizeText')

const L = require('./lexicon')
const { isClosureTokens } = require('./endingPhrases')

const REQUEST_STARTERS = new Set(['میشه', 'لطفا', 'ممکنه', 'میتونید', 'میتونین', 'میتونی'].map(normalize))

function analyze(raw) {
    const punct = getPunctuationInfo(raw)
    const clean = normalize(raw)
    const reasons = []

    if (!clean) return { score: -2, reasons: ['empty'] }

    let tokens = tokenize(clean)

    let hadGreeting = false
    let hadOpener = false

    while (tokens.length) {
        let m = startsWithAny(tokens, L.OPENERS)
        if (m) { hadOpener = true; tokens = tokens.slice(m.length); continue }

        m = startsWithAny(tokens, L.GREETINGS)
        if (m) { hadGreeting = true; tokens = tokens.slice(m.length); continue }

        break
    }

    if (!tokens.length) {
        if (hadOpener) return { score: -2, reasons: ['opener-only'] }
        if (hadGreeting) return { score: 1, reasons: ['greeting-only'] }
        return { score: -2, reasons: ['empty'] }
    }

    const n = tokens.length
    const last = tokens[n - 1]

    // ------------------------------------------------------------
    // ۲) جواب‌های کوتاه و پایانی (بله / نه / ممنون / ...)
    // ------------------------------------------------------------
    if (isClosureTokens(tokens)) {
        return { score: 2, reasons: ['conversational-closure'] }
    }

    let best = 0
    const note = (score, why) => {
        if (score > best) best = score
        reasons.push(`${why} => ${score}`)
    }
    if (punct.endsWithQuestion) {
        note(n >= 2 ? 2 : 1, 'question-mark')
    }

    const hasQuestionWord = tokens.some((t, i) =>
        L.INTERROGATIVES.has(t) || (t === L.CHE_WORD && i < n - 1)
    )
    if (hasQuestionWord && n >= 2) {
        note(2, 'interrogative-word')
    }

    if (endsWithAny(tokens, L.QUESTION_PHRASES)) {
        note(2, 'question-phrase')
    }

    if (n >= 3 && endsWithAny(tokens, L.TAG_QUESTION_ENDINGS)) {
        note(2, 'tag-question («درسته / یا نه / مگه نه»)')
    }
    if (L.isFiniteVerb(last)) {
        if (n >= 3) note(2, `ends-with-verb «${last}»`)
        else if (n === 2) {
            if (REQUEST_STARTERS.has(tokens[0])) note(1, `starter+verb «${last}»`)
            else note(2, `short-sentence-with-verb «${last}»`)
        }
    }

    if (!L.isFiniteVerb(last)) {
        let v = -1
        for (let i = n - 2; i >= 0; i--) {
            const t = tokens[i]
            if (!L.isFiniteVerb(t) || L.PREFACE_VERBS.has(t)) continue
            // فعل‌های «خواستن/توانستن» فقط وقتی مفعول قبلشان هست
            if (L.MODAL_STEMS.has(t) && i < 2) continue
            v = i
            break
        }
        if (v >= 0) {
            const rest = tokens.slice(v + 1)
            if (rest.length >= 2 && startsWithAny(rest, L.PREPOSITIONS)) {
                note(2, `verb «${tokens[v]}» + prepositional-phrase`)
            } else if (rest.length && startsWithAny(rest, L.TIME_ADVERBS)) {
                note(2, `verb «${tokens[v]}» + time-adverb`)
            }
        }
    }

    if (punct.endsWithTerminal && n >= 2) {
        note(n >= 3 ? 2 : 1, 'terminal-punctuation («.» «!»)')
    }

    if (n >= 3) {
        note(1, 'long-noun-phrase')
    }

    if (tokens.every(t => /^\d+$/.test(t))) {
        best = Math.min(best, 0)
        reasons.push('numbers-only (احتمالاً در حال دیکته) => cap 0')
    }


    const isQuestion = hasQuestionWord || punct.endsWithQuestion
    if (!isQuestion && best > 1 && startsWithAny(tokens, L.SUBORDINATORS)) {
        best = 1
        reasons.push('subordinate-clause-only (جمله‌ی اصلی نیامده) => cap 1')
    }

    return { score: Math.max(-2, Math.min(2, best)), reasons }
}

module.exports = (text) => analyze(text).score
module.exports.analyze = analyze
