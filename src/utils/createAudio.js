const {user_audio} = require('../relation')
const fs = require('fs')
const path = require('path')
module.exports = async(phone)=>{
    const isAudioForPhone = await user_audio.findOne({where:{phone},raw:true})
    if (isAudioForPhone) {
        return 
    }
    fs.writeFileSync(path.resolve(__dirname, '../','audio', 'user_audio', `${phone}.wav`), '')
    const audio = await user_audio.create({phone, path:path.resolve(__dirname, '../','audio', 'user_audio', `${phone}.wav`)},{raw:true})
}