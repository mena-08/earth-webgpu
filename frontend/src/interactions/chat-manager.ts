
// import { sendToServerStreaming } from '../network/endpoints';

// export class ChatManager {
//     private inputElement: HTMLInputElement;
//     private sendButton: HTMLButtonElement;
//     private messagesContainer: HTMLDivElement;

//     constructor(inputId: string, buttonId: string, containerId: string) {
//         this.inputElement = document.getElementById(inputId) as HTMLInputElement;
//         this.sendButton = document.getElementById(buttonId) as HTMLButtonElement;
//         this.messagesContainer = document.getElementById(containerId) as HTMLDivElement;

//         this.setupListeners();
//     }

//     private setupListeners() {
//         this.sendButton.addEventListener('click', () => this.sendMessage().catch(console.error));
//         this.inputElement.addEventListener('keypress', async (event: KeyboardEvent) => {
//             if (event.key === 'Enter') {
//                 event.preventDefault();
//                 this.displayUserMessage(this.inputElement.value);
//                 await this.sendMessage().catch(console.error);
//             }
//         });
//     }

//     private async sendMessage(): Promise<void> {
//         const message = this.inputElement.value.trim();
//         if (message) {
//             console.log(`Message sent: ${message}`);
//             this.inputElement.value = '';
//             await sendToServerStreaming(message);
//         }
//     }

//     private displayUserMessage(message:string) {
//         const messages_container = document.getElementById('messages');
//         const new_message_div = document.createElement('div');
//         new_message_div.className = 'message-bubble';
//         new_message_div.textContent = message + "\n";
//         if (messages_container) {
//             messages_container.appendChild(new_message_div);
//         } else {
//             console.error('Error: messages_container is null');
//         }
//     }
// }

// function displayGPTMessage(message:string) {
// 	const messages_container = document.getElementById('messages');
//     if (!messages_container) {
//         console.error('Error: messages_container is null');
//         return;
//     }
//     let last_message_div = messages_container.lastElementChild;

// 	if (!last_message_div || last_message_div.className !== 'message-bubble-GPT') {
// 		last_message_div = document.createElement('div');
// 		last_message_div.className = 'message-bubble-GPT';
//         if (messages_container) {
//             messages_container.appendChild(last_message_div);
//         } else {
//             console.error('Error: messages_container is null');
//         }
// 	}
// 	last_message_div.textContent += message;
// }


import { ContextManager } from './context-manager';
import { sendToServerStreaming } from '../network/endpoints';

export class ChatManager {
    private inputElement: HTMLInputElement;
    private sendButton: HTMLButtonElement;
    private messagesContainer: HTMLDivElement;
    private contextManager: ContextManager;

    constructor(inputId: string, buttonId: string, containerId: string) {
        this.inputElement = document.getElementById(inputId) as HTMLInputElement;
        this.sendButton = document.getElementById(buttonId) as HTMLButtonElement;
        this.messagesContainer = document.getElementById(containerId) as HTMLDivElement;
        this.contextManager = new ContextManager(); // Initialize ContextManager

        this.setupListeners();
    }

    private setupListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage().catch(console.error));
        this.inputElement.addEventListener('keypress', async (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.displayUserMessage(this.inputElement.value);
                await this.sendMessage().catch(console.error);
            }
        });
    }

    private async sendMessage(): Promise<void> {
        const message = this.inputElement.value.trim();
        if (message) {
            console.log(`Message sent: ${message}`);
            this.inputElement.value = '';
            this.contextManager.updateUserContext(message);

            try {
                const response = await sendToServerStreaming(message, this.contextManager.getFormattedConversationForAPI());
                // Handle response and update system context
                console.log("System's response:", response);
                //this.contextManager.updateSystemContext(response); // Assuming response is directly the text from the system
                //this.displaySystemMessage(response); // Display system's response in the UI
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    }


    private displayUserMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble';
        new_message_div.textContent = message + "\n";
        this.messagesContainer.appendChild(new_message_div);
    }

    private displaySystemMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble-GPT';
        new_message_div.textContent = message + "\n";
        this.messagesContainer.appendChild(new_message_div);
    }
}
