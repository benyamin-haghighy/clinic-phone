const {clinicModel} = require('../relation')
const compareEmbedding = require('./compareEmnedding')
module.exports = async(embeddingText)=>{
    let documnets = await clinicModel.findAll({})
    documnets = await Promise.all(documnets.map(async(document)=>{
        return {
            content: `${document.title} : \n${document.content}`,
            embedding:JSON.parse(document.embedding),
            Similarity: await compareEmbedding(JSON.parse(document.embedding), embeddingText)
        }
    }))
    documnets = documnets.sort((a,b)=>b.Similarity-a.Similarity)
    console.log(
    documnets.map(document => ({
        content: document.content,
        Similarity: document.Similarity
    }))
)
    return documnets
}