const { SlashCommandBuilder , EmbedBuilder } = require('discord.js');
const fs = require('fs')

const {centisecondsToTime} = require('../../utils/time-functions')
const eventDataJSON = fs.readFileSync('./data/eventdata.json', 'utf8');
const eventData = JSON.parse(eventDataJSON);

//format eventData to add to command options
const eventDataArray = [];
for (const value in eventData) {
    eventDataArray.push({ "name": eventData[value], "value": value });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('officalranks')
		.setDescription('Club ranking based on official results')
		.addStringOption(option =>
			option.setName('event')
				.setDescription('Which Event?')
				.setRequired(true)
				.addChoices(eventDataArray)
		)
		.addStringOption(option =>
			option.setName('singleoraverage')
				.setDescription('Single or Average')
				.setRequired(true)
				.addChoices(
					{"value":"singles","name":"Single"},
					{"value":"averages","name":"Average"},
				)
		),
	async execute(interaction) {
		//defer reply
		await interaction.deferReply();
		const averageOrSingle = interaction.options.getString('singleoraverage');
		const formattedAverageOrSingle = averageOrSingle.charAt(0).toUpperCase() + averageOrSingle.slice(1, -1);
		const requestedEventID = interaction.options.getString('event');
		const requestedEventName = eventData[requestedEventID];
		
		//retreive club wcaID's
		const wcaIDs = [];
		const usersJSON = fs.readFileSync('./data/users.json', 'utf8');
		const users = JSON.parse(usersJSON);
		Object.values(users).forEach(user => {
			if (user.wcaID !== null) {
				wcaIDs.push(user.wcaID);
			}
		});

		let times = {}
		//loop through wca ids
		for (let wcaID of wcaIDs) {
			const endpoint = 'https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/' 
				 + 'persons/' + wcaID + '.json';
			//get data
			let request = await fetch(endpoint);
			let response = await request.json();
			//retreive pr 
			const wcaData = response.rank[averageOrSingle].find(obj => obj.eventId === requestedEventID);
			if (wcaData !== undefined) {
				//add pr to 'times'
				times[response.name] = wcaData.best
			}
		}

		if (Object.keys(times).length === 0) {
			interaction.editReply("no results :(");
			return;
		}

		//convert times into an array, sort prs, change time format
		let sortedTimes = Object.entries(times)
			.sort((a, b) => a[1] - b[1])
			.map(entry => [entry[0], centisecondsToTime(entry[1])]);		

		// format in disord embed using columns (looks better but columns are stacked on mobile)
		// const namesColumn = sortedTimes.map(entry => entry[0]).join('\n');
		// const timeColumn = sortedTimes.map(entry => entry[1]).join('\n');

		// const alignedEmbed = new EmbedBuilder()
		// 	.setTitle(`${requestedEventName} ${formattedAverageOrSingle} Rankings`)
		// 	.setColor(0x0099FF)
		// 	.addFields(
		// 		{ name: 'Name', value: namesColumn , inline: true},
		// 		{ name: 'Time', value: timeColumn , inline: true},
		// 	)
		
		//format in resuts in embed
		const timesField = sortedTimes.map(entry => "**"+ entry[0] + "**"+ `: ` + entry[1]).join('\n'); //
		const ranksEmbed = new EmbedBuilder()
			.setTitle(`${requestedEventName} ${formattedAverageOrSingle} Rankings`)
			.setColor(0x0099FF)
			.addFields(
				{ name: '\u200B', value: timesField},
			)
			
		//send embed
	    await interaction.editReply({ embeds: [ranksEmbed] });
	}
};