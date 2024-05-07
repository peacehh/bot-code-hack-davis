
const { SlashCommandBuilder , UserSelectMenuBuilder, ActionRowBuilder,ButtonBuilder, ButtonStyle, 
    MessageActionRow,  MessageButton, MessageSelectMenu, EmbedBuilder, time, TimestampStyles,
    Events, ModalBuilder, TextInputBuilder, TextInputStyle} = require('discord.js');
const { col } = require('sequelize');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startcompsim')
		.setDescription('Start a comp sim!'),
	async execute(interaction) {

		const userSelect = new UserSelectMenuBuilder()
			.setCustomId('selectusers')
			.setPlaceholder('Select competitors')
			.setMinValues(2)
			.setMaxValues(10);

		const row1 = new ActionRowBuilder()
			.addComponents(userSelect);

        const interactionResponse = await interaction.reply({
            content: 'Select competitors',
            components: [row1],
		});

        const collectorFilter = i => i.user.id === interaction.user.id && i.customId === 'selectusers';

        //retreive the selected competitors in one minute otherwise 
        let selectedUsers;
        try {
            const userSelection = await interactionResponse.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            // Process user selection
            selectedUsers = userSelection.values;
            selectedUserMentions = selectedUsers.map(userId => `<@${userId}>`).join(' ');

            // Send confirmation back to the user
            await userSelection.update(`You selected: ${selectedUserMentions}`);

        } catch (error) {
            console.log(error)
            await interaction.editReply({ content: 'Selection not received within 1 minute, cancelling', components: [] });
            return; 
        }

        //create a map containing the discord id's and solve time for each competitor. undefined = solve not entered
        const solveTimes = new Map();
        selectedUsers.forEach(userId => {
            solveTimes.set(userId, new Array(5).fill(undefined));
        });

        //comps sim info
        const compSimName = 'Comp Sim 1';
        let currentSolver = nextCompetitor(solveTimes);
        const channel = interaction.channel
        const members = interaction.guild.members
        //button to skip solve
        const skip = new ButtonBuilder()
            .setCustomId('skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Danger);

        //button to enter time
        const enterTime = new ButtonBuilder()
            .setCustomId('entertime')
            .setLabel('Enter Time')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(skip, enterTime);

        //embed for the times
        let timesEmbed = generateEmbed(solveTimes, members, currentSolver, compSimName)

        //send the times embed and buttons
        let resultsMessage = await channel.send({embeds: [timesEmbed]});
        let buttonMessage = await channel.send({components: [row]})
        //runs when skip button pressed
        const skipCollector = buttonMessage.createMessageComponentCollector({ filter: i => i.customId === 'skip'});
        skipCollector.on('collect', async skipInteraction => {
            const timesWithoutCurrectSolver = new Map(solveTimes);
            timesWithoutCurrectSolver.delete(currentSolver);
            currentSolver = nextCompetitor(timesWithoutCurrectSolver)
            timesEmbed = generateEmbed(solveTimes, members, currentSolver, compSimName)
            await resultsMessage.edit({embeds: [timesEmbed]});
            await skipInteraction.reply({ content: 'skip clicked!' });
        });

        //runs when enter button pressed
        const enterTimeCollector = buttonMessage.createMessageComponentCollector({ filter: i => i.customId === 'entertime'});
        enterTimeCollector.on('collect', async timeInteraction => {
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
                const modalResponse = await timeInteraction.awaitModalSubmit({ filter, time: 10_000 });
                time = modalResponse.fields.getTextInputValue('timeinput');
                if (isNaN(time)) {
                    await modalResponse.reply("Please enter a valid number for time.");
                    setTimeout(() => {
                        modalResponse.deleteReply()
                    }, 3_000);
                    return;
                } else {
                    await modalResponse.reply(`selected time ${time}`);
                    setTimeout(() => {
                        modalResponse.deleteReply()
                    }, 3_000);  
                }
            } catch (error) {
                console.error(error);
                return;
            }
            

            //updates the solveTimes
            solveTimes.get(currentSolver)[nextSolveIndex(currentSolver,solveTimes)] = time;
            currentSolver = nextCompetitor(solveTimes)
            timesEmbed = generateEmbed(solveTimes, members, currentSolver, compSimName)
            await resultsMessage.edit({embeds: [timesEmbed]});

        });
	},
};

function nextCompetitor(timeData) {
    let minSolves = Infinity;
    let userWithLeastSolves;

    timeData.forEach((times, userId) => {
        const solvesCompleted = times.filter(time => time !== undefined).length;
        if (solvesCompleted < minSolves) {
            minSolves = solvesCompleted;
            userWithLeastSolves = userId;
        }
    });

    return userWithLeastSolves;
}

function nextSolveIndex(userId, timeData) {
    const userSolves = timeData.get(userId).filter(time => time !== undefined).length;
    return userSolves;
}

function generateEmbed(timeData, members, competitor, compName) {

    //format times in a string where each line contains the discord username followed by the solve times
    let solveTimesString = "";
    timeData.forEach((times, userId) => {
        let row = `<@${userId}>: `;
        row += times.filter(time => time !== undefined).join(', ');
        row += '\n';
        solveTimesString += row;
    });

    const timesEmbed = new EmbedBuilder()
        .setTitle(compName)
        .setColor(0x0099FF)
        .addFields(
            { name: '\u200B', value: solveTimesString},
            { name: `Next Solver:`, value: `<@${competitor}>`}
        );
    
    return timesEmbed
        
}


