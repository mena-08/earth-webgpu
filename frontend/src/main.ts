import { Renderer } from "engine/renderer";
import { ChatManager } from "interactions/chat-manager";

// frontend/src/main.ts
async function checkWebGPUSupport(): Promise<boolean> {
    if (!navigator.gpu) {
        console.error("WebGPU is not supported on this device!");
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.error("Failed to get GPU adapter!");
            return false;
        }
        const device = await adapter.requestDevice();
        if (!device) {
            console.error("Failed to get GPU device!");
            return false;
        }
    } catch (error) {
        console.error("An error occurred while initializing WebGPU:", error);
        return false;
    }

    console.log("WebGPU is supported.");
    return true;
}

checkWebGPUSupport().then((supported) => {
    if (supported) {
        console.log("Loading rendering engine...");
        const render = new Renderer('gpuCanvas');
        console.log(render.getCamera());
        console.log("THIS SHOULD HAVE A CAMERA",render.getCamera());
        new ChatManager('chat-input', 'send-btn', 'messages', render.getCamera());
    } else {
        console.log("Rendering engine cannot be loaded due to lack of WebGPU support.");
    }
});
