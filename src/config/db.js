
const path = require('path')
require('dotenv').config({path:path.join(__dirname, '..', '.env')})
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME || 'clinic-speak',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false
    }
)

module.exports = sequelize