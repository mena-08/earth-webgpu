export class CloudComputeTest {
    private device: GPUDevice;
    private computePipeline!: GPUComputePipeline;
    private densityBuffer!: GPUBuffer;
    private resultBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initializeBuffers();
        this.createComputePipeline();
        this.createBindGroup();
    }

    private initializeBuffers(): void {
        const bufferSize = 128 * 128 * 128 * Float32Array.BYTES_PER_ELEMENT; // Example: Small 3D grid
        this.densityBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        this.resultBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    private createComputePipeline(): void {
        const computeShaderCode = `
        @group(0) @binding(0) var<storage, read_write> densityBuffer : array<f32>;

        @compute @workgroup_size(4, 4, 4)
        fn main(@builtin(global_invocation_id) id : vec3<u32>) {
            let size = vec3<u32>(128, 128, 128);
            let index = id.x + size.x * (id.y + size.y * id.z);
            if (id.x < size.x && id.y < size.y && id.z < size.z) {
                let uvw = vec3<f32>(id) / vec3<f32>(size);
                let density = fbm(uvw); // Example: Procedural noise
                densityBuffer[index] = density;
            }
        }

        fn fbm(position: vec3<f32>) -> f32 {
            // Example noise function
            return fract(sin(dot(position, vec3<f32>(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        `;

        this.computePipeline = this.device.createComputePipeline({
            label: "cloud-compute-pipeline",
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({ code: computeShaderCode }),
                entryPoint: "main",
            },
        });
    }

    private createBindGroup(): void {
        const bindGroupLayout = this.computePipeline.getBindGroupLayout(0);
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            label: "cloud-bind-group",
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.densityBuffer },
                },
            ],
        });
    }

    public async compute(): Promise<void> {
        // Command encoder
        const commandEncoder = this.device.createCommandEncoder();

        // Compute pass
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(32, 32, 32); // Adjust based on buffer size
        passEncoder.end();

        // Copy the density buffer to the result buffer
        commandEncoder.copyBufferToBuffer(this.densityBuffer, 0, this.resultBuffer, 0, this.densityBuffer.size);

        // Submit the commands
        this.device.queue.submit([commandEncoder.finish()]);

        // Read back the result
        await this.resultBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(this.resultBuffer.getMappedRange());
        console.log("Computed Densities:", result.slice(0, 100)); // Log first 100 values for testing
        this.resultBuffer.unmap();
    }
}
