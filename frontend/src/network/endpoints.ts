/**
 * The above functions in TypeScript send messages to a server for processing, with the second function
 * supporting streaming responses.
 * @param {string} message - The `message` parameter in both `sendToServer` and `sendToServerStreaming`
 * functions represents the text message that you want to send to the server for processing. It could
 * be a user input or a prompt for a conversation.
 * @returns The `sendToServer` function returns the reply received from the server as a string. The
 * `sendToServerStreaming` function returns all the messages received from the server during the
 * streaming process as a single concatenated string.
 */
export async function sendToServer(message: string): Promise<string> {
    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation: [
                    { role: 'system', content: 'Youre a black magician and are casting a spell. Reply very shortly' },
                    { role: 'user', content: message }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok, status ${response.status}`);
        }

        const data = await response.json();
        console.log('Response received:', data);
        return data.reply;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

export async function sendToServerStreaming(message: string, context: string[]): Promise<string> {
    let allMessages = '';

    const updatedConversation = [...context.map(content => ({ role: 'system', content })), { role: 'user', content: message }];

    try {
        const response = await fetch('http://localhost:3000/chat_stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation: updatedConversation
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
            allMessages += cleanedChunk;
            const words = cleanedChunk.split(' ');
            words[0] = leftover + words[0];
            leftover = words.pop() || ''; 
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
    }
    return allMessages;
}