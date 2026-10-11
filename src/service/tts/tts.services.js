const axios = require("axios")
require("dotenv").config();
const { HTTP_TIMEOUT_MS } = require('../../config/settings')
const textToSpeech = async (text) => {
    try {
        const response = await axios.post(
            "https://freetts.org/api/v1/tts",
            {
                text,
                voice: "fa-IR-DilaraNeural",
                rate: "+0%", 
                pitch: "+0Hz"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key":process.env.FREE_TTS_API_KEY
                },
                timeout:HTTP_TIMEOUT_MS
            }
        );
        const audioResponse = await axios.get(response.data.audio_url,{
            responseType:"arraybuffer",
             timeout: HTTP_TIMEOUT_MS
        })
        return Buffer.from(audioResponse.data)
    } catch (error) {
        console.error(
            "TTS Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};

module.exports = textToSpeech;