const { SlashCommandBuilder } = require('discord.js');

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
        const member = interaction.member;
        const nickname = interaction.options.getString('nickname')
        const wcaID = interaction.options.getString('wcaid')


		let existingUser = await User.findOne({ where: { discordID: '123456789012345678' } });

        if (existingUser) {
            // If the user exists, update their data
            const existingUser = await existingUser.update({
                username: 'updated_username',
                usage_count: existingUser.usage_count + 1, // Increment usage count, for example
            });
        } else {
            // If the user doesn't exist, create a new user
            const newUser = await User.create({
                discordID: '123456789012345678', // Example Discord ID
                username: 'example_username',
            });
        }

        if(!wcaID && !nickname) {
            interaction.reply(`Well you didn't enter anything to update.`)
        } else if (!wcaID) {
		    interaction.reply(`Sucessfully updated ${member} information. Nickname: ${nickname}.`)
        } else if (!nickname) {
		    interaction.reply(`Sucessfully update ${member} information. WCA-ID: ${wcaID}.`)
        } else {
            interaction.reply(`Sucessfully update ${member} information. Nickname: ${nickname}, WCA-ID: ${wcaID}.`)
        }
	},
};

