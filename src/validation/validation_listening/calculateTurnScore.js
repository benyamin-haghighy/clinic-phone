
const checkEndingPhrase = require('./endingPhrases')
const checkContinuation = require('./checkContinuation')
const checkConversationalCompleteness = require('./checkConversationalCompleteness')

const COMPLETE_THRESHOLD = 2

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

function evaluate(text) {
    const ending = checkEndingPhrase.analyze(text)
    const continuation = checkContinuation.analyze(text)
    const completeness = checkConversationalCompleteness.analyze(text)


    if (ending.score === 3) {
        return {
            score: 3,
            complete: true,
            parts: { ending: 3, continuation: continuation.score, completeness: completeness.score },
            reasons: ending.reasons
        }
    }


    if (continuation.score === -2) {
        return {
            score: -2,
            complete: false,
            parts: { ending: 0, continuation: -2, completeness: completeness.score },
            reasons: continuation.reasons
        }
    }


    const score = clamp(completeness.score + continuation.score, -2, 3)

    return {
        score,
        complete: score >= COMPLETE_THRESHOLD,
        parts: { ending: 0, continuation: continuation.score, completeness: completeness.score },
        reasons: [...completeness.reasons, ...continuation.reasons]
    }
}

module.exports = (text) => {
    const result = evaluate(text)

    console.log({
        text,
        ...result.parts,
        finalScore: result.score,
        complete: result.complete,
        reasons: result.reasons
    })

    return result.score
}

module.exports.evaluate = evaluate
module.exports.COMPLETE_THRESHOLD = COMPLETE_THRESHOLD
