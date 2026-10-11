const { spawn } = require('child_process')
const path = require('path')

module.exports = () => {
    console.log('🔊 PLAY AUDIO START')
    return new Promise((resolve, reject) => {

        const audioPath = path.join(__dirname,'../','../', 'audio','audio.wav')

        const player = spawn('afplay', [audioPath])

        player.on('error', (error) => {
            reject(error)
        })

        player.on('close', (code) => {
            console.log('🔊 PLAY AUDIO FINISHED')
            if (code === 0) {
                resolve()
            } else {
                reject(
                    new Error(`afplay exited with code ${code}`)
                )
            }
        })
    })
}