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

import { Ticket } from "@prisma/client";
import { MessageReaction, User } from "discord.js";
import Client from "./Client";

export default class TicketManager {
    readonly #emojis = [
        "🆘",
        "🕵️"
    ];

    constructor(private readonly client: Client<boolean>) {}

    isRequest(reaction: MessageReaction): boolean {
        return reaction.message.inGuild() &&
            reaction.message.channel.name === "ticket" &&
            !!reaction.emoji.name &&
            this.#emojis.includes(reaction.emoji.name);
    }

    async hasOpenTicket(user: User): Promise<boolean> {
        const ticket = await this.client.db.ticket.findFirst({
            where: {
                author: user.id,
                AND: { closed_at: null }
            },
        });

        return ticket !== null;
    }

    async create(reaction: MessageReaction, user: User): Promise<Ticket | null> {
        if (!reaction.emoji.name || !reaction.message.inGuild()) {
            return null;
        }

        return await this.client.db.ticket.create({
            data: {
                author: user.id,
                caregory: reaction.emoji.name === "🆘" ? 
                    "SUPPORTO" : 
                    "PROVINO",
            }
        });
    }


    async open(reaction: MessageReaction, user: User) {
        const hasOpenTicket = await this.hasOpenTicket(user);
        if (hasOpenTicket) {
            return user.send(`${user} Hai già un ticket aperto! Attendi che lo staff risponda o chiudi quello precedente!`);
        }

        const ticket = await this.create(reaction, user);

        if (!ticket) {
            return;
        }



        return;
    }
}