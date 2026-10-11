const STATUS = { CLOSE:"close"}
module.exports = (wsConnection, state, code, reason) => {
    state.status = STATUS.CLOSE
    clearTimeout(state.turnCompletionTimer)
    state.stt?.close()
    state.stt = null
    if (wsConnection.readyState === 1) {
        wsConnection.send(JSON.stringify({ command: 'HANGUP' }))
        wsConnection.close(code, reason)
    }
}