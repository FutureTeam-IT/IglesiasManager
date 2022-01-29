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

import Client from "../client/Client";

import Tell from "../commands/Tell";

import { IListener } from "../models/Listener";

export default class ReadyEvent implements IListener<"ready"> {
    name = "ready" as const;

    async handle(client: Client<true>): Promise<void> {
        console.log(`| Logged in as ${client.user.tag}!`);

        client.user.setPresence({
            activities: [{
                name: "mc.iglesiascraft.it",
                type: "PLAYING",
            }]
        });

        client.register(new Tell(client));

        console.log("| All ready!");
    }
}
