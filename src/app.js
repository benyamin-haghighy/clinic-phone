const express = require('express')
const app = express()
require('dotenv').config()
const askAi = require('./service/ask_ai/ask.ai.services')
const tts = require('./service/tts/tts.services')
const calculateTurnScore = require('./validation/validation_listening/calculateTurnScore')
const createIotypeConnection = require('./service/ws/createIotypeConnection')
const createConversation = require('./utils/createConversation')
const createMessage = require('./utils/createMessage')
const createEmbeddingMessage = require('./service/embedding/embedding.services')
const searchVector = require('./utils/searchVector')
const getAllmessages = require('./utils/getAllMessages')
const createSession = require('./utils/createSession')
const createWsConnection = require('./service/ws/createWsServer')
const closeCall = require('./utils/closeCall')
const convertCallAudio = require('./utils/convertCallAudio');
const convertTtsToCallAudio = require('./utils/convertTtsToCallAudio');
const sendCallAudio = require('./utils/sendCallAudio');

const {
    SILENCE_MS,
    SIMILARITY_THRESHOLD,
    MAX_FAILURES_PER_CALL,
    FALLBACK_TEXT
} = require('./config/settings')


const STATUS = { CONNECTING: 'connecting', LISTENING: 'listening', ANSWERING: 'answering' , CLOSE:"close"}




app.get('/health', (req, res) => {
    res.json({ ok: true })
})

const handleCall = async (wsConnection,req) => {
    let phone = new URL(req.url, 'http://localhost:8080').searchParams.get('phone')
    if (!(/^(09\d{9}|\+989\d{9})$/.test(phone || '')|| /^(0[1-8]\d{9}|\+98[1-8]\d{9})$/.test(phone||''))) {
        wsConnection.close(1008, 'invalid phone')
        return
    }
    phone = phone.replace(/^\+98/, '0')
    const state = {turnText:'', turnCompletionTimer:null, status:STATUS.CONNECTING,stt:null,failures: 0}
    state.convert = convertCallAudio({
                                inputEncoding: 'mulaw',      
                                inputSampleRate: 8000,
                                outputSampleRate: 44100
                            })
    const session = await createSession(phone) 
    if (wsConnection.readyState !==1) {
        return closeCall(wsConnection, state)
    }
    wsConnection.on('message', async(data,isBinary)=>{
                    try {
                        if (isBinary && state.status === STATUS.LISTENING) {
                            
                            state.convert(data).forEach((frame)=>{
                                state.stt.send(frame)
                            })
                        }else if (!isBinary) {
                        data = JSON.parse(data.toString())
                        if (data.event === 'MEDIA_BUFFERING_COMPLETED' && state.status === STATUS.ANSWERING) {
                            console.log('پایان پخش صدا...')
                            state.turnText = ''
                            await startTurn(
                                phone,
                                session.id,
                                wsConnection,
                                state
                            )
                        }
                        }
                    } catch (error) {
                        console.log('handleCall error -> ', error.message);
                        
                    }

                })    
    wsConnection.on('close', () => {
        closeCall(wsConnection,state)
    })
    wsConnection.on('error', (error) => {
        console.error('WebSocketConnection  error:', error)
    })
    await startTurn(phone, session.id,wsConnection, state)

}
const answerUser = async (phone, session_id, wsConnection, state) => {
    const messages = await createMessage('user', state.turnText, phone, session_id)
    const embeddingMessageUser = await createEmbeddingMessage(messages[0].content)
    let documnets = await searchVector(embeddingMessageUser)

    if (messages[1]) {
        const newEmbeddingMessageUser = await createEmbeddingMessage(
            `${messages[1].content}\n${messages[0].content}`
        )
        const newDocumnets = await searchVector(newEmbeddingMessageUser)
        if ((documnets[0]?.Similarity ?? 0) >= (newDocumnets[0]?.Similarity ?? 0) - 0.05) {
            documnets = documnets.slice(0, 2)
        } else {
            documnets = newDocumnets.slice(0, 2)
        }
    } else {
        documnets = documnets.slice(0, 2)
    }
    if (state.status === STATUS.CLOSE) return

    const allMessages = await getAllmessages(phone)
    const topSimilarity = documnets[0]?.Similarity ?? 0
    const responseAi = topSimilarity < SIMILARITY_THRESHOLD
        ? 'اطلاعات کافی برای پاسخ به این سوال در اختیار ندارم.'
        : await askAi({ messages: allMessages.reverse(), documnets })
    if (state.status === STATUS.CLOSE) return

    await createMessage('assistant', responseAi, phone, session_id)
    await showVoiceToUser(responseAi, phone, wsConnection, state)
    state.failures = 0
}
const handleTurnError = async (error, phone, session_id, wsConnection, state) => {
    console.error('Turn error:', error.message)
    if (state.status === STATUS.CLOSE) {
        return
    }
    state.failures++
    if (state.failures >= MAX_FAILURES_PER_CALL) {
        console.error('Too many failures, closing the call')
        closeCall(wsConnection, state, 1011, 'too many failures')
        return
    }
    try {
        // بعد از پخش پیام، کلاینت audio_finished می‌فرسته و نوبت بعدی شروع می‌شه
        await showVoiceToUser(FALLBACK_TEXT, phone, wsConnection, state)
    } catch (voiceError) {
        console.error('Fallback voice failed:', voiceError.message)
        state.turnText = ''
        startTurn(phone, session_id, wsConnection, state)
    }
}
const startTurn = async (phone, session_id, wsConnection, state) => {
    if (state.status === STATUS.CLOSE) {
        return
    }
    try {
        console.log('========== START TURN ==========')
        state.status = STATUS.CONNECTING
        await createConversation(phone)
        if (state.status === STATUS.CLOSE) return

        const ws = createIotypeConnection()
        state.stt = ws

        ws.on('message', (raw) => {
            try {
                if (state.status === STATUS.CLOSE || state.stt !== ws) {
                    return
                }
                const data = JSON.parse(raw.toString())
                if (data.status === 'authorized') {
                    state.status = STATUS.LISTENING
                }
                if (data.partial) {
                    console.log('partial ->', data.partial)
                }
                if (data.text) {
                    state.turnText += (state.turnText ? ' ' : '') + data.text.trim()
                    console.log('🟢 CURRENT TURN TEXT:', state.turnText)
                    clearTimeout(state.turnCompletionTimer)

                    state.turnCompletionTimer = setTimeout(async () => {
                        try {
                            const score = calculateTurnScore(state.turnText)
                            console.log('🎯 TURN SCORE:', score)

                            if (score >= calculateTurnScore.COMPLETE_THRESHOLD) {
                                state.status = STATUS.ANSWERING
                                finishTurn(state.stt)
                                state.stt = null
                                await answerUser(phone, session_id, wsConnection, state)
                            } else {
                                console.log('⏳ TURN IS NOT COMPLETE - KEEP LISTENING')
                            }
                        } catch (error) {
                            await handleTurnError(error, phone, session_id, wsConnection, state)
                        }
                    }, SILENCE_MS)
                }
            } catch (error) {
                console.error('STT message error:', error.message)
            }
        })

        ws.on('error', (error) => {
            console.log('Iotype WebSocket error:', error.message)
        })

        ws.on('close', (code, reason) => {
            console.log('Iotype closed:', code, reason.toString())
            // قطع شدن غیرمنتظره‌ی STT وسط اتصال یا گوش دادن
            const unexpected = state.stt === ws &&
                (state.status === STATUS.LISTENING || state.status === STATUS.CONNECTING)
            if (!unexpected) {
                return
            }
            state.stt = null
            state.failures++
            if (state.failures >= MAX_FAILURES_PER_CALL) {
                closeCall(wsConnection, state, 1011, 'speech service unavailable')
                return
            }
            setTimeout(() => startTurn(phone, session_id, wsConnection, state), 500)
        })
    } catch (error) {
        console.error('startTurn error:', error.message)
        closeCall(wsConnection, state, 1011, 'server error')
    }
}
const finishTurn = (wsIoType) => {
        wsIoType?.close()
}
const showVoiceToUser = async (responseAi, phone, wsConnection, state) => {
    if (state.status === STATUS.CLOSE) {
        return
    }
    const audioBuffer = await tts(responseAi)
    if (state.status === STATUS.CLOSE) {
        return
    }

    console.log('شروع پخش صدا...')
    const audio_user = await convertTtsToCallAudio(audioBuffer, {
        encoding: 'mulaw',
        sampleRate: 8000
    })
    await sendCallAudio(wsConnection, audio_user, {
        controlFormat: 'json',
       isCancelled: () => state.status === STATUS.CLOSE
   })
}
createWsConnection(handleCall)


module.exports = app