const { spawn } = require('child_process')
const { Readable } = require('stream')
async function convertTtsToCallAudio(audioBuffer, options = {}) {
    const {
        encoding = 'mulaw',
        sampleRate = 8000
    } = options

    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
        throw new Error('audioBuffer باید یک Buffer غیرخالی باشد')
    }

    if (!['mulaw', 'alaw'].includes(encoding)) {
        throw new Error(`encoding نامعتبر: ${encoding}. فقط mulaw یا alaw مجاز است`)
    }

    const codec = encoding === 'mulaw' ? 'pcm_mulaw' : 'pcm_alaw'
    const format = encoding === 'mulaw' ? 'mulaw' : 'alaw'

    return new Promise((resolve, reject) => {
        const args = [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', 'pipe:0',
            '-ac', '1',
            '-ar', String(sampleRate),
            '-c:a', codec,
            '-f', format,
            'pipe:1'
        ]

        const ffmpeg = spawn('ffmpeg', args, {
            stdio: ['pipe', 'pipe', 'pipe']
        })
        ffmpeg.stdin.on('error', () => {})
        const chunks = []
        let stderr = ''

        ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk))
        ffmpeg.stderr.on('data', (data) => { stderr += data.toString() })

        ffmpeg.on('error', (err) => {
            reject(new Error(`اجرای ffmpeg شکست خورد: ${err.message}`))
        })

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`ffmpeg با کد ${code} خارج شد: ${stderr || 'بدون پیام خطا'}`))
                return
            }
            resolve(Buffer.concat(chunks))
        })

        const inputStream = Readable.from(audioBuffer)
        inputStream.pipe(ffmpeg.stdin)
    })
}

module.exports = convertTtsToCallAudio