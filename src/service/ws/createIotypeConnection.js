const WebSocket = require('ws')
require('dotenv').config()

module.exports = () => {

    const ws = new WebSocket(
        'wss://iotype.com/socket/realtime'
    )

    ws.on('open', () => {

        console.log('Iotype connection is ok')
        console.log(
            'TOKEN EXISTS:',
            !!process.env.IO_TYPE_TOKEN
)
        ws.send(JSON.stringify({
            config: {
                model: 'io-fa',
                type: 'access_token',
                token: process.env.IO_TYPE_TOKEN
            }
        }))
    })

    

    return ws
}