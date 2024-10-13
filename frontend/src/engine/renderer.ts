// frontend/src/engine/renderer.ts
import { Scene } from './scene';
import { Triangle } from './objects/triangle';
import { Sphere } from './objects/sphere';
import { Camera } from './camera/camera';
import { CameraControls } from '../interactions/camera-controls';
import { KeyboardControls } from '../interactions/keyboard-controls';

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

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.camera = new Camera([2.0, 2.0, -5.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], 45, this.canvas.width / this.canvas.height, 0.1, 100);
        this.initializeWebGPU().then(() => {
            this.clearCanvas();
            this.createDepthTexture();
            //initialize camera and scene
            this.resizeCanvas();
            this.cameraControls = new CameraControls(this.camera, this.canvas);
            
            this.scene = new Scene(this.device);
            
            const triangle = new Triangle(this.device, [1.0, 0.0, 0.0, 1.0], [0.5, 0.5, 0.0]);
            const sphere = new Sphere(this.device, [0.0, 0.0, 0.0], 1.0);
            this.scene.addObject(sphere);
            sphere.loadTexture('base_map_normal.jpg');
            sphere.loadTexture('base_map.jpg');
            sphere.loadTexture('ocean/turtles/loggerhead_sea_turtles_track.m3u8', true);
            sphere.loadTexture('ocean/sea_surface_temperature/sea_surface_temperature.m3u8', true);
            
            this.scene.addObject(triangle);
            this.scene.keyboardControlsSetter = new KeyboardControls(this.scene);
            this.startRenderingLoop();
        }).catch(error => {
            console.error("Failed to initialize WebGPU:", error);
        });
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


    private async initializeWebGPU(): Promise<void> {
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Failed to get GPU adapter.");
        }

        this.device = await adapter.requestDevice();
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
            colorAttachments: [{
                view: textureView,
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
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

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        const depthTextureView = this.depthTexture.createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
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