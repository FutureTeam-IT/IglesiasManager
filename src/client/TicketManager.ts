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

import { Ticket, TicketCategory } from "@prisma/client";
import { Guild, Message, MessageActionRow, MessageEmbed, MessageReaction, MessageSelectMenu, TextChannel, User } from "discord.js";
import Client from "./Client";

type Emoji = "🆘" | "🕵️";

interface EmojiMap {
    [key: string]: TicketCategory;
}

type TicketMessageReaction = MessageReaction & {
    emoji: { name: Emoji }
    message: Message<true> & {
        channel: TextChannel
    }
};


export default class TicketManager {
    static readonly emoji: EmojiMap = {
        "🆘": "SUPPORTO",
        "🕵️": "PROVINO"
    };

    static embed = (ticket: Ticket) => new MessageEmbed()
        .setTitle("Ticket Aperto")
        .setDescription(`Hai aperto un ticket per \`${ticket.caregory.toLowerCase()}\`.
        ${ticket.caregory === "SUPPORTO" ?
        "Attendi una risposta dello staff." :
        "Seleziona il ruolo per il provino."}
        Per chiudere il ticket premi 🔒.
        `)
        .setColor(0xFFFD37);

    constructor(private readonly client: Client<boolean>) { }

    isTicketRequest(reaction: MessageReaction): reaction is TicketMessageReaction {
        if (!reaction.message.inGuild() || !reaction.message.channel.isText()) {
            return false;
        }

        if (!reaction.emoji.name) {
            return false;
        }

        if (!Object.keys(TicketManager.emoji).includes(reaction.emoji.name)) {
            reaction.remove();
            return false;
        }

        return true;
    }

    async hasOpenTicket(user: User): Promise<boolean> {
        return await this.client.db.ticket.count({
            where: { author: user.id, closed_at: null }
        }) !== 0;
    }

    async createTicket(reaction: TicketMessageReaction, user: User): Promise<Ticket> {
        return await this.client.db.ticket.create({
            data: {
                author: user.id,
                caregory: TicketManager.emoji[reaction.emoji.name]
            }
        });
    }

    async createChannel(ticket: Ticket, guild: Guild): Promise<TextChannel> {
        return await guild.channels.create(`ticket-${ticket.id}`, {
            type: "GUILD_TEXT",
            permissionOverwrites: [
                { id: ticket.author, allow: ["VIEW_CHANNEL", "SEND_MESSAGES"] }
            ]
        });
    }

    async openTicket(reaction: TicketMessageReaction, user: User) {
        if (await this.hasOpenTicket(user)) {
            user.send("Hai già aperto un ticket. Attendi che lo staff risponda o chiudi il precedente.");
            return;
        }

        const ticket = await this.createTicket(reaction, user);
        const channel = await this.createChannel(ticket, reaction.message.guild);

        let message: Message;

        if (reaction.emoji.name === "🕵️") {
            const roles = await this.client.db.staffType
                .findMany();

            const row = new MessageActionRow()
                .addComponents(new MessageSelectMenu()
                    .setCustomId("role")
                    .setPlaceholder("Seleziona un ruolo")
                    .setMaxValues(1)
                    .setOptions(...roles.map(role => ({ value: `${role.id}`, label: role.name })))
                );


            message = await channel.send({
                embeds: [TicketManager.embed(ticket)],
                components: [row]
            });

            try {
                const select = await message.awaitMessageComponent({
                    componentType: "SELECT_MENU",
                    filter: select => select.id === "role"
                });

                const role = roles.find(role => `${role.id}` === select.values[0]);
                if (!role) throw new Error();

                await channel.permissionOverwrites.create(role.scout, {
                    VIEW_CHANNEL: true,
                });
            } catch (e) {
                return await this.closeTicket(ticket, channel);
            }
        } else {
            message = await channel.send({
                embeds: [TicketManager.embed(ticket)]
            });
        }

        await message.react("🔒");

        const reactions = message.createReactionCollector({
            filter: (reaction, user) => user.id !== this.client.user?.id
        });

        const messages = channel.createMessageCollector();

        reactions.on("collect", async (r, u) => {
            if (r.emoji.name === "🔒") {
                await r.remove();
                await r.message.react("✅");
                await r.message.react("❌");
            }

            if (r.emoji.name === "✅") {
                return this.closeTicket(ticket, channel);
            }

            if (r.emoji.name === "❌") {
                await r.remove();
                await r.message.react("🔒");
            }

            r.users.remove(u);
        });

        messages.on("collect", message => {
            this.client.db.ticketMessage.create({
                data: {
                    author: message.author.id,
                    message: message.content,
                    ticket_id: ticket.id
                }
            });
        });

        reaction.users.remove(user);
    }

    async closeTicket(ticket: Ticket, channel: TextChannel) {
        await this.client.db.ticket.update({
            data: { closed_at: new Date() },
            where: { id: ticket.id }
        });

        await channel.delete();

        return;
    }
}