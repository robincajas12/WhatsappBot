
import pkg from 'sqlite3';
const { Database } = pkg;

// Define the structure of a message for our history, compatible with GoogleGenAI
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export class DatabaseService {
    private db: InstanceType<typeof Database>;

    constructor(dbPath: string = 'chat_history.db') {
        this.db = new Database(dbPath, (err: Error | null) => {
            if (err) {
                console.error('Could not connect to database', err);
            } else {
                console.log('Connected to SQLite database');
                this.init();
            }
        });
    }

    private run(sql: string, params: any[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err: Error | null, row: T) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    private all<T>(sql: string, params: any[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err: Error | null, rows: T[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    private async init(): Promise<void> {
        // Create messages table
        await this.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await this.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                ai_enabled INTEGER DEFAULT 1,
                can_toggle_ai INTEGER DEFAULT 0
            )
        `);
    }

    // --- User Management Methods ---

    public async addUser(userId: string, canToggle: boolean): Promise<void> {
        await this.run(`
            INSERT OR REPLACE INTO users (user_id, can_toggle_ai, ai_enabled) VALUES (?, ?, 1)
        `, [userId, canToggle ? 1 : 0]);
    }

    public async removeUser(userId: string): Promise<void> {
        await this.run('DELETE FROM users WHERE user_id = ?', [userId]);
    }

    public async isAiEnabled(userId: string): Promise<boolean> {
        const user = await this.get<{ ai_enabled: number }>('SELECT ai_enabled FROM users WHERE user_id = ?', [userId]);
        return user ? user.ai_enabled === 1 : false;
    }

    public async canUserToggleAi(userId: string): Promise<boolean> {
        const user = await this.get<{ can_toggle_ai: number }>('SELECT can_toggle_ai FROM users WHERE user_id = ?', [userId]);
        return user ? user.can_toggle_ai === 1 : false;
    }

    public async setUserAiStatus(userId: string, isEnabled: boolean): Promise<void> {
        await this.run('UPDATE users SET ai_enabled = ? WHERE user_id = ?', [isEnabled ? 1 : 0, userId]);
    }

    public async userExists(userId: string): Promise<boolean> {
        const row = await this.get<{ 1: number }>('SELECT 1 FROM users WHERE user_id = ?', [userId]);
        return !!row;
    }

    // --- Chat History Methods ---

    public async addMessage(userId: string, role: 'user' | 'model', content: string): Promise<void> {
        await this.run(`
            INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)
        `, [userId, role, content]);
        await this.trimHistory(userId);
    }

    public async getHistory(userId: string, limit: number = 10): Promise<ChatMessage[]> {
        const rows = await this.all<{ role: 'user' | 'model'; content: string }>(`
            SELECT role, content FROM messages
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `, [userId, limit]);
        
        return rows.reverse().map(row => ({
            role: row.role,
            parts: [{ text: row.content }]
        }));
    }

    private async trimHistory(userId: string, keep: number = 10): Promise<void> {
        await this.run(`
            DELETE FROM messages
            WHERE user_id = ? AND id NOT IN (
                SELECT id FROM messages
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            )
        `, [userId, userId, keep]);
    }

    public close(): void {
        this.db.close();
    }
}
