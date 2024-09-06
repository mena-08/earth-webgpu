// frontend/src/engine/renderer.ts
import { Scene } from './scene';
import { Triangle } from './objects/triangle';
import { Sphere } from './objects/sphere';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private context!: GPUCanvasContext;
    private device!: GPUDevice;
    private swapChainFormat: GPUTextureFormat = 'bgra8unorm';
    private scene!: Scene;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.initializeWebGPU().then(() => {
            this.clearCanvas();
            this.scene = new Scene(this.device);
            
            const triangle = new Triangle(this.device, [1.0, 0.0, 0.0, 1.0], [0.5, 0.5, 0.0]);
            const triangle2 = new Triangle(this.device, [1.0, 0.0, 1.0, 1.0], [0.0, 0.0, 0.0]);
            const sphere = new Sphere(this.device, [0.0, 1.0, 0.0, 1.0], [0.0, 0.0, 0.0], 0.2);
            this.scene.addObject(triangle);
            this.scene.addObject(triangle2);
            this.scene.addObject(sphere);
            this.startRenderingLoop();
        }).catch(error => {
            console.error("Failed to initialize WebGPU:", error);
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
            alphaMode: 'opaque',
            format: this.swapChainFormat,
        };
        this.context.configure(configuration);
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
        
        this.scene.draw(passEncoder);
        passEncoder.end();
        
        const commands = commandEncoder.finish();
        this.device.queue.submit([commands]);
    }

}
