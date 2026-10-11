const WebSocket = require('ws')
const { WS_PORT,WS_HOST } = require('../../config/settings')

module.exports = (handleCall) => {
    const wss = new WebSocket.Server({ port: WS_PORT, host:WS_HOST })
    wss.on('connection', (wsConnection, req) => {
        handleCall(wsConnection, req).catch((error) => {
            console.error('handleCall error:', error.message)
            wsConnection.close(1011, 'server error')
        })
    })

    wss.on('error', (error) => {
        console.error('WebSocket server error:', error.message)
        if (error.code === 'EADDRINUSE') {
            process.exit(1)
        }
    })

    console.log(`WebSocket server is listening on port ${WS_PORT}`)
}