const {conversationModel,messageModel} = require('../relation')
module.exports = async(role, content, phone, session_id)=>{
    const conversation = await conversationModel.findOne({where:{
        phone
    }})
    await messageModel.create({role, content, conversation_id:conversation.id, session_id})
    const messages = await messageModel.findAll({attributes:['content'], where:{role, conversation_id:conversation.id},raw:true, order:[['id', 'DESC']], limit:3})
    return messages
}