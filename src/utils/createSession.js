const { sessionModel } = require('./../relation')

module.exports = async(phone)=>{
    const session = await sessionModel.create({phone})
    return session
}