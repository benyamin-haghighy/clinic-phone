const { DataTypes } = require('sequelize')
const sequelize = require('./config/db')
const conversationModel = require('./models/conversation')(sequelize, DataTypes)
const messageModel = require('./models/message')(sequelize, DataTypes)
const clinicModel = require('./models/clinic-documents')(sequelize,DataTypes)
const sessionModel = require('./models/session')(sequelize, DataTypes)
const user_audio = require('./models/user_audio')(sequelize, DataTypes)

conversationModel.hasMany(messageModel,{
    foreignKey:'conversation_id',
    onDelete:"CASCADE"
})

messageModel.belongsTo(conversationModel,{
    foreignKey:'conversation_id',
    onDelete:"CASCADE"
})

sessionModel.hasMany(messageModel, {
    foreignKey:"session_id"
})
messageModel.belongsTo(sessionModel, {
    foreignKey:"session_id"
})

module.exports={
    conversationModel,
    messageModel,
    clinicModel,
    sessionModel,
    user_audio
}
