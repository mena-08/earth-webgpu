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
import { Sphere } from "engine/objects/sphere";
import { ChatManager } from "interactions/chat-manager";
import * as dat from 'dat.gui';


let render2: Renderer;
let sphere: Sphere;
let sphereMarker: Sphere;
let chat: ChatManager;
let test: string;


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

        render2 = new Renderer('gpuCanvas2', device);

        render2.onReady(() => {
            sphere = new Sphere(device, [0.0, 0.0, 0.0], 1.0);
            const textureURLs = ['ocean/turtles/loggerhead_sea_turtles_track.m3u8','ocean/sea_surface_temperature/sea_surface_temperature.m3u8', 'ocean/phytoplankton/phytoplankton.m3u8', 'ocean/tsunami_alaska/tsunami_alaska.m3u8'];
            const names = ['Loggerhead Sea Turtles','Sea Surface Temperature', 'Phytoplankton', 'Tsunami JAPAN'];
            sphere.loadMultipleTextures(textureURLs);
            const gui = new dat.GUI();
            const textureFolder = gui.addFolder('Datasets');
            chat = new ChatManager('chat-input', 'send-btn', 'messages', render2.getCamera());

            // Add buttons for each texture in the GUI
            textureURLs.forEach((url, index) => {
                textureFolder.add({ loadTexture: async () => { 
                    sphere.switchTextureByIndex(index);
                    const x = `https://mena-08.github.io/conversational-website/assets/${url.replace('.m3u8', '.txt')}`;
                    console.log(x);
                    test = x;
                    
                    // Await the dataset loading
                    await chat.getContextManager().setDatasetFromString(x);
                    
                    console.log("Dataset has been loaded and context updated.");
                } }, 'loadTexture').name(`${names[index]}`);
            });
            
            

            // // Optionally open the folder by default
            textureFolder.open();

            // const gui = new dat.GUI();
            // const folder1 = gui.addFolder('Ocean Datasets');
            // const folder2 = gui.addFolder('Land Datasets');
            // // Add 5 entries to each folder
            // // Add buttons to Folder 1
            // folder1.add(settings.folder1, 'entry1').name('Loggerhead Sea Turtles');
            // folder1.add(settings.folder1, 'entry2').name('Sea Surface Temperature');
            // folder1.add(settings.folder1, 'entry3').name('Phytoplankton');

            // // Add buttons to Folder 2
            // folder2.add(settings.folder2, 'entry1').name('Tsunami of JAPAN');
            // folder2.add(settings.folder2, 'entry2').name('Tsunami of ALASKA');
            // folder2.add(settings.folder2, 'entry3').name('TESTING');

            //render2.getCamera().setSphericalPosition(1.5, -25.274398, 133.775136);
            //this.camera.setSphericalPosition(2.0, 35.682839, 139.759455);

            //this one is for deployment
            //sphere.loadTexture('/conversational-website/assets/ocean/sea_surface_temperature/sea_surface_temperature.m3u8', true);
            //this one is for local testing
            //sphere.loadTexture('ocean/turtles/loggerhead_sea_turtles_track.m3u8', true);
            //sphere.loadTexture('ocean/sea_surface_temperature/sea_surface_temperature.m3u8', true);
            render2.addObject(sphere);
        });

        //render.getScene
        new ChatManager('chat-input', 'send-btn', 'messages', render2.getCamera());
    } else {
        alert("WebGPU not supported on this browser. Engine not loaded...");
    }
});

export { render2, sphere, sphereMarker, test };