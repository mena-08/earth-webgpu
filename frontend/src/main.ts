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


let render2: Renderer;
let sphere: Sphere;
let sphereMarker: Sphere;

// Define the Actions interface
const settings = {
    folder1: {
        entry1: () => {
            console.log('Button 1 in Folder 1 clicked');
        },
        entry2: () => {
            console.log('Button 2 in Folder 1 clicked');
        },
        entry3: () => {
            console.log('Button 3 in Folder 1 clicked');
        },
    },
    folder2: {
        entry1: () => { 
            console.log('Button 1 in Folder 2 clicked'); 
        },
        entry2: () => { 
            console.log('Button 2 in Folder 2 clicked'); 
        },
        entry3: () => { 
            console.log('Button 3 in Folder 2 clicked'); 
        },
    },
};

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


        //const render = new Renderer('gpuCanvas',  device);
        render2 = new Renderer('gpuCanvas2', device);

        // console.log("THIS SHOULD BE LOADING");
        //  const loader = initDigitalElevationModel(device,[0,0,0],'geoTIFF/n19_w156_1arc_v3.tif');
        //console.log(loader);
        console.log("+++++++++++++++++++++");
        // console.log(loader);

        // render.onReady(async () => {
        //     const triangle = new Triangle(device, [1.0, 0.0, 0.0, 1.0], [0.5, 2.0, 2.0]);
        //     const triangle2 = new Triangle(device, [1.0, 0.0, 1.0, 1.0], [0.5, 1.0, 0.0]);
        //     const triangle3 = new Triangle(device, [0.0, 0.0, 1.0, 1.0], [1.0, 0.5, 0.0]);


        //     //render.addObject(sphere);

        //     const plane = new Plane(device, [0.0, 0.0, 10.0], 4, 3, 1253, 979);

        //     const loader = await initDigitalElevationModel(device,[0,0,0],'geoTIFF/agri-medium-dem.tif');
        //     //const loader = await initDigitalElevationModel(device,[0,0,0],'geoTIFF/n19_w156_1arc_v3.tif');
        //     console.log("width:", loader[0]);
        //     console.log("height:", loader[1]);
        //     plane.loadTexture('geotiff/agri-medium-autumn.jpg');
        //     plane.setMode(1);

        //     loader[2].readRasters({interleave: true}).then((rasters: any) => {
        //         console.log("RASTERS:", rasters.length);

        //         plane.applyElevationData(rasters);
        //         plane.rotate([1, 0, 0], -Math.PI/2);
        //         //plane.loadTexture('geotiff/agri-medium-autumn.jpg');
        //     });

        //     //console.log("WHATS THIIIS", );
        //     console.log(loader[1]);
        //     //try to use the dem stuff here:

        //     console.log("Pkane:", plane);

        //     //console.log("GPU device initialized.", render.getScene());
        //     //render.addObject(triangle);
        //     render.addObject(plane);
        //     // render.addObject(triangle3);
        // });


        render2.onReady(() => {
            // const triangle = new Triangle(device, [1.0, 0.0, 0.0, 1.0], [0.5, 2.0, 2.0]);
            // const triangle2 = new Triangle(device, [1.0, 0.0, 1.0, 1.0], [0.5, 1.0, 0.0]);
            // const triangle3 = new Triangle(device, [0.0, 0.0, 1.0, 1.0], [1.0, 0.5, 0.0]);
            //console.log("GPU device initialized.", render.getScene());
            // render2.addObject(triangle);
            // render2.addObject(triangle2);
            // render2.addObject(triangle3);
            sphere = new Sphere(device, [0.0, 0.0, 0.0], 1.0);
            const textureURLs = ['ocean/turtles/loggerhead_sea_turtles_track.m3u8', 'ocean/sea_surface_temperature/sea_surface_temperature.m3u8', 'ocean/phytoplankton/phytoplankton.m3u8', 'ocean/tsunami_japan/tsunami_japan.m3u8'];
            const names = ['Loggerhead Sea Turtles', 'Sea Surface Temperature', 'Phytoplankton', 'Tsunami JAPAN'];
            sphere.loadMultipleTextures(textureURLs);
            // sphereMarker = new Sphere(device, [0.0, 0.0, 0.0], 0.01);
            // sphereMarker.loadTexture('red.jpg');
            const gui = new dat.GUI();
            const textureFolder = gui.addFolder('Datasets');

            // Add buttons for each texture in the GUI
            textureURLs.forEach((url, index) => {
                textureFolder.add({ loadTexture: () => sphere.switchTextureByIndex(index+1) }, 'loadTexture').name(`${names[index]}`);
            });

            // Optionally open the folder by default
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
            //this.scene.addObject(sphere);
            //this.scene.addObject(plane);
            //sphere.loadTexture('base_map.jpg');
            //sphere.loadTexture('base_map_normal.jpg');
            sphere.loadTexture('ocean/turtles/loggerhead_sea_turtles_track.m3u8', true);

            //sphere.loadTexture('ocean/sea_surface_temperature/sea_surface_temperature.m3u8', true);
            //render2.addObject(sphereMarker);
            render2.addObject(sphere);
        });

        //render.getScene
        new ChatManager('chat-input', 'send-btn', 'messages', render2.getCamera());
    } else {
        console.log("Rendering engine cannot be loaded due to lack of WebGPU support.");
    }
});

export { render2, sphere, sphereMarker };