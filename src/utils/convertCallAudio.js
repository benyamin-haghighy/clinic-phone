

const OUTPUT_SAMPLE_RATE = 44100

const decodeMulawByte = (byte) => {
    const u = ~byte & 0xff
    const exponent = (u >> 4) & 0x07
    const mantissa = u & 0x0f
    const sample = (((mantissa << 3) + 0x84) << exponent) - 0x84
    return u & 0x80 ? -sample : sample
}

const decodeAlawByte = (byte) => {
    const a = byte ^ 0x55
    const exponent = (a >> 4) & 0x07
    const mantissa = a & 0x0f
    const sample = exponent === 0
        ? (mantissa << 4) + 8
        : ((mantissa << 4) + 0x108) << (exponent - 1)
    return a & 0x80 ? sample : -sample
}

// جدول از پیش‌ساخته برای سرعت
const MULAW_TABLE = Int16Array.from({ length: 256 }, (_, i) => decodeMulawByte(i))
const ALAW_TABLE = Int16Array.from({ length: 256 }, (_, i) => decodeAlawByte(i))

const toPcm16Samples = (chunk, encoding) => {
    if (encoding === 'pcm16') {
        const count = Math.floor(chunk.length / 2)
        const samples = new Int16Array(count)
        for (let i = 0; i < count; i++) samples[i] = chunk.readInt16LE(i * 2)
        return samples
    }
    const table = encoding === 'mulaw' ? MULAW_TABLE : ALAW_TABLE
    const samples = new Int16Array(chunk.length)
    for (let i = 0; i < chunk.length; i++) samples[i] = table[chunk[i]]
    return samples
}

const createCallAudioConverter = ({
    inputEncoding = 'mulaw',        
    inputSampleRate = 8000,
    outputSampleRate = OUTPUT_SAMPLE_RATE
} = {}) => {
    if (!['mulaw', 'alaw', 'pcm16'].includes(inputEncoding)) {
        throw new Error(`inputEncoding نامعتبر: ${inputEncoding}`)
    }

    const step = inputSampleRate / outputSampleRate
    const frameBytes = Math.round(outputSampleRate * 0.02) * 2   
    let prev = null   
    let pos = 0       
    let pending = Buffer.alloc(0)   

    const resample = (decoded) => {
        if (step === 1) return Array.from(decoded)


        const seq = prev === null ? decoded : Int16Array.from([prev, ...decoded])
        const out = []
        while (pos + 1 < seq.length) {
            const i = Math.floor(pos)
            const frac = pos - i
            out.push(Math.round(seq[i] * (1 - frac) + seq[i + 1] * frac))
            pos += step
        }
        pos -= seq.length - 1
        prev = seq[seq.length - 1]
        return out
    }

    const convert = (chunk) => {
        const decoded = toPcm16Samples(chunk, inputEncoding)
        if (decoded.length === 0) return []

        const samples = resample(decoded)
        const buffer = Buffer.alloc(samples.length * 2)
        for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(samples[i], i * 2)

        pending = Buffer.concat([pending, buffer])
        const frames = []
        while (pending.length >= frameBytes) {
            frames.push(pending.subarray(0, frameBytes))
            pending = pending.subarray(frameBytes)
        }
        return frames
    }


    convert.flush = () => {
        if (pending.length === 0) return null
        const frame = Buffer.alloc(frameBytes)
        pending.copy(frame)
        pending = Buffer.alloc(0)
        return frame
    }

    return convert
}

module.exports = createCallAudioConverter
module.exports.OUTPUT_SAMPLE_RATE = OUTPUT_SAMPLE_RATE
