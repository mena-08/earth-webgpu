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
import { Plane } from "engine/objects/plane";
import { Sphere } from "engine/objects/sphere";
import { ChatManager } from "interactions/chat-manager";
import { initDigitalElevationModel } from "engine/loaders/geotiff-manager";
import * as dat from 'dat.gui';
import { CloudComputeTest } from "engine/objects/cloud";



let render2: Renderer;
let sphere: Sphere;
let sphereMarker: Sphere;
let cloud: CloudComputeTest;  

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

    console.log("WebGPU is supported...");
    return true;
}

checkWebGPUSupport().then(async (supported) => {
    if (supported) {
        console.log("Loading rendering engine...");
        const deviceManager = GPUDeviceManager.getInstance();
        await deviceManager.initializeDevice();
        const device = deviceManager.getDevice();
        const render = new Renderer('gpuCanvas',  device);
        cloud = new CloudComputeTest(device);
        
        render.onReady(async () => {
            //cloud.compute();
            //render.addObject(cloud);
            const triangle =  new Triangle(device, [1.0, 0.0, 0.0, 1.0],[0.0, 0.0, 0.0]);
            render.addObject(cloud);
            render.addObject(triangle);
        });

    } else {
        alert("WebGPU not supported on this browser. Engine not loaded...");
    }
});

export { render2, sphere, sphereMarker, cloud };