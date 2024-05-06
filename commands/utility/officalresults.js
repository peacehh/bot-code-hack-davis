const { SlashCommandBuilder , EmbedBuilder, TimestampStyles } = require('discord.js');
const { users } = require('../../database');
const Sequelize  = require('sequelize');

eventData = [
	{"value":"333","name":"3x3x3 Cube"},
	{"value":"222","name":"2x2x2 Cube"},
	{"value":"444","name":"4x4x4 Cube"},
	{"value":"555","name":"5x5x5 Cube"},
	{"value":"666","name":"6x6x6 Cube"},
	{"value":"777","name":"7x7x7 Cube"},
	{"value":"333oh","name":"3x3x3 One-Handed"},
	{"value":"333bf","name":"3x3x3 Blindfolded"},
	{"value":"333mbf","name":"3x3x3 Multi-Blind"},
	{"value":"333fm","name":"3x3x3 Fewest Moves"},
	{"value":"444bf","name":"4x4x4 Blindfolded"},
	{"value":"555bf","name":"5x5x5 Blindfolded"},
	{"value":"clock","name":"Clock"},
	{"value":"minx","name":"Megaminx"},
	{"value":"pyram","name":"Pyraminx"},
	{"value":"skewb","name":"Skewb"},
	{"value":"sq1","name":"Square-1"},
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('officalranks')
		.setDescription('Club ranking based on official results')
		.addStringOption(option =>
			option.setName('event')
				.setDescription('Which Event?')
				.setRequired(true)
				.addChoices(...eventData)
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
		const requestedEventName = eventData.find(obj => obj.value === requestedEventID).name;
		const BASE_URL = 'https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/';

		//query wcaIDs
		const usersWithWCAIDs = await users.findAll({
			attributes: ['wcaID'],
			where: {
			  wcaID: {
				[Sequelize.Op.not]: null
			  }
			}
		});

		let wcaIDs = usersWithWCAIDs.map(user => user.wcaID);

		// const wcaIDs = ['2011CHOI04', '2018HAFE01', '2013MURU01', '2016MARI14', '2012LUGT01', '2022TOKU02', 
		// '2016GUZM13', '2017GILL06', '2023SHIN31', '2024WONG08']

		let times = {}
		//loop through wca ids
		for (let i = 0; i < wcaIDs.length; i++) {
			let wcaID = wcaIDs[i]
			let endpoint =  BASE_URL + 'persons/' + wcaID + '.json'
			//get data
			let request = await fetch(endpoint);
			let response = await request.json();
			//retreive pr 
			const eventData = response.rank[averageOrSingle].find(obj => obj.eventId === requestedEventID);
			if (eventData !== undefined) {
				//add pr to 'times'
				let bestTime = eventData.best;
				let personName = response.name
				times[personName] = bestTime
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
		const timesField = sortedTimes.map(entry => "**"+ entry[0] + "**"+ `: ` + entry[1]).join('\n'); 
		const nonalignedEmbed = new EmbedBuilder()
			.setTitle(`${requestedEventName} ${formattedAverageOrSingle} Rankings`)
			.setColor(0x0099FF)
			.addFields(
				{ name: '\u200B', value: timesField},
			)
			
		//send embed
	    await interaction.editReply({ embeds: [nonalignedEmbed] });
	}
};


function centisecondsToTime(centiseconds) {
    // Calculate minutes, seconds, and centiseconds
    const minutes = Math.floor(centiseconds / 6000);
    centiseconds %= 6000;
    const seconds = Math.floor(centiseconds / 100);
    centiseconds %= 100;

    // Pad single-digit seconds and centiseconds with leading zeros if necessary
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedCentiseconds = String(centiseconds).padStart(2, '0');

    // Construct the formatted time string
    let formattedTime = '';
    if (minutes > 0) {
        formattedTime += `${minutes}:`;
    }

    formattedTime += `${formattedSeconds}.${formattedCentiseconds}`;

    return formattedTime;
}