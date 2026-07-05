import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import * as path from 'path';

// Define the structure of a message for our history, compatible with GoogleGenAI
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// Lowdb database schema
interface DBUser {
    userId: string;
    ai_enabled: boolean;
    can_toggle_ai: boolean;
}

interface DBMessage {
    userId: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string; // ISO string
}

export interface IReminder {
    _id: string; // Keep as _id to match previous MongoDB interface
    userId: string;
    text: string;
    remindAt: string; // ISO string
    createdAt: string; // ISO string
    targetJid?: string; // JID of the contact this reminder is about
}

interface DatabaseSchema {
    users: DBUser[];
    messages: DBMessage[];
    reminders: IReminder[];
}

export class DatabaseService {
    private static instance: DatabaseService;
    private db!: Low<DatabaseSchema>;
    private initialized = false;

    private constructor() {
        this.connect();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private async connect(): Promise<void> {
        if (this.initialized) return;

        try {
            const dbFile = path.join(process.cwd(), 'database.json');
            const defaultData: DatabaseSchema = { users: [], messages: [], reminders: [] };
            const adapter = new JSONFile<DatabaseSchema>(dbFile);
            this.db = new Low<DatabaseSchema>(adapter, defaultData);
            
            await this.db.read();
            this.initialized = true;
            console.log('Connected to Local JSON Database (database.json)');
        } catch (error) {
            console.error('Error connecting to Local JSON Database:', error);
        }
    }

    // Ensures the database has been read before any operation
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.connect();
        }
    }

    // --- User Management Methods ---

    public async addUser(userId: string, canToggle: boolean): Promise<void> {
        await this.ensureInitialized();
        const userIndex = this.db.data.users.findIndex(u => u.userId === userId);
        if (userIndex > -1) {
            this.db.data.users[userIndex].can_toggle_ai = canToggle;
            this.db.data.users[userIndex].ai_enabled = true;
        } else {
            this.db.data.users.push({ userId, can_toggle_ai: canToggle, ai_enabled: true });
        }
        await this.db.write();
    }

    public async removeUser(userId: string): Promise<void> {
        await this.ensureInitialized();
        this.db.data.users = this.db.data.users.filter(u => u.userId !== userId);
        await this.db.write();
    }

    public async isAiEnabled(userId: string): Promise<boolean> {
        await this.ensureInitialized();
        const user = this.db.data.users.find(u => u.userId === userId);
        return user ? user.ai_enabled : false;
    }

    public async canUserToggleAi(userId: string): Promise<boolean> {
        await this.ensureInitialized();
        const user = this.db.data.users.find(u => u.userId === userId);
        return user ? user.can_toggle_ai : false;
    }

    public async setUserAiStatus(userId: string, isEnabled: boolean): Promise<void> {
        await this.ensureInitialized();
        const userIndex = this.db.data.users.findIndex(u => u.userId === userId);
        if (userIndex > -1) {
            this.db.data.users[userIndex].ai_enabled = isEnabled;
            await this.db.write();
        }
    }

    public async userExists(userId: string): Promise<boolean> {
        await this.ensureInitialized();
        const user = this.db.data.users.find(u => u.userId === userId);
        return !!user;
    }

    // --- Chat History Methods ---

    public async addMessage(userId: string, role: 'user' | 'model', content: string): Promise<void> {
        await this.ensureInitialized();
        this.db.data.messages.push({
            userId,
            role,
            content,
            timestamp: new Date().toISOString()
        });
        await this.db.write();
        await this.trimHistory(userId);
    }

    public async getHistory(userId: string, limit: number = 10): Promise<ChatMessage[]> {
        await this.ensureInitialized();
        const userMessages = this.db.data.messages
            .filter(m => m.userId === userId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Ascending

        // Take the last 'limit' messages
        const sliced = userMessages.slice(-limit);

        return sliced.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
    }

    private async trimHistory(userId: string, keep: number = 10): Promise<void> {
        await this.ensureInitialized();
        const userMessages = this.db.data.messages.filter(m => m.userId === userId);
        if (userMessages.length > keep) {
            // Sort by timestamp ascending
            userMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            // Identify messages to delete
            const toDeleteCount = userMessages.length - keep;
            const messagesToDelete = userMessages.slice(0, toDeleteCount);

            // Filter them out of main messages array
            this.db.data.messages = this.db.data.messages.filter(m => 
                !(m.userId === userId && messagesToDelete.some(td => td.timestamp === m.timestamp && td.content === m.content))
            );
            await this.db.write();
        }
    }

    // --- Reminder Methods ---

    public async addReminder(userId: string, text: string, remindAt: Date, targetJid?: string): Promise<void> {
        await this.ensureInitialized();
        const newReminder: IReminder = {
            _id: Math.random().toString(36).substring(2, 9), // Generate a random short string id
            userId,
            text,
            remindAt: remindAt.toISOString(),
            createdAt: new Date().toISOString(),
            targetJid
        };
        this.db.data.reminders.push(newReminder);
        await this.db.write();
    }

    public async getPendingReminders(): Promise<IReminder[]> {
        await this.ensureInitialized();
        const now = new Date().getTime();
        return this.db.data.reminders.filter(r => new Date(r.remindAt).getTime() <= now);
    }

    public async deleteReminder(id: string): Promise<void> {
        await this.ensureInitialized();
        this.db.data.reminders = this.db.data.reminders.filter(r => r._id !== id);
        await this.db.write();
    }

    public async close(): Promise<void> {
        // No connection pooling or persistent server socket connection to close for JSONFile
        console.log('Local JSON Database connection closed');
    }
}