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

import { Guild, Message, MessageActionRow, MessageEmbed, MessageReaction, MessageSelectMenu, TextChannel, User } from "discord.js";
import { Ticket, TicketCategory } from "@prisma/client";
import { tickets } from "../config.json";
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
        .setDescription(`Hai aperto un ticket per **${ticket.category.toLowerCase()}**.
        ${ticket.category === "SUPPORTO" ?
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

        if (reaction.message.channelId !== tickets.channel) {
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
                category: TicketManager.emoji[reaction.emoji.name]
            }
        });
    }

    async createChannel(ticket: Ticket, guild: Guild): Promise<TextChannel> {
        return await guild.channels.create(`ticket-${ticket.id}`, {
            type: "GUILD_TEXT",
            parent: tickets.category,
            permissionOverwrites: [
                {
                    id: ticket.author, 
                    allow: ticket.category === "SUPPORTO" ?
                        ["VIEW_CHANNEL", "SEND_MESSAGES"] :
                        ["VIEW_CHANNEL"]
                }
            ]
        });
    }

    async openTicket(reaction: TicketMessageReaction, user: User) {
        reaction.users.remove(user);

        if (await this.hasOpenTicket(user)) {
            user.send("Hai già aperto un ticket. Attendi che lo staff risponda o chiudi il precedente.");
            return;
        }

        const ticket = await this.createTicket(reaction, user);
        const channel = await this.createChannel(ticket, reaction.message.guild);

        const message: Message = await channel.send({
            embeds: [TicketManager.embed(ticket)]
        });

        await message.react("🔒");

        const reactions = message.createReactionCollector({
            filter: (reaction, user) => user.id !== this.client.user?.id
        });
    
        reactions.on("collect", async (r) => {
            if (r.emoji.name === "🔒") {
                r.remove();
                await r.message.react("✅");
                await r.message.react("❌");
            }

            if (r.emoji.name === "✅") {
                return this.closeTicket(ticket, channel);
            }

            if (r.emoji.name === "❌") {
                r.message.reactions.removeAll();
                await r.message.react("🔒");
            }
        });

        // if (ticket.category === "PROVINO") {
        //     const roles = await this.client.db.staffType.findMany({
        //         include: { interviewers: true }
        //     });

        //     if (!roles.length) {
        //         user.send("Non ci sono provini aperti al momento.");
        //         this.closeTicket(ticket, channel);
        //         return;
        //     }

        //     const row = new MessageActionRow()
        //         .addComponents(
        //             new MessageSelectMenu()
        //                 .setCustomId("role-select")
        //                 .setMaxValues(1)
        //                 .setPlaceholder("Seleziona il ruolo")
        //                 .addOptions(...roles.map(role => ({
        //                     label: role.name,
        //                     value: `${role.id}`
        //                 })))
        //         );

        //     await message.edit({
        //         components: [row]
        //     });

        //     try {
        //         const selected = await message.awaitMessageComponent({
        //             componentType: "SELECT_MENU",
        //             filter: (s) => s.customId === "role-select" && s.user.id === user.id,
        //             time: 60e3
        //         });

        //         const role = roles.find(
        //             role => role.id === Number.parseInt(selected.values[0])
        //         );

        //         if (!role) throw new Error();

        //         await selected.reply(`Hai selezionato il provino per **${role.name}**`);

        //         await channel.permissionOverwrites.create(user.id, {
        //             "SEND_MESSAGES": true
        //         });

        //         role.interviewers.forEach(async ({ interviewer }) => {
        //             await channel.permissionOverwrites.create(interviewer, {
        //                 "SEND_MESSAGES": true,
        //                 "VIEW_CHANNEL": true
        //             });
        //         });
        //     } catch (e) {
        //         return this.closeTicket(ticket, channel);
        //     }
        // }
        
        const messages = channel.createMessageCollector();

        messages.on("collect", async message => {
            console.log(message.content);

            await this.client.db.ticketMessage.create({
                data: {
                    author: message.author.id,
                    message: message.content,
                    ticket_id: ticket.id
                }
            });
        });
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