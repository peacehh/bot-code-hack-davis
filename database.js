const Sequelize = require('sequelize')


//declare database
const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'db.sqlite',
});

//define table
const users = sequelize.define('users', {
	discordID: {
		type: Sequelize.STRING,
        primaryKey: true,
		unique: true,
	},
	wcaID: {
		type: Sequelize.STRING,
		unique: true,
	},
	username: Sequelize.STRING,
});
 

module.exports = {
    sequelize,
    users
};