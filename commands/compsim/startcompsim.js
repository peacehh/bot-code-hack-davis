
const { SlashCommandBuilder , UserSelectMenuBuilder, ActionRowBuilder,ButtonBuilder, ButtonStyle, 
    MessageActionRow,  MessageButton, MessageSelectMenu, EmbedBuilder, time, TimestampStyles,
    Events, ModalBuilder, TextInputBuilder, TextInputStyle} = require('discord.js');
const timeUtils = require('../../utils/timeUtils');

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
		const menu = new ActionRowBuilder()
			.addComponents(userSelect);
        //send menu
        const menuInteraction = await interaction.reply({content: 'Select competitors', components: [menu]});

        //retreive the selected competitors
        const collectorFilter = i => i.user.id === interaction.user.id && i.customId === 'selectusers';
        let selectedUsers;
        try {
            //wait for one minute
            const menuMessage = await menuInteraction.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
            selectedUsers = menuMessage.values;
            const menuReply = selectedUsers.map(userId => `<@${userId}>`).join(' ');
            await menuMessage.update({content:`You selected: ${menuReply}`, components: [] });
        } catch (error) {
            //after one minute
            console.log(error)
            await interaction.editReply({ content: 'Selection not received, try again', components: [] });
            return; 
        }
        const members = interaction.guild.members;
        const scrambles = [
            //TODO: need to inplement a way to generate scrambles cant get cubing.js to work
            "D L B' L' U' L' F U R' F2 L2 D2 B' D2 R2 L2 B U2 D2 B'",
            "R L2 U' F2 L2 F2 R2 F2 D' F2 D' R2 U' F R' U' B2 D2 F U'",
            "L F2 R' F' L2 U F2 L U2 F2 D L2 F2 R2 F2 D' L2 B2 U'",
            "R' L2 F' D2 F2 U2 R2 F' D2 F L2 D B L D2 B2 R' D U B'",
            "B2 R' B2 R' D2 L R D2 F2 D2 R F' L2 D' R' D2 F2 L F' D'",
        ]
        //create newCompSim object
        const timesObject = {};
        selectedUsers.forEach(id => timesObject[id] = []);
        let compSimObject =  {
            name: interaction.options.getString('compsimname'),
            eventID: interaction.options.getString('event'),
            scrambles: scrambles,
            times: timesObject
        };
        //assign curent solver
        let currentSolver = nextCompetitor(compSimObject);
        //read compsim file
        let compsimsJson = fs.readFileSync('./data/compsim.json', 'utf8');
		let compSims = JSON.parse(compsimsJson);
        //check is comp sim name already exists
        if (compSims.find(comp=>comp.name===compSimObject.name)) {
            interaction.editReply(
                { content: `This comp sim (${compSimObject.name}) already exists. Please use another name`, components: [] }
            );
            return;
        }
        //add newCompSim to json
        compSims.push(compSimObject)
        const updatedJSON = JSON.stringify(compSims, null, 2);
		fs.writeFileSync('./data/compsim.json', updatedJSON, 'utf8');

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
        let messageEmbeds = generateEmbed(compSimObject, members, currentSolver)
        //send the times embed and buttons
        let embedMessage = await interaction.channel.send({embeds: messageEmbeds, components: [row]});

        //runs when skip button pressed
        const skipCollector = embedMessage.createMessageComponentCollector({ filter: i => 
            i.customId === 'skip' && selectedUsers.includes(i.user.id) 
        });
        skipCollector.on('collect', async skipInteraction => {  
            //finds another competitor
            const { [currentSolver]: times, ...otherCompetitors } = compSimObject.times;
            const newCompetitor = nextCompetitor({times:otherCompetitors})
            if (compSimObject.times[newCompetitor].length !== 5) { 
                currentSolver = newCompetitor;
            }
            messageEmbeds = generateEmbed(compSimObject, members, currentSolver);
            await embedMessage.edit({embeds: messageEmbeds});
            await skipInteraction.update({components: [row]});
        });

        //runs when enter button pressed
        const enterTimeCollector = embedMessage.createMessageComponentCollector({ filter: i => 
            i.customId === 'entertime' && selectedUsers.includes(i.user.id) 
        });
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
                if (!timeUtils.isValidTime(time)) {
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

            //read data
            let compsimsJson = fs.readFileSync('./data/compsim.json', 'utf8');
            let compSims = JSON.parse(compsimsJson);
            //update compSimObject to value in the json
            let compSimFile = compSims.find(comp=>comp.name===compSimObject.name);
            compSimObject = compSimFile;
            //update time in compSimObject
            console.log(time);
            console.log(timeUtils.timeToCentiseconds(time))
            const solveIndex = compSimObject.times[currentSolver].length
            compSimObject.times[currentSolver][solveIndex] = timeUtils.timeToCentiseconds(time);

            //update json file
            compSims = compSims.map(comp => comp.name===compSimObject.name?compSimObject:comp)            
            const updatedJSON = JSON.stringify(compSims, null, 2);
            fs.writeFileSync('./data/compsim.json', updatedJSON, 'utf8');

            //check if comp sim is over
            if (compSimObject.times[nextCompetitor(compSimObject)].length === 5)  {
                messageEmbeds = generateEmbed(compSimObject, members, currentSolver)
                embedMessage.edit({embeds: messageEmbeds, components: []});
                return;
            };

            //update current solver
            currentSolver = nextCompetitor(compSimObject);
            //update embed
            messageEmbeds = generateEmbed(compSimObject, members, currentSolver);
            await embedMessage.edit({embeds: messageEmbeds});

            //reenable button
            enterTimeButton.setDisabled(false);
            embedMessage.edit({components: [row]})
        });
	},
};

function nextCompetitor(compSimObject) {
    let shortestLength = Infinity;
    let shortestUserID = null;
    Object.keys(compSimObject.times).forEach(id => {
        if (compSimObject.times[id].length < shortestLength) {
            shortestLength = compSimObject.times[id].length;
            shortestUserID = id;
        }
    });
    return shortestUserID;
}

function generateEmbed(compSimObject, members, currentSolver) {
    const infoEmbed = new EmbedBuilder()
        .setTitle("NEXT COMPETITOR")
        .setColor(0x0099FF)
        .addFields(
            { name: `Name:`, value:` <@${currentSolver}>`},
            { name: `Scramble:`, value:`${compSimObject.scrambles[compSimObject.times[currentSolver].length]}`},
        );

    function sum(numbers) {
        return numbers.reduce((acc, curr) => acc + curr, 0);
    }
    const timesEmbed = new EmbedBuilder()
        .setTitle("RESULTS: " + compSimObject.name)
        .setColor(0x0099FF)

    //add the times for each competitor to the embed
    Object.entries(compSimObject.times).forEach(([userId,times]) => {
        let stat;
        if (times.length === 4) {
            const bpa = timeUtils.centisecondsToTime(timeUtils.bpa(times));
            const wpa = timeUtils.centisecondsToTime(timeUtils.wpa(times));
            stat = ` (bpa ${bpa} wpa ${wpa})`;
        } else if (times.length === 5) {
            const avg = timeUtils.centisecondsToTime(timeUtils.wcaAverage(times));
            stat = ` (avg ${avg})`;
        } else if (times.length === 0) {
            stat = '';
        } else {
            const mean = timeUtils.centisecondsToTime(timeUtils.mean(times));
            stat = ` (mean ${mean})`;
        }

        timesEmbed.addFields(
            {name:`${members.cache.get(userId).displayName} ${stat}`, 
            value: times.map(time => timeUtils.centisecondsToTime(time)).join('  ') + '\u200B'}
        )
    });
    if (compSimObject.times[nextCompetitor(compSimObject)].length === 5) {
        return [timesEmbed]
    }
    return [timesEmbed, infoEmbed]
}