
module.exports = async(vector_1,vector_2)=>{
    try {
        let dotProduct = 0
        let magnitudeA = 0
        let magnitudeB = 0

        for (let i = 0; i < vector_1.length; i++) {
            dotProduct += vector_1[i] * vector_2[i]

            magnitudeA += vector_1[i] ** 2
            magnitudeB += vector_2[i] ** 2
        }

        magnitudeA = Math.sqrt(magnitudeA)
        magnitudeB = Math.sqrt(magnitudeB)

        return dotProduct / (magnitudeA * magnitudeB)
    } catch (error) {
        console.log(error);
        
    }
}