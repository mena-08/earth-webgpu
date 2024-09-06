// frontend/src/engine/scene.ts
export class Scene {
    private device!: GPUDevice;
    private objects: any[];

    constructor(device: GPUDevice) {
        this.device = device;
        this.objects = [];
        console.log("Scene created.");
    }

    addObject(object: any): void {
        this.objects.push(object);
    }

    removeObject(object: any): void {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    getObjects(): any[] {
        return this.objects;
    }

    draw(passEncoder: GPURenderPassEncoder): void {
        for (const obj of this.objects) {
            obj.draw(passEncoder);
        }
    }
}
