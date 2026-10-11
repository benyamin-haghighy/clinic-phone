
const {
    normalize,
    getPunctuationInfo,
    tokenize,
    endsWithAny
} = require('./normalizeText')

const L = require('./lexicon')

const REQUEST_STARTERS = new Set(['میشه', 'لطفا', 'ممکنه', 'میتونید', 'میتونین', 'میتونی'].map(normalize))

const isDesireModal = (tok) =>
    /^(?:ن?میخو|بخوا)/u.test(tok) || /(?:دارم|دارید)$/u.test(tok)

function analyze(raw) {
    const punct = getPunctuationInfo(raw)
    const tokens = tokenize(normalize(raw))
    const n = tokens.length
    const reasons = []

    if (!n) return { score: 0, reasons }

    const last = tokens[n - 1]
    const hasYesNo = tokens.some(t => L.YES_NO_WORDS.has(t))
    const hasQuestionWord = tokens.some((t, i) =>
        L.INTERROGATIVES.has(t) || (t === L.CHE_WORD && i < n - 1)
    )

    let hit

    if ((hit = endsWithAny(tokens, L.CONJUNCTIONS))) {
        reasons.push(`ends-with-conjunction «${hit}»`)
        return { score: -2, reasons }
    }

    if ((hit = endsWithAny(tokens, L.PREPOSITIONS))) {
        reasons.push(`ends-with-preposition «${hit}»`)
        return { score: -2, reasons }
    }

    if (L.OBJECT_MARKERS.has(last)) {
        reasons.push('ends-with-object-marker «را/رو»')
        return { score: -2, reasons }
    }

    if (
        L.OBJECT_CLITIC_EXACT.has(last) ||
        (OBJECT_CLITIC_OK(last))
    ) {
        reasons.push(`ends-with-colloquial-object «${last}»`)
        return { score: -2, reasons }
    }

    if ((hit = endsWithAny(tokens, L.DETERMINERS))) {
        reasons.push(`ends-with-determiner «${hit}»`)
        return { score: -2, reasons }
    }

    if ((hit = endsWithAny(tokens, L.PREFACE_ENDINGS))) {
        reasons.push(`preface-without-question «${hit}»`)
        return { score: -2, reasons }
    }

    if ((hit = endsWithAny(tokens, L.OPENERS))) {
        reasons.push(`opener-only «${hit}»`)
        return { score: -2, reasons }
    }

    if (L.HESITATION_STRONG.has(last)) {
        reasons.push(`hesitation «${last}»`)
        return { score: -2, reasons }
    }

    if (last === 'می' || last === 'نمی') {
        reasons.push('orphan-verb-prefix «می»')
        return { score: -2, reasons }
    }

    if ((hit = endsWithAny(tokens, L.MODAL_STEMS))) {
        const hitLen = hit.split(' ').length
        const before = tokens.slice(0, n - hitLen)
        const contentBefore = before.filter(t =>
            !L.PRONOUNS.has(t) && !L.YES_NO_WORDS.has(t)
        ).length

        const negated = /^نمی|^نمیخو/u.test(last)

        if (!hasYesNo && !hasQuestionWord && !negated) {
            if (contentBefore === 0 || (isDesireModal(last) && contentBefore <= 1)) {
                reasons.push(`modal-without-object «${hit}»`)
                return { score: -2, reasons }
            }
            if (contentBefore === 1) {
                reasons.push(`short-modal-sentence «${hit}»`)
                return { score: -1, reasons }
            }
        }
    }

    if (punct.endsWithPause) {
        reasons.push('trailing-pause-punctuation («،» «…» «:» «-»)')
        return { score: -1, reasons }
    }

    if (n <= 2 && L.HESITATION_SOFT.has(last)) {
        reasons.push(`soft-filler «${last}»`)
        return { score: -1, reasons }
    }

    if (n <= 2 && L.BARE_NOUNS_SOFT.has(last)) {
        reasons.push(`bare-noun «${last}»`)
        return { score: -1, reasons }
    }

    if (n >= 2 && L.PRONOUNS.has(last) && !hasYesNo) {
        reasons.push(`ends-with-pronoun «${last}»`)
        return { score: -1, reasons }
    }

    if (n === 2 && REQUEST_STARTERS.has(tokens[0]) && L.isFiniteVerb(last)) {
        reasons.push('request-verb-without-content («میشه بگید»)')
        return { score: -1, reasons }
    }

    return { score: 0, reasons }
}

function OBJECT_CLITIC_OK(tok) {
    return L.OBJECT_CLITIC_RE.test(tok) && !L.OBJECT_CLITIC_NOT.has(tok)
}

module.exports = (text) => analyze(text).score
module.exports.analyze = analyze
