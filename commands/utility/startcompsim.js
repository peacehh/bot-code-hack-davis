
const { SlashCommandBuilder , UserSelectMenuBuilder, ActionRowBuilder,ButtonBuilder, ButtonStyle, 
    MessageActionRow,  MessageButton, MessageSelectMenu, EmbedBuilder, time, TimestampStyles,
    Events, ModalBuilder, TextInputBuilder, TextInputStyle} = require('discord.js');
const {timeToCentiseconds , centisecondsToTime, isValidTime} = require('../../utils/time-functions')

const fs = require('fs')
const eventDataJSON = fs.readFileSync('./data/eventdata.json', 'utf8');
const eventData = JSON.parse(eventDataJSON);

//format eventData to add to command options
const eventDataArray = [];
for (const value in eventData) {
    eventDataArray.push({ "name": eventData[value], "value": value });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startcompsim')
		.setDescription('Start a comp sim!')
        .addStringOption(option =>
			option.setName('event')
				.setDescription('Which Event?')
				.setRequired(true)
				.addChoices(eventDataArray)
		)
        .addStringOption(option =>
			option.setName('compsimname')
				.setDescription('Enter the name for this comp sim')
				.setRequired(true)
		)
    ,async execute(interaction) {
        //create select menu
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId('selectusers')
			.setPlaceholder('Select competitors')
			.setMinValues(2)
			.setMaxValues(15);
		const row1 = new ActionRowBuilder()
			.addComponents(userSelect);
        //send menu
        const menuInteraction = await interaction.reply({
            content: 'Select competitors',
            components: [row1],
		});

        //retreive the selected competitors
        const collectorFilter = i => i.user.id === interaction.user.id && i.customId === 'selectusers';
        let selectedUsers;
        try {
            //wait for one minute
            const menuMessage = await menuInteraction.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
            selectedUsers = menuMessage.values;
            menuReply = selectedUsers.map(userId => `<@${userId}>`).join(' ');
            await menuMessage.update({content:`You selected: ${menuReply}`, components: [] });
        } catch (error) {
            //after one minute
            console.log(error)
            await interaction.editReply({ content: 'Selection not received within 1 minute, cancelling', components: [] });
            return; 
        }

        //create a map containing the discord id's and solve time for each competitor. undefined = solve not entered
        const solveTimes = new Map(selectedUsers.map(userId => [userId, []]));
        const eventID = interaction.options.getString('event');
		const eventName = eventData[eventID];
        const compSimName = interaction.options.getString('compsimname') + eventID + eventName;
        let currentSolver = nextCompetitor(solveTimes);
        const numberOfSolves = 5;
        const channel = interaction.channel;
        const members = interaction.guild.members;

        //comps sim info
        const scrambles = [
            //TODO: need to inplement a way to generate scrambles cant get cubing.js to work
            "D L B' L' U' L' F U R' F2 L2 D2 B' D2 R2 L2 B U2 D2 B'",
            "R L2 U' F2 L2 F2 R2 F2 D' F2 D' R2 U' F R' U' B2 D2 F U'",
            "L F2 R' F' L2 U F2 L U2 F2 D L2 F2 R2 F2 D' L2 B2 U'",
            "R' L2 F' D2 F2 U2 R2 F' D2 F L2 D B L D2 B2 R' D U B'",
            "B2 R' B2 R' D2 L R D2 F2 D2 R F' L2 D' R' D2 F2 L F' D'",
        ]

        const skipButton = new ButtonBuilder()
            .setCustomId('skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary);
        const enterTimeButton = new ButtonBuilder()
            .setCustomId('entertime')
            .setLabel('Enter Time')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(enterTimeButton, skipButton);

        //generate the embeds
        let messageEmbeds = await generateEmbed(solveTimes, members, currentSolver, compSimName, scrambles)
        //send the times embed and buttons
        let embedMessage = await channel.send({embeds: messageEmbeds, components: [row]});

        //runs when skip button pressed
        const skipCollector = embedMessage.createMessageComponentCollector({ filter: i => i.customId === 'skip'});
        skipCollector.on('collect', async skipInteraction => {  
            //finds another competitor
            const timesWithoutCurrectSolver = new Map(solveTimes);
            timesWithoutCurrectSolver.delete(currentSolver);
            const newCompetitor = nextCompetitor(timesWithoutCurrectSolver)
            if (nextSolveIndex(solveTimes.get(newCompetitor)) == numberOfSolves) {
                //button does nothing if no other competitors are available
                await skipInteraction.update({components: [row]});
                return;
            }
            //update solver
            currentSolver =  nextCompetitor(timesWithoutCurrectSolver)
            //update membed
            messageEmbeds = generateEmbed(solveTimes, members, currentSolver, compSimName, scrambles)
            await embedMessage.edit({embeds: messageEmbeds});
            await skipInteraction.update({components: [row]});
        });

        //runs when enter button pressed
        const enterTimeCollector = embedMessage.createMessageComponentCollector({ filter: i => i.customId === 'entertime'});
        enterTimeCollector.on('collect', async timeInteraction => {
            //disable button so multiple users can't use modal at the same time
            enterTimeButton.setDisabled(true);
            embedMessage.edit({components: [row]})

            // create the modal
            const timeModal = new ModalBuilder()
                .setCustomId('entertimemodal')
                .setTitle(`Enter time for ${members.cache.get(currentSolver).displayName}`);
            const timeInput = new TextInputBuilder()
                .setCustomId('timeinput')
                .setLabel("Time")
                .setStyle(TextInputStyle.Short);
            const inputRow = new ActionRowBuilder().addComponents(timeInput);
            timeModal.addComponents(inputRow);

            //send modal
            await timeInteraction.showModal(timeModal);

            // retreive time from modal 
            const filter = (i) => i.customId==="entertimemodal"
            let time;
            try {
                const modalResponse = await timeInteraction.awaitModalSubmit({ filter, time: 20_000 });

                time = modalResponse.fields.getTextInputValue('timeinput');
                if (!isValidTime(time)) {
                    //send message
                    await modalResponse.reply(`This format (${time}) is not supported.`);
                    setTimeout(() => { modalResponse.deleteReply() }, 5_000);
                    //reenable button
                    enterTimeButton.setDisabled(false);
                    embedMessage.edit({components: [row]})
                    return;
                }
                // silently resolve modal interaction
                await modalResponse.deferUpdate();
  
            } catch (error) {
                //runs when modal time is exceeded
                console.error(error);
                //reenable button
                enterTimeButton.setDisabled(false);
                embedMessage.edit({components: [row]})
                return;
            }

            
            //updates the solveTimes, current solver, and the message.
            const times = solveTimes.get(currentSolver);
            times[nextSolveIndex(times)] = timeToCentiseconds(time);


            //check if comp sim is over
            const over = nextSolveIndex(solveTimes.get(nextCompetitor(solveTimes))) === numberOfSolves
            if (over)  {
                messageEmbeds = generateEmbed(solveTimes, members, currentSolver, compSimName, scrambles)
                embedMessage.edit({embeds: messageEmbeds, components: []});
                return;
            };

            currentSolver = nextCompetitor(solveTimes)
            messageEmbeds = generateEmbed(solveTimes, members, currentSolver, compSimName, scrambles)
            await embedMessage.edit({embeds: messageEmbeds});

            //reenable button
            enterTimeButton.setDisabled(false);
            embedMessage.edit({components: [row]})
        });
	},
};

function nextSolveIndex(times) {
    let solveNumber = times.findIndex(time => time === undefined);
    if (solveNumber === -1 ) 
        solveNumber = times.length

    return solveNumber
}

function nextCompetitor(timeData) {
    let shortestLength = Infinity;
    let shortestUserID = null;

    timeData.forEach((times, userId) => {
        if (nextSolveIndex(times) < shortestLength) {
            shortestLength = (nextSolveIndex(times)) ;
            shortestUserID = userId;
        }
    });
    return shortestUserID;
}

function generateEmbed(timeData, members, competitor, compName, scrambles) {
    const infoEmbed = new EmbedBuilder()
        .setTitle("NEXT COMPETITOR")
        .setColor(0x0099FF)
        .addFields(
            { name: `Name:`, value:` <@${competitor}>`},
            { name: `Scramble:`, value:`${scrambles[nextSolveIndex(timeData.get(competitor))]}`},
    );

    function sum(numbers) {
        return numbers.reduce((acc, curr) => acc + curr, 0);
    }
    const timesEmbed = new EmbedBuilder()
        .setTitle("RESULTS")
        .setColor(0x0099FF)

    //add the times for each competitor to the embed
    timeData.forEach((times, userId) => {
        let stat;
        const arr = timeData.get(userId)
        if (times.length === 4) {
            const bpa = centisecondsToTime((sum(arr)-Math.max(...arr))/3);
            const wpa = centisecondsToTime((sum(arr)-Math.min(...arr))/3);
            stat = ` (bpa ${bpa} wpa ${wpa})`;
        } else if (times.length === 5) {
            const avg = centisecondsToTime((sum(arr)-Math.max(...arr)-Math.min(...arr))/3);
            stat = ` (avg ${avg})`;
        } else if (times.length === 0) {
            stat = '';
        } else {
            const mean = centisecondsToTime(sum(arr)/times.length);
            stat = ` (mean ${mean})`;
        }

        timesEmbed.addFields(
            {name:`${members.cache.get(userId).displayName} ${stat}`, 
            value: times.map(time => centisecondsToTime(time)).join('  ') + '\u200B'}
        )
    });
    
    return [infoEmbed, timesEmbed]
}