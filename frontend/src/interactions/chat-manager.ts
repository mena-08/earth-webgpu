import { ContextManager } from './context-manager';
import { sendToServerStreaming, sendToServer } from '../network/endpoints';
import { Camera } from 'engine/camera/camera';
import { render2, sphere, sphereMarker } from 'main';


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
        this.inputElement = document.getElementById(inputId) as HTMLInputElement;
        this.sendButton = document.getElementById(buttonId) as HTMLButtonElement;
        this.messagesContainer = document.getElementById(containerId) as HTMLDivElement;
        this.contextManager = new ContextManager();
        this.setupListeners();
    }

    private setupListeners() {
        this.sendButton.addEventListener('click', () => {
            this.sendMessageAndInstruction().catch(console.error);
        });

        this.inputElement.addEventListener('keypress', async (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
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
        this.getCameraContext();
        if (message) {
            this.displayUserMessage(this.inputElement.value);
            this.inputElement.value = '';
            this.contextManager.updateUserContext(message);

            try {
                const response = await sendToServerStreaming(message, this.contextManager.getFullConversation());
                this.contextManager.updateSystemContext(response);
                console.log("Response: ", response.trim());
                this.displaySystemMessage(response.trim());
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
                const parsedValues = this.extractValuesFromResponse(response);
                if (parsedValues) {
                    if (typeof parsedValues[0] === 'number' && typeof parsedValues[1] === 'number') {
                        if (parsedValues[0] == 0 && parsedValues[1] == 0) {
                            return;
                        }
                        render2.getCamera().setSphericalPosition(1.5, parsedValues[0], parsedValues[1]);
                        sphere.latLongToSphereCoords(1, parsedValues[0], parsedValues[1]);
                        const vec = sphere.latLongToSphereCoords(1, parsedValues[0], parsedValues[1]);
                        sphereMarker.updatePosition([vec[0], vec[1], vec[2]]);

                    } else if (typeof parsedValues[0] === 'string' && typeof parsedValues[1] === 'number') {
                        let axisVector: [number, number, number];
                        switch (parsedValues[0]) {
                            case 'x':
                                axisVector = [1, 0, 0];
                                break;
                            case 'y':
                                axisVector = [0, 1, 0];
                                break;
                            case 'z':
                                axisVector = [0, 0, 1];
                                break;
                            default:
                                console.error('Invalid axis value');
                                return;
                        }
                        sphere.rotate(axisVector, parsedValues[1]);

                    }
                } else {
                    console.error('Parsed values are null');
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }

        }
    }

    private extractValuesFromResponse(response: string): number[] | [string, number] | null {
        // Match for [float, float], [float, float, float], or ['axis', float]
        const matchFloatArray = response.match(/\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,\s*(-?\d+(?:\.\d+)?))?\]/);
        const matchAxisArray = response.match(/\[(\w+),\s*(-?\d+(?:\.\d+)?)\]/);

        // Handle [float, float] or [float, float, float]
        if (matchFloatArray) {
            const values = matchFloatArray.slice(1).filter(Boolean).map(Number);
            return values as number[]; // Can be [float, float] or [float, float, float]
        }

        // Handle ['axis', float]
        if (matchAxisArray) {
            const axis = matchAxisArray[1];
            const value = parseFloat(matchAxisArray[2]);
            return [axis, value]; // ['axis', float]
        }
        // Return null if nothing matched
        return null;
    }


    private displayUserMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble';
        new_message_div.textContent = "Me: " + message + "\n";
        this.messagesContainer.appendChild(new_message_div);
        this.scrollToBottom();
    }

    private displaySystemMessage(message: string) {
        const new_message_div = document.createElement('div');
        new_message_div.className = 'message-bubble-GPT';
        new_message_div.textContent = "GPT: " + message + "\n";
        this.messagesContainer.appendChild(new_message_div);
        this.scrollToBottom();
    }

    private scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    private getCameraContext() {
        this.contextManager.setCoordinates(this.camera.getSphericalCoordinates().latitude, this.camera.getSphericalCoordinates().longitude);
    }

    getContextManager(): ContextManager {
        return this.contextManager;
    }
}
