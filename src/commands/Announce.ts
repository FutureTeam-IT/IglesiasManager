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
import { MessageActionRow, MessageButton, MessageEmbed, User } from "discord.js";

import { GuildInteraction, ICommand, CommandData } from "../models/Command";
import Client from "../client/Client";

import { channels } from "../config.json";

export default class Announce implements ICommand {
    constructor(readonly client: Client<true>) {}

    #data = new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Invia un annuncio.")
        .addStringOption(option => option
            .setName("title")
            .setDescription("Titolo dell'annuncio.")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("description")
            .setDescription("Descrizione dell'annuncio.")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("color")
            .setDescription("Il colore dell'annuncio espresso in esadecimale (#xxxxxx).")
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName("image")
            .setDescription("Link dell'immagine dell'annuncio.")
            .setRequired(false)
        );

    get data(): CommandData {
        return this.#data
            .toJSON();
    }

    async execute(interaction: GuildInteraction): Promise<void> {
        const title = interaction.options.getString("title", true);
        const description = interaction.options.getString("description", true);
        const color = interaction.options.getString("color", false);
        const img = interaction.options.getString("image", false);

        const embed = this.#embed(title, description, interaction.user, color, img);
        const actions = this.#actions();

        if (!interaction.channel) {
            return;
        }

        await interaction.reply({
            content: "Vuoi inviare il seguente annuncio?",
            embeds: [embed],
            components: [actions],
            ephemeral: true
        });

        const collector = interaction.channel.createMessageComponentCollector({
            time: 60e3,
            max: 1,
            componentType: "BUTTON"
        });

        collector.on("collect", async (button) => {
            if (button.customId === "cancel") {
                this.#cancel(interaction);
                return button.reply("L'annuncio è stato annullato.");
            }

            if (button.customId === "send-announce") {
                this.#send(embed, interaction);
                return button.reply("L'annuncio è stato inviato.");
            }
        });

        collector.on("end", collected => {
            if (!collected.size) {
                this.#cancel(interaction);
            }
        });
    }

    #embed = (
        title: string,
        description: string,
        author: User,
        color: string | null,
        img: string | null
    ) => {
        const embed = new MessageEmbed()
            .setTitle(title)
            .setDescription(description)
            .setAuthor({ name: author.username, iconURL: author.displayAvatarURL() })
            .setTimestamp();

        if (color && this.#isColor(color)) {
            embed.setColor(color);
        }

        if (img && this.#isURL(img)) {
            embed.setImage(img);
        }

        return embed;
    };

    #actions = () => new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("send-announce")
                .setLabel("Pubblica")
                .setEmoji("✅")
                .setStyle("PRIMARY"),
            new MessageButton()
                .setCustomId("cancel")
                .setLabel("Annulla")
                .setEmoji("❌")
                .setStyle("SECONDARY")
        );

    #cancel = (interaction: GuildInteraction) => {
        const button = new MessageActionRow()
            .setComponents(
                new MessageButton()
                    .setCustomId("cancel")
                    .setLabel("Annullato.")
                    .setStyle("DANGER")
                    .setEmoji("❌")
                    .setDisabled(true)
            );

        interaction.editReply({
            content: "Annuncio annullato!",
            components: [button]
        });
    };

    #send = async (embed: MessageEmbed, interaction: GuildInteraction) => {
        const channel = interaction.guild.channels.cache
            .get(channels.announce);

        if (!channel || !channel.isText()) {
            await interaction.editReply({
                content: "Non è stato possibile trovare il canale di annunci.",
                embeds: [],
                components: []
            });

            return;
        }

        await channel.send({ embeds: [embed] });

        const button = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId("send-announce")
                    .setLabel("Pubblicato.")
                    .setEmoji("📢")
                    .setStyle("SUCCESS")
                    .setDisabled(true)
            );

        await interaction.editReply({
            content: "Annuncio inviato!",
            components: [button],
        });
    };

    // eslint-disable-next-line no-useless-escape
    #isURL = (url: string) => /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
        .exec(url);

    #isColor(color: string): color is `#${string}` {
        return /#[0-9a-fA-F]{3,6}/.test(color);
    }
}