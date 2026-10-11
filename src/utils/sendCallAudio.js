
const MAX_MESSAGE_BYTES = 65500
const FRAME_BYTES = 160          // 20ms از mulaw/alaw با 8kHz
const DEFAULT_CHUNK_BYTES = 64000 // 400 فریم = 8 ثانیه

const OPEN = 1

const send = (ws, data) =>
    new Promise((resolve, reject) => {
        ws.send(data, (error) => (error ? reject(error) : resolve()))
    })

const control = (command, format, correlationId) => {
    if (format === 'json') {
        const message = { command }
        if (correlationId) message.correlation_id = correlationId
        return JSON.stringify(message)
    }
    return correlationId ? `${command} ${correlationId}` : command
}

async function sendCallAudio(ws, audioBuffer, options = {}) {
    const {
        chunkBytes = DEFAULT_CHUNK_BYTES,
        frameBytes = FRAME_BYTES,
        controlFormat = 'text',   // 'text' (پیش‌فرض Asterisk) یا 'json' (برای f(json) در dialstring)
        correlationId,
        isCancelled = () => false
    } = options

    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
        throw new Error('audioBuffer باید یک Buffer غیرخالی باشد')
    }
    if (chunkBytes > MAX_MESSAGE_BYTES || chunkBytes < frameBytes || chunkBytes % frameBytes !== 0) {
        throw new Error(`chunkBytes باید مضرب ${frameBytes} و حداکثر ${MAX_MESSAGE_BYTES} باشد`)
    }
    if (!['text', 'json'].includes(controlFormat)) {
        throw new Error(`controlFormat نامعتبر: ${controlFormat}`)
    }
    if (ws.readyState !== OPEN) {
        throw new Error('اتصال WebSocket باز نیست')
    }

    await send(ws, control('START_MEDIA_BUFFERING', controlFormat))

    for (let offset = 0; offset < audioBuffer.length; offset += chunkBytes) {
        if (isCancelled() || ws.readyState !== OPEN) {
            return false   // تماس بسته شده؛ دیگر چیزی نفرست
        }
        await send(ws, audioBuffer.subarray(offset, offset + chunkBytes))
    }

    if (isCancelled() || ws.readyState !== OPEN) {
        return false
    }
    await send(ws, control('STOP_MEDIA_BUFFERING', controlFormat, correlationId))
    return true
}

module.exports = sendCallAudio
module.exports.MAX_MESSAGE_BYTES = MAX_MESSAGE_BYTES
