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
        //THIS ONE IS FOR LOCAL TESTING
        //const response = await fetch('http://localhost:3000/chat', {

            //THIS ONE IS FOR DEPLOYMENT
            const response = await fetch('https://earthgpt.a.pinggy.link/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation: [
                    {
                        role: 'system', content: 'You are a 3D visualization tool in charge of navigation. Based on the prompt, reply always only with numerical vectors and no space within the brackets:\
                        Two values for geographic coordinates. [lat,long], be as accurate as possible and use the WGS84. \
                        Three values for 3D object movement. [0,3,0] or [3,3,1] as an example. \
                        A single value along with x, y, or z as literal for rotation. [x,90] or [z,20] as an example If an axis or direction was not given, assume y axis. \
                        Ignore any malformed input, like just one character or accidentally finished prompts and give no other explanations.'},
                    { role: 'user', content: message }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok, status ${response.status}`);
        }

        const data = await response.json();
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
        const response = await fetch('https://earthgpt.a.pinggy.link/chat_stream', {
        //const response = await fetch('http://localhost:3000/chat_stream', {
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

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Stream complete');
                break;
            }
            const chunk = new TextDecoder("utf-8").decode(value);
            allMessages += chunk;
        }


    } catch (error) {
        console.error('Error sending message:', error);
    }
    return allMessages;
}