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

import { Interaction } from "discord.js";
import Client from "../client/Client";
import { IListener } from "../models/Listener";

export default class InteractionEvent implements IListener<"interactionCreate"> {
    name = "interactionCreate" as const;

    async handle(client: Client<true>, interaction: Interaction): Promise<void> {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (command && interaction.inCachedGuild()) {
                command.execute(interaction);
            }
        }
    }
}