
const { normalize, tokenize, MAX_PHRASE_LEN } = require('./normalizeText')
const {
    CLOSURE_PHRASES,
    CLOSURE_FILLERS,
    THANKS_STARTERS,
    INTERROGATIVES
} = require('./lexicon')

function matchAt(tokens, i, set) {
    for (let k = Math.min(MAX_PHRASE_LEN, tokens.length - i); k >= 1; k--) {
        if (set.has(tokens.slice(i, i + k).join(' '))) return k
    }
    return 0
}

function isClosureTokens(tokens) {
    if (!tokens.length) return false

    let i = 0
    let phrases = 0

    while (i < tokens.length) {
        const len = matchAt(tokens, i, CLOSURE_PHRASES)

        if (len) {
            const phrase = tokens.slice(i, i + len).join(' ')
            phrases++
            i += len

            if (
                THANKS_STARTERS.has(phrase) &&
                (tokens[i] === 'از' || tokens[i] === 'بابت')
            ) {
                const rest = tokens.slice(i)
                if (rest.length <= 5 && !rest.some(t => INTERROGATIVES.has(t))) {
                    return true
                }
            }
            continue
        }

        const fillerLen = matchAt(tokens, i, CLOSURE_FILLERS)
        if (fillerLen) {
            i += fillerLen
            continue
        }

        return false
    }

    return phrases > 0
}

function analyze(text) {
    const tokens = tokenize(normalize(text))
    if (!tokens.length) return { score: 0, reasons: [] }

    if (isClosureTokens(tokens)) {
        return { score: 3, reasons: ['closure-phrase (تشکر/تأیید/بله‌خیر/خداحافظی)'] }
    }
    return { score: 0, reasons: [] }
}

module.exports = (text) => analyze(text).score
module.exports.analyze = analyze
module.exports.isClosureTokens = isClosureTokens
