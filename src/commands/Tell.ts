// Copyright (C) 2022 Guglietti Daniele
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import Client from "../client/Client";
import { ICommand, CommandData, GuildInteraction } from "../models/Command";

export default class Tell implements ICommand {
    constructor(readonly client: Client<true>) {}

    #data = new SlashCommandBuilder()
        .setName("tell")
        .setDescription("Invia un messaggio come il bot.")
        .addStringOption(option => option
            .setName("message")
            .setDescription("Il messaggio da inviare.")
            .setRequired(true)
        )
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("Il canale in cui inviare il messaggio.")
            .addChannelTypes([0, 5, 10, 11, 12])
            .setRequired(false)
        );

    get data(): CommandData {
        return this.#data
            .toJSON();
    }

    async execute(interaction: GuildInteraction) {
        const message = interaction.options.getString("message", true);
        const channel = interaction.options.getChannel("channel", false) ?? interaction.channel;

        if (!channel?.isText())
            return;

        const embed = new MessageEmbed()
            .setTitle("Messaggio Inviato.")
            .setDescription(`Il messaggio è stato inviato con successo in ${channel}.`)
            .setColor("#20baf7")
            .setTimestamp();

        channel.send(message);

        await interaction.reply({
            embeds: [embed]
        });
    }

}
