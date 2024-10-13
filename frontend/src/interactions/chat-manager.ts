import { ContextManager } from './context-manager';
import { sendToServerStreaming, sendToServer } from '../network/endpoints';
import { Camera } from 'engine/camera/camera';


/* The `ChatManager` class manages a chat interface by sending and displaying messages between a user
and a server, updating conversation context, and handling user interactions. */
export class ChatManager {
    private inputElement: HTMLInputElement;
    private sendButton: HTMLButtonElement;
    private messagesContainer: HTMLDivElement;
    private contextManager: ContextManager;
    private camera!: Camera;

    constructor(inputId: string, buttonId: string, containerId: string, camera: Camera) {
        this.camera = camera;
        console.log(this.camera);
        this.inputElement = document.getElementById(inputId) as HTMLInputElement;
        this.sendButton = document.getElementById(buttonId) as HTMLButtonElement;
        this.messagesContainer = document.getElementById(containerId) as HTMLDivElement;
        this.contextManager = new ContextManager();
        //this.contextManager.setDatasetFromString;
        this.setupListeners();
    }

    private setupListeners() {
        this.sendButton.addEventListener('click', () => {
            this.sendMessageAndInstruction().catch(console.error);
        });
    
        this.inputElement.addEventListener('keypress', async (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.displayUserMessage(this.inputElement.value);
                await this.sendMessageAndInstruction().catch(console.error);
            }
        });
    }
    
    private async sendMessageAndInstruction() {
        await Promise.all([
            this.sendInstruction(),
            this.sendMessage()
        ]);
    }
    

    private async sendMessage(): Promise<void> {
        const message = this.inputElement.value.trim();
        //this.getCameraContext();
        if (message) {
            this.inputElement.value = '';
            this.contextManager.updateUserContext(message);

            try {
                const response = await sendToServerStreaming(message, this.contextManager.getFullConversation());
                this.contextManager.updateSystemContext(response);
                this.displaySystemMessage(response);
            } catch (error) {
                console.error('Error sending message:', error);
            }

        }
    }

    private async sendInstruction(): Promise<void> {
        const message = this.inputElement.value.trim();
        if (message) {
            try {
                const response = await sendToServer(message);
                console.log(response);
            } catch (error) {
                console.error('Error sending message:', error);
            }

        }
    }


    private displayUserMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble';
        new_message_div.textContent ="Me: "+ message + "\n";
        this.messagesContainer.appendChild(new_message_div);
        this.scrollToBottom();
        console.log(this.contextManager.getFullConversation());
    }

    private displaySystemMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble-GPT';
        new_message_div.textContent ="GPT: "+ message + "\n";
        this.scrollToBottom();
        this.messagesContainer.appendChild(new_message_div);
    }

    private scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    private getCameraContext() {
        console.log(this.camera);
        this.contextManager.setCoordinates(this.camera.getSphericalCoordinates().latitude, this.camera.getSphericalCoordinates().longitude);
    }
}
