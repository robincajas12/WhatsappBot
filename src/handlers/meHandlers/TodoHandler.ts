import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import * as fs from 'fs/promises';
import path from 'path';

interface TodoItem {
    task: string;
}

export class TodoHandler extends AbstractMessageHandler {
    private todoFilePath = path.resolve('./todo.json');

    public async handle(message: Message, client: Client): Promise<void> {
        const body = message.body.toLowerCase();

        if (body.startsWith('!todo')) {
            const command = body.split(' ');
            const action = command[1];
            const args = command.slice(2).join(' ');

            try {
                switch (action) {
                    case 'add':
                        await this.addTodo(args);
                        await client.sendMessage(message.from, `Added: ${args}`);
                        break;
                    case 'list':
                        const todos = await this.getTodos();
                        if (todos.length === 0) {
                            await client.sendMessage(message.from, 'Your to-do list is empty.');
                        } else {
                            const todoList = todos.map((item, index) => `${index + 1}. ${item.task}`).join('\n');
                            await client.sendMessage(message.from, `*To-Do List:*\n${todoList}`);
                        }
                        break;
                    case 'remove':
                        const index = parseInt(args, 10) - 1;
                        const removed = await this.removeTodo(index);
                        if (removed) {
                            await client.sendMessage(message.from, `Removed: ${removed.task}`);
                        } else {
                            await client.sendMessage(message.from, 'Invalid index.');
                        }
                        break;
                    default:
                        await client.sendMessage(message.from, 'Invalid command. Use: !todo add <task>, !todo list, or !todo remove <index>');
                        break;
                }
            } catch (error) {
                console.error('Error handling !todo command:', error);
                await client.sendMessage(message.from, 'An error occurred while managing your to-do list.');
            }
            return;
        }

        await super.handle(message, client);
    }

    private async getTodos(): Promise<TodoItem[]> {
        try {
            await fs.access(this.todoFilePath);
            const data = await fs.readFile(this.todoFilePath, 'utf-8');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            // If the file doesn't exist or is invalid JSON, return an empty list
            return [];
        }
    }

    private async saveTodos(todos: TodoItem[]): Promise<void> {
        try {
            await fs.writeFile(this.todoFilePath, JSON.stringify(todos, null, 2));
        } catch (error) {
            console.error('Error saving todos:', error);
            throw new Error('Could not save to-do list.');
        }
    }

    private async addTodo(task: string): Promise<void> {
        const todos = await this.getTodos();
        todos.push({ task });
        await this.saveTodos(todos);
    }

    private async removeTodo(index: number): Promise<TodoItem | null> {
        const todos = await this.getTodos();
        if (index >= 0 && index < todos.length) {
            const removed = todos.splice(index, 1);
            await this.saveTodos(todos);
            return removed[0];
        }
        return null;
    }
}
