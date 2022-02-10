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

import Discord, { Collection, User } from "discord.js";
import { Routes } from "discord-api-types/v9";
import { ICommand } from "../models/Command";
import { REST } from "@discordjs/rest";
import { EventType, IListener } from "../models/Listener";
import { PrismaClient } from "@prisma/client";
import TicketManager from "./TicketManager";

type ReadonlyCollection<K, V> = Readonly<Collection<K, V>>;

type ClientOptions = Discord.ClientOptions & {
    token: string;
};

type ManagersType = {
    ticket: TicketManager
};

export default class Client<Ready extends boolean = false> extends Discord.Client<Ready> {
    #commands: Collection<string, ICommand>;
    #rest: REST;
    #token: string;
    #prisma: PrismaClient;
    #ticketManger: TicketManager;

    constructor(options: ClientOptions) {
        super(options);

        this.#commands = new Collection();
    
        this.#rest = new REST({ version: "9" })
            .setToken(options.token);

        this.#token = options.token;
        this.#prisma = new PrismaClient();

        this.#ticketManger = new TicketManager(this);
    }

    get commands(): ReadonlyCollection<string, ICommand> {
        return this.#commands;
    }

    get db(): Omit<PrismaClient, `$${string}`> {
        return this.#prisma;
    }

    get managers(): ManagersType {
        return { ticket: this.#ticketManger };
    }

    async register(command: ICommand) {
        this.#commands.set(command.data.name, command);

        if (!this.isReady()) {
            throw new Error("Client is not ready!");
        }

        await this.#rest.post(Routes.applicationCommands(this.user.id), {
            body: command.data
        });
    }

    listen<T extends EventType>(listener: IListener<T>): void {
        this.on(listener.name, listener.handle.bind(listener, this));
    }

    async start() {
        await this.login(this.#token);
    }

    isMe(user: User): boolean {
        return this.isReady() && 
            (user.id === this.user.id);
    }
}
