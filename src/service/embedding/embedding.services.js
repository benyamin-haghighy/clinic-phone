const axios = require('axios')
require('dotenv').config()
const { HTTP_TIMEOUT_MS } = require('../../config/settings')

module.exports = async(content)=>{
    const response = await axios.post('https://openrouter.ai/api/v1/embeddings',{
        model:'liquid/lfm-2.5-embedding-350m:free',
        input:content
    },{
        headers:{
            Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`
        },
         timeout: HTTP_TIMEOUT_MS
    })
    return response.data.data[0].embedding
}