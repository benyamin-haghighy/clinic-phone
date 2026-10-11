const server = require('./app')
const sequelize = require('./config/db')
const { PORT } = require('./config/settings')

const startServer = async () => {
         sequelize.authenticate().catch((error) => {
            console.log('sequelize error -> ', error.message);
            process.exit(1)
            
        })
        server.listen(PORT, () => {
            console.log(`server is running on port ${PORT}`)
        })
    }
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
})

startServer()