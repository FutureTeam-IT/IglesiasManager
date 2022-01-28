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

import Discord, { Collection } from "discord.js";
import { Routes } from "discord-api-types/v9";
import { ICommand } from "../models/Command";
import { REST } from "@discordjs/rest";

type ReadonlyCollection<K, V> = Readonly<Collection<K, V>>;

type ClientOptions = Discord.ClientOptions & {
    token: string;
};

export default class Client extends Discord.Client {
    #commands: Collection<string, ICommand>;

    #rest: REST;

    constructor(options: ClientOptions) {
        super(options);

        this.#commands = new Collection();
    
        this.#rest = new REST({ version: "9" })
            .setToken(options.token);
    }

    /**
     * The commands commands collection.
     */
    get commands(): ReadonlyCollection<string, ICommand> {
        return this.#commands;
    }

    /**
     * Register a new command.
     * @param {string} name - The command name.
     * @param {ICommand} command - The command object.
     */
    async register(name: string, command: ICommand) {
        this.#commands.set(name, command);

        if (!this.isReady()) {
            throw new Error("Client is not ready!");
        }

        this.#rest.post(Routes.applicationCommands(this.user.id), {
            body: command.data
        });
    }
}
