const {conversationModel,messageModel} = require('../relation')
module.exports = async(phone) =>{
    const conversation = await conversationModel.findOne({where:{phone}})
    const allMessages = await messageModel.findAll({attributes:['role', 'content'], where:{conversation_id:conversation.id}, raw:true, order:[['id', 'DESC']], limit:4})
    return allMessages
}