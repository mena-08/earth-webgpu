export async function sendToServer(message: string): Promise<void> {
    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation: [{ role: 'user', content: '' }]
            })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok, status ${response.status}`);
        }

        const data = await response.json();
        console.log('Response received:', data);

        // Assuming the response contains a 'reply' field
        console.log(data.reply, 'GPT');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

export async function sendToServerStreaming(message: string, context: string): Promise<void> {
    try {
        const response = await fetch('http://localhost:3000/chat_stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation: [{ role: 'system', content: context }]
            })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok, status ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }
        const reader = response.body.getReader();
        let isFirstChunk = true;
        let messageContainer: HTMLElement | null = null;
        let leftover = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Stream complete');
                break;
            }
            const chunk = new TextDecoder("utf-8").decode(value);
            const cleanedChunk = chunk;
            const words = cleanedChunk.split(' ');
            words[0] = leftover + words[0]; // Prepend leftover to the first word
            leftover = words.pop() || ''; // Save the last potentially incomplete word

            const completeData = words.join(' ');
            // Check if first chunk to initialize message container
            if (isFirstChunk) {
                messageContainer = initializeGPTMessageContainer();
                isFirstChunk = false;
            }
            
            // Display each chunk in the GPT message bubble
            if (messageContainer) {
                messageContainer.textContent += completeData;
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function initializeGPTMessageContainer(): HTMLElement {
    const messages_container = document.getElementById('messages');
    if (!messages_container) {
        console.error('Error: messages_container is null');
        throw new Error('Message container not found');
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-bubble-GPT';
    messages_container.appendChild(messageDiv);
    return messageDiv;
}