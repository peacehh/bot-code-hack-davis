const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs')
const timeUtils = require('../../utils/timeUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editcompsim')
		.setDescription('Edit a time in the comp sim')
        .addStringOption(option =>
			option.setName('compname')
				.setDescription('Enter comp sim name')
				.setAutocomplete(true)
                .setRequired(true)
            )
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Enter competitor name')
                .setAutocomplete(true)
                .setRequired(true)
            )
        .addIntegerOption(option =>
            option.setName('solvenumber')
                .setDescription('Enter solve number')
                .setRequired(true)
            )
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Enter time')
                .setRequired(true)
            ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const focusedOption = interaction.options.getFocused(true);

        let compsimsJson = fs.readFileSync('./data/compsim.json', 'utf8');
		let compSims = JSON.parse(compsimsJson);

        if (focusedOption.name === 'compname') {
            const compNames = compSims.map(comp => comp.name);
            const filteredNames = compNames.filter(choice => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
            const formattedNames = filteredNames.map(choice => ({ name: choice, value: choice }))
            const trimmedNames = formattedNames.length > 25 ? formattedNames.splice(0, 25) : formattedNames
            await interaction.respond(trimmedNames);
        }

		if (focusedOption.name === 'name') {
			const compSim = compSims.find(comp => comp.name === interaction.options.getString('compname'));
            const ids = compSim ? Object.keys(compSim.times) : [];
            await interaction.respond(
                ids.map(id => ({ name: interaction.guild.members.cache.get(id).displayName || id, value: id })),
            );
		}
    },
    async execute(interaction) {
        const selectedCompName = interaction.options.getString('compname');
        const selectedName = interaction.options.getString('name');
        const selectedsolveNumber = interaction.options.getInteger('solvenumber');
        const enteredTime = interaction.options.getString('time');

        const compsimsJson = fs.readFileSync('./data/compsim.json', 'utf8');
		let compSims = JSON.parse(compsimsJson);
        const compNames = compSims.map(comp => comp.name);
        if (!compNames.includes(selectedCompName)) {
            await interaction.reply({content: `This comp name doesn't exist ${selectedCompName}`})
            return;
        }
        let compSim = compSims.find(comp => comp.name === selectedCompName);
        let ids = Object.keys(compSim.times)
        if(!ids.includes(selectedName)) {
            await interaction.reply({content: `This name doesn't exist ${selectedCompName}`})
            return;
        }
        if (selectedsolveNumber > compSim.times[selectedName].length || selectedsolveNumber < 0) {
            await interaction.reply({content: `This solve number is too large ${selectedsolveNumber}`})
            return;
        }
        if (!timeUtils.isValidTime(enteredTime)) {
            await interaction.reply({content: `This is not a valid time  ${enteredTime}`})
            return;
        }
        compSim.times[selectedName][selectedsolveNumber-1] = timeUtils.timeToCentiseconds(enteredTime);
        compSims = compSims.map(comp => comp.name===compSim.name?compSim:comp)            
        const updatedJSON = JSON.stringify(compSims, null, 2);
        fs.writeFileSync('./data/compsim.json', updatedJSON, 'utf8');

        await interaction.reply({content: `Sucess`})    
	} 
};