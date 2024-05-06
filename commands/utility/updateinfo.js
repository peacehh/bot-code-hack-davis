const { SlashCommandBuilder , EmbedBuilder} = require('discord.js');
const { sequelize , users} = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('updateinfo')
		.setDescription('Update your information')
        .addStringOption(option =>
			option.setName('nickname')
				.setDescription('Enter what you like to be called')
				.setRequired(false)
		)
        .addStringOption(option =>
			option.setName('wcaid')
				.setDescription('Enter your WCA ID (optional)')
				.setRequired(false)
		)
,
	async execute(interaction) {
		const discordID = interaction.user.id
        const nickname = interaction.options.getString('nickname')
        const wcaID = interaction.options.getString('wcaid')

		//check if wcaID was entered and doesnt exist
		const url = `https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${wcaID}.json`
		let request = await fetch(url);

		if (request.status === 404 && wcaID) {
			await interaction.reply(`This WCA ID doesn't exist. Please use all caps.`)
			return
		}
	
		let entry = await users.findOne({ where: { discordID: discordID } });
			
		if (entry) {
			await entry.update({
				nickname: nickname || entry.nickname,
				wcaID: wcaID || entry.wcaID
			});
		} else {
			//create assigns entry a new entry if query results in undefined
			entry = await users.create({
				discordID: discordID,
				nickname: nickname,
				wcaID: wcaID,		
			});	
		}

		const response = new EmbedBuilder()
			.setTitle(`${interaction.user.username}'s Information`)
			.setColor(0x0099FF)
			.addFields(
				{ name: 'Nickname', value: entry.nickname || "unknown", inline: true},
				{ name: 'WCA ID', value: entry.wcaID || "unknown", inline: true},
		)
		//retreive new data in database
	    await interaction.reply({ embeds: [response] });
	},
};

