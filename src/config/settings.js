const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

module.exports = {
    PORT: Number(process.env.PORT) || 3000,
    WS_PORT: Number(process.env.WS_PORT) || 8080,
    SILENCE_MS: Number(process.env.SILENCE_MS) || 3000,     
    SIMILARITY_THRESHOLD: 0.5,                                
    MAX_FAILURES_PER_CALL: 3,                                 
    HTTP_TIMEOUT_MS: Number(process.env.HTTP_TIMEOUT_MS) || 20000,
    WS_HOST: process.env.WS_HOST || '127.0.0.1',
    FALLBACK_TEXT: 'متأسفانه مشکلی پیش آمد. لطفاً سؤال خود را دوباره بپرسید.'
}