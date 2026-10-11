'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('message', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      role: {
        type: Sequelize.ENUM('user','assistant'),
        allowNull:false
      },
      content:{
        type:Sequelize.STRING,
        allowNull:false
      },
      conversation_id:{
        type:Sequelize.INTEGER,
        references:{
          model:"conversation",
          key:'id'
        },
        allowNull:false,
        onDelete:"CASCADE"
      },
      session_id:{
        type:Sequelize.INTEGER,
        references:{
          model:'session',
          key:"id"
        },
        allowNull:false,
        onDelete:'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('message');
  }
};