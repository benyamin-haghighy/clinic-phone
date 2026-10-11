'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  message.init({
    role: {
        type: DataTypes.ENUM('user','assistant'),
        allowNull:false
      },
      content:{
        type:DataTypes.STRING,
        allowNull:false
      },
      conversation_id:{
        type:DataTypes.INTEGER,
        references:{
          model:"conversation",
          key:'id'
        },
        allowNull:false
      },
       session_id:{
        type:DataTypes.INTEGER,
        references:{
          model:'session',
          key:"id"
        },
        allowNull:false,
        onDelete:'CASCADE'
      }
  }, {
    sequelize,
    modelName: 'message',
    freezeTableName:true,
    timestamps:true
  });
  return message;
};