'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user_audio extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  user_audio.init({
    phone: {
        type: DataTypes.STRING,
        allowNull:false,
        unique:true
      },
      path:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true
      },
  }, {
    sequelize,
    modelName: 'user_audio',
    freezeTableName:true,
    timestamps:true
  });
  return user_audio;
};