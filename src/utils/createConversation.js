const {conversationModel} = require('../relation')

module.exports = async(phone) =>{
    let conversation = await conversationModel.findOne({where:{phone}})
    if (!conversation) {
        conversation = await conversationModel.create({phone})
    }
    return conversation
}