
import Database from 'better-sqlite3';

// Define the structure of a message for our history, compatible with GoogleGenAI
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export class ChatHistory {
    private db;

    constructor(dbPath: string = 'chat_history.db') {
        this.db = new Database(dbPath);
        this.init();
    }

    private init(): void {
        // Create the table if it doesn't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    public addMessage(userId: string, role: 'user' | 'model', content: string): void {
        const stmt = this.db.prepare(`
            INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)
        `);
        stmt.run(userId, role, content);
        this.trimHistory(userId);
    }

    public getHistory(userId: string, limit: number = 10): ChatMessage[] {
        const stmt = this.db.prepare(`
            SELECT role, content FROM messages
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        const rows = stmt.all(userId, limit) as { role: 'user' | 'model'; content: string }[];
        
        // The history is retrieved in reverse chronological order, so we reverse it back
        return rows.reverse().map(row => ({
            role: row.role,
            parts: [{ text: row.content }]
        }));
    }

    private trimHistory(userId: string, keep: number = 10): void {
        // This query finds the ID of the 10th most recent message for a user,
        // and then deletes all messages for that user that are older than that message.
        this.db.exec(`
            DELETE FROM messages
            WHERE user_id = '${userId}' AND id NOT IN (
                SELECT id FROM messages
                WHERE user_id = '${userId}'
                ORDER BY timestamp DESC
                LIMIT ${keep}
            )
        `);
    }

    public close(): void {
        this.db.close();
    }
}
