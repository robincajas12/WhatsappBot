export class BotStateService {
    private static instance: BotStateService;
    private busyMode: boolean = false;
    private notifiedUsers: Set<string> = new Set();

    // Private constructor to ensure singleton pattern
    private constructor() {}

    /**
     * Gets the single instance of the BotStateService.
     */
    public static getInstance(): BotStateService {
        if (!BotStateService.instance) {
            BotStateService.instance = new BotStateService();
        }
        return BotStateService.instance;
    }

    /**
     * Checks if busy mode is currently enabled.
     */
    public isBusy(): boolean {
        return this.busyMode;
    }

    /**
     * Sets the busy mode status.
     * When the mode changes, the list of notified users is cleared.
     * @param status The new busy mode status.
     */
    public setBusy(status: boolean): void {
        this.busyMode = status;
        this.clearNotifiedUsers();
    }

    /**
     * Checks if a user has already been notified during the current busy period.
     * @param userId The user's JID.
     */
    public hasBeenNotified(userId: string): boolean {
        return this.notifiedUsers.has(userId);
    }

    /**
     * Adds a user to the set of notified users.
     * @param userId The user's JID.
     */
    public addNotifiedUser(userId: string): void {
        this.notifiedUsers.add(userId);
    }

    /**
     * Clears the set of notified users. Called when busy mode is toggled.
     */
    private clearNotifiedUsers(): void {
        this.notifiedUsers.clear();
    }
}
