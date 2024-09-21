export class ContextManager {
    private userContext: string = '';
    private systemContext: string = '';
    private fullConversation: string[] = []; // Stores the full conversation in an array for easy management

    constructor() {}

    setInitialUserContext(context: string): void {
        this.userContext = context;
        this.fullConversation.push(`User: ${context}`); // Log initial user context
    }

    setInitialSystemContext(context: string): void {
        this.systemContext = context;
        this.fullConversation.push(`System: ${context}`); // Log initial system context
    }

    updateUserContext(update: string): void {
        this.userContext += "\n" + update;
        this.fullConversation.push(`User: ${update}`); // Append each new user message
    }

    updateSystemContext(update: string): void {
        this.systemContext += "\n" + update;
        this.fullConversation.push(`System: ${update}`); // Append each new system response
    }

    getUserContext(): string {
        return this.userContext;
    }

    getSystemContext(): string {
        return this.systemContext;
    }

    getFullConversation(): string[] {
        return this.fullConversation; // Returns the full conversation history
    }

    // Prepares the conversation history for sending to the endpoint
    getFormattedConversationForAPI(): string {
        return this.fullConversation.join('\n');
    }

    // Reset the context and conversation for a new session or interaction
    resetConversation(): void {
        this.userContext = '';
        this.systemContext = '';
        this.fullConversation = [];
    }
}
