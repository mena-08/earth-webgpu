class GPUDeviceManager {
    private static instance: GPUDeviceManager;
    private device: GPUDevice | null = null;

    private constructor() {}  // Private constructor to prevent direct construction calls

    public static getInstance(): GPUDeviceManager {
        if (!GPUDeviceManager.instance) {
            GPUDeviceManager.instance = new GPUDeviceManager();
        }
        return GPUDeviceManager.instance;
    }

    public async initializeDevice(): Promise<GPUDevice> {
        if (this.device) return this.device; // Return the existing device if already initialized

        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported on this device.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Failed to get GPU adapter.");
        }

        this.device = await adapter.requestDevice();
        return this.device;
    }

    public getDevice(): GPUDevice {
        if (!this.device) {
            throw new Error("GPU device not initialized. Call initializeDevice first.");
        }
        return this.device;
    }
}

export { GPUDeviceManager };
