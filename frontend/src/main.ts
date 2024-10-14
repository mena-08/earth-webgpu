/**
 * The function `checkWebGPUSupport` checks for WebGPU support and initializes a rendering engine if
 * supported.
 * @returns The `checkWebGPUSupport` function returns a Promise that resolves to a boolean value
 * indicating whether WebGPU is supported on the device or not. If WebGPU is supported, it returns
 * `true`, otherwise it returns `false`.
 */
import { GPUDeviceManager } from "engine/loaders/gpu-device-manager";
import { Triangle } from "engine/objects/triangle";
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

checkWebGPUSupport().then(async (supported) => {
    if (supported) {
        console.log("Loading rendering engine...");
        const deviceManager = GPUDeviceManager.getInstance();
        await deviceManager.initializeDevice();
        const device = deviceManager.getDevice();
        
        
        const render = new Renderer('gpuCanvas',  device);
        
        render.onReady(() => {
            const triangle = new Triangle(device, [1.0, 0.0, 0.0, 1.0], [0.5, 2.0, 2.0]);
            const triangle2 = new Triangle(device, [1.0, 0.0, 1.0, 1.0], [0.5, 1.0, 0.0]);
            const triangle3 = new Triangle(device, [0.0, 0.0, 1.0, 1.0], [1.0, 0.5, 0.0]);
            //console.log("GPU device initialized.", render.getScene());
            render.addObject(triangle);
            render.addObject(triangle2);
            render.addObject(triangle3);
        });
        const render2 = new Renderer('gpuCanvas2',  device);
        
        
        //render.getScene
        // new ChatManager('chat-input', 'send-btn', 'messages', render.getCamera());
    } else {
        console.log("Rendering engine cannot be loaded due to lack of WebGPU support.");
    }
});
