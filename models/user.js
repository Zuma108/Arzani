const { DataTypes } = require('sequelize');
const sequelize = require('../server'); // Adjust the path as necessary

console.log('Imported sequelize instance:', sequelize);

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    picture: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    // Other model options go here
});

// Sync the model with the database
sequelize.sync()
    .then(() => {
        console.log('User table has been created.');
    })
    .catch(err => {
        console.error('Unable to create the table:', err);
    });

module.exports = User;
