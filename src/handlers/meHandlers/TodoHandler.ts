import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import * as fs from 'fs/promises';
import path from 'path';

const TODO_FILE_PATH = path.join(__dirname, '..', '..', '..', 'todos.json');

// In-memory store for to-do lists, keyed by user ID
let todos: { [userId: string]: string[] } = {};
let isLoaded = false;

async function loadTodos(): Promise<void> {
    try {
        const data = await fs.readFile(TODO_FILE_PATH, 'utf-8');
        todos = JSON.parse(data);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, which is fine. It will be created on the first save.
            todos = {};
        } else {
            console.error('Error loading todos:', error);
            todos = {}; // Start with an empty object in case of other errors
        }
    }
    isLoaded = true;
}

async function saveTodos(): Promise<void> {
    try {
        await fs.writeFile(TODO_FILE_PATH, JSON.stringify(todos, null, 2));
    } catch (error) {
        console.error('Error saving todos:', error);
    }
}

export class TodoHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (!isLoaded) {
            await loadTodos();
        }

        const command = message.body.toLowerCase().split(' ')[0];

        if (command === '!todo') {
            const userId = message.from;
            if (!todos[userId]) {
                todos[userId] = [];
            }
            const userTodoList = todos[userId];

            const action = message.body.toLowerCase().split(' ')[1] || 'list';
            const task = message.body.split(' ').slice(2).join(' ');

            let needsSave = false;

            switch (action) {
                case 'add':
                    if (task) {
                        userTodoList.push(task);
                        await client.sendMessage(message.from, `Added "${task}" to your to-do list.`);
                        needsSave = true;
                    } else {
                        await client.sendMessage(message.from, 'Please provide a task to add.');
                    }
                    break;
                case 'list':
                    if (userTodoList.length > 0) {
                        await client.sendMessage(message.from, 'Your to-do list:\n' + userTodoList.map((t, i) => `${i + 1}. ${t}`).join('\n'));
                    } else {
                        await client.sendMessage(message.from, 'Your to-do list is empty.');
                    }
                    break;
                case 'remove':
                    const taskNumber = parseInt(task, 10);
                    if (!isNaN(taskNumber) && taskNumber > 0 && taskNumber <= userTodoList.length) {
                        const removedTask = userTodoList.splice(taskNumber - 1, 1);
                        await client.sendMessage(message.from, `Removed "${removedTask[0]}" from your to-do list.`);
                        needsSave = true;
                    } else {
                        await client.sendMessage(message.from, 'Please provide a valid task number to remove.');
                    }
                    break;
                case 'clear':
                    todos[userId] = [];
                    await client.sendMessage(message.from, 'Your to-do list has been cleared.');
                    needsSave = true;
                    break;
                default:
                    await client.sendMessage(message.from, 'Invalid command. Use `!todo add <task>`, `!todo list`, `!todo remove <number>`, or `!todo clear`.');
            }

            if (needsSave) {
                await saveTodos();
            }
            return;
        }

        await super.handle(message, client);
    }
}
