const { SlashCommandBuilder,  ActionRowBuilder, UserSelectMenuBuilder, UserSelectMenuOptionBuilder, EmbedBuilder  } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('test stuff'),
	async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Some title')
        .setDescription('Some description here')
        .addFields(

            { name: ' \u200b', value: 'Hamza \n Hamzaguiiiiiiiiiiiugu uiuhiuh' , inline: true},
            { name: ' \u200b', value: '7.44 \n 7.44' , inline: true},


            // { name: '\u200B', value: '\u200B' },
            // { name: 'Inline field title', value: 'Some value here', inline: true },
            // { name: 'Inline field title', value: 'Some value here', inline: true },
        )
    
    interaction.reply({ embeds: [exampleEmbed] });
	},
};

