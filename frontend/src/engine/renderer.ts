// frontend/src/engine/renderer.ts
import { Scene } from './scene';
import { Triangle } from './objects/triangle';
import { Sphere } from './objects/sphere';
import { Plane } from './objects/plane';
import { Camera } from './camera/camera';
import { CameraControls } from '../interactions/camera-controls';
import { KeyboardControls } from '../interactions/keyboard-controls';
import { initDigitalElevationModel } from './loaders/geotiff-manager';


export class Renderer {
    private canvas: HTMLCanvasElement;
    private context!: GPUCanvasContext;
    private device!: GPUDevice;
    private swapChainFormat: GPUTextureFormat = 'bgra8unorm';
    private scene!: Scene;
    private camera!: Camera;
    private cameraControls!: CameraControls;
    private depthTexture!: GPUTexture;
    private lastRenderTime : number= 0;
    private sphere!: Sphere;
    private needsRedraw: boolean = true;
    private isReady: boolean = false;
    private readyCallbacks: Array<() => void> = [];

    constructor(canvasId: string, device: GPUDevice) {
        this.device = device;
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.camera = new Camera([2.0, 2.0, 5.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], 45, this.canvas.width / this.canvas.height, 0.1, 1000000);
        this.initializeWebGPU(this.device).then(async () => {
            this.setupScene();
            this.isReady = true;
            this.cameraControls = new CameraControls(this.camera, this.canvas);
            this.readyCallbacks.forEach(callback => callback());
            
            const triwangle = new Triangle(this.device, [1.0, 0.0, 0.0, 1.0], [0.5, 0.5, 0.0]);
            // const sphere = new Sphere(this.device, [0.0, 0.0, 0.0], 1.0);
            
            // //this.scene.addObject(sphere);
            // //this.scene.addObject(plane);
            // sphere.loadTexture('base_map.jpg');
            // //sphere.loadTexture('base_map_normal.jpg');
            // sphere.loadTexture('ocean/turtles/loggerhead_sea_turtles_track.m3u8', true);
            // sphere.loadTexture('ocean/sea_surface_temperature/sea_surface_temperature.m3u8', true);
            
            //this.scene.addObject(triangle);
            //this.scene.keyboardControlsSetter = new KeyboardControls(this.scene);
            this.startRenderingLoop();

            // Add ResizeObserver for canvas resizing
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const width = entry.contentBoxSize[0].inlineSize;
                    const height = entry.contentBoxSize[0].blockSize;
                    this.canvas.width = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
                    this.canvas.height = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));
                    
                    // Update camera aspect ratio to maintain relation
                    this.camera.setAspectRatio(this.canvas.width / this.canvas.height);
                    this.camera.updateProjectionMatrix();
                    this.createDepthTexture();

                    // Trigger re-render
                    this.render();
                }
            });
            observer.observe(this.canvas);

        }).catch(error => {
            console.error("Failed to initialize WebGPU:", error);
        });
    }

    public onReady(callback: () => void): void {
        if(this.isReady) {
            return;
        }
        this.readyCallbacks.push(callback);
    }

    private setupScene(): void {
        this.clearCanvas();
        this.createDepthTexture();
        this.resizeCanvas();
        
        this.scene = new Scene(this.device);
    }

    public getScene(): Scene {
        if(!this.isReady){
            throw new Error("Renderer is not ready yet.");
        }
        return this.scene;
    }

    public addObject(object: any): void {
        console.log("Object being added: ", this.scene," ...");
        this.scene.addObject(object);
        this.needsRedraw = true;
        }

    private createDepthTexture(): void {
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }
    
        this.depthTexture = this.device.createTexture({
            size: {
                width: this.canvas.width,
                height: this.canvas.height,
                depthOrArrayLayers: 1
            },
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }


    private async initializeWebGPU(device: GPUDevice): Promise<void> {

        this.device = device;
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

        const devicePixelRatio = window.devicePixelRatio || 1;
        const presentationSize = [
            this.canvas.clientWidth * devicePixelRatio,
            this.canvas.clientHeight * devicePixelRatio,
        ];
        const configuration: GPUCanvasConfiguration = {
            device: this.device,
            alphaMode: 'premultiplied',
            format: this.swapChainFormat,
        };
        this.context.configure(configuration);
    }

    resizeCanvas(): void {
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
        this.camera.setAspectRatio(this.canvas.width / this.canvas.height);
        this.camera.updateProjectionMatrix();
        this.createDepthTexture();
    }

    getCamera(): Camera {
        return this.camera;
    }

    private clearCanvas(): void {
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            label: 'Clear-RenderPass',
            colorAttachments: [{
                view: textureView,
                loadOp: 'clear',
                clearValue: { r: 1, g: 1, b: 1, a: 1 },
                storeOp: 'store',
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.end();
        
        const commands = commandEncoder.finish();
        this.device.queue.submit([commands]);
    }

    private startRenderingLoop(): void {
        const frame = () => {
            if(this.needsRedraw) {
                this.render();
                this.needsRedraw = false;
            }
            this.render();
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    private render(): void {
        //camera stuff
        this.camera.updateViewMatrix();
        this.camera.updateProjectionMatrix();
        this.cameraControls.updateCameraOrbit(0.01);        

        const commandEncoder = this.device.createCommandEncoder({label: 'Main Frame Command Encoder'});
        const textureView = this.context.getCurrentTexture().createView();
        const depthTextureView = this.depthTexture.createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            label: 'Main RenderPass',
            colorAttachments: [{
                view: textureView,
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
            }],depthStencilAttachment: {
                view: depthTextureView,
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store',
            }
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        
        this.scene.draw(passEncoder, this.camera);
        passEncoder.end();
        
        const commands = commandEncoder.finish();
        this.device.queue.submit([commands]);
    }

}

//This could help camera setting stuff
//this.camera.setSphericalPosition(2.0, 35.682839, 139.759455);
//const smallSphere = Array.from(sphere.getPointOnSurface(Math.PI/4, Math.PI/4));
//this.camera.lookAt(Array.from(sun.getPosition()) as [number, number, number]);

//This could helpr with rotation of objects
// const timestamp = performance.now();
// const deltaTime = (timestamp - this.lastRenderTime) / 1000;
// this.lastRenderTime = timestamp;

// const rotationSpeed = Math.PI / 10; // Rotation speed (radians per second)
// const angle = rotationSpeed * deltaTime;
// this.sphere.rotate([0, 1, 0], angle);