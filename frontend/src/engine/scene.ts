import { Camera } from "./camera/camera";
import { KeyboardControls } from "../interactions/keyboard-controls"; // Adjust the import path as necessary
import { CloudComputeTest } from "./objects/cloud";

// frontend/src/engine/scene.ts
export class Scene {
    private device!: GPUDevice;
    private objects: Map<string, any>;
    private keyboardControls!: KeyboardControls;
    private nextId: number;

    constructor(device: GPUDevice) {
        this.device = device;
        this.objects = new Map();
        this.nextId = 0;
        console.log("Scene created...");
    }

    addObject(object: any): string {
        const id = this.generateUniqueId();
        object.id = id;
        this.objects.set(id, object);
        return id;
    }

    removeObject(object: any): void {
        this.objects.delete(object.id);
    }

    getObjectById(id: string): any | undefined {
        return this.objects.get(id);
    }

    getObjects(): any[] {
        return Array.from(this.objects.values());
    }

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        // First update all objects that need compute
        // for (const obj of this.objects.values()) {
        //     if (obj instanceof CloudComputeTest) {
        //         obj.compute();
        //     }
        // }
    
        // Now draw all objects
        for (const obj of this.objects.values()) {
            obj.draw(passEncoder, camera);
        }
    }

    set keyboardControlsSetter(keyboardControls: KeyboardControls) {
        //this.keyboardControls = keyboardControls;
    }

    private generateUniqueId(): string {
        return `object-${this.nextId++}`;
    }
}
