const { SlashCommandBuilder , EmbedBuilder} = require('discord.js');
const fs = require('fs');

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
        const nicknameUser = interaction.options.getString('nickname')
        const wcaIDUser = interaction.options.getString('wcaid')

		//check if wcaID was entered and doesnt exist
		const url = `https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${wcaIDUser}.json`
		let request = await fetch(url);

		if (request.status === 404 && wcaIDUser) {
			await interaction.reply(`This WCA ID doesn't exist. Please use all caps.`)
			return
		}
	
		const dataJSON = fs.readFileSync('./data/users.json', 'utf8');
		const data = JSON.parse(dataJSON);

		//initialize the entry if it doesn't exist
		if (!data.hasOwnProperty(discordID)) {
			data[discordID] = {nickname: null, wcaID: null};
		}
		//update the values
		data[discordID] = {	
			nickname: nicknameUser || data[discordID].nickname,
			wcaID: wcaIDUser || data[discordID].wcaID
		};

		const updatedJSON = JSON.stringify(data, null, 2);
		fs.writeFileSync('./data/users.json', updatedJSON, 'utf8');
	
		const embed = new EmbedBuilder()
			.setTitle(`${interaction.user.username}'s Information`)
			.setColor(0x0099FF)
			.addFields(
				{ name: 'Nickname', value: data[discordID].nickname || "unknown", inline: true},
				{ name: 'WCA ID', value: data[discordID].wcaID || "unknown", inline: true},
			)

	    await interaction.reply({ embeds: [embed] });
	},
};

