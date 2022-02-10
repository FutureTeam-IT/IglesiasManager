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

import env from "dotenv";
env.config();

import Client from "./client/Client";
import InteractionEvent from "./events/Interaction";
import ReactionAddEvent from "./events/ReactionAdd";
import ReadyEvent from "./events/Ready";

const bot = new Client({
    intents: [
        "GUILDS", 
        "GUILD_MEMBERS", 
        "GUILD_MEMBERS",
        "GUILD_MESSAGE_REACTIONS"
    ],
    partials: ["MESSAGE", "REACTION"],
    token: process.env.TOKEN ?? ""
});

// * Event Registering
bot.listen(new ReadyEvent());
bot.listen(new InteractionEvent());
bot.listen(new ReactionAddEvent());

bot.start();
