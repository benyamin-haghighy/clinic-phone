const embeddingText = require('../service/embedding/embedding.services')
const {clinicModel} = require('../relation')

module.exports = async({title,content})=>{
    try {
        const response = await embeddingText(`${title}:\n${content}`)
        console.log(response);
        
        const clinic_document = await clinicModel.create({content, title,embedding: JSON.stringify(response)},{raw:true})
        console.log(clinic_document);
        
    } catch (error) {
        console.log(error);
    }
}