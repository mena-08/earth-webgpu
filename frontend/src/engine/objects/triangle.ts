

// frontend/src/engine/Triangle.ts
export class Triangle {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private color: Float32Array;
    private position!: Float32Array;
    private orientation!: Float32Array;

    constructor(device: GPUDevice, color: [number, number, number, number], position: [number, number, number]) {
        this.device = device;
        this.color = new Float32Array(color);
        this.position = new Float32Array(position);
        this.createVertexBuffer();
        this.createPipeline();
    }

    private createVertexBuffer(): void {
        const vertices = new Float32Array([
            0.0 + this.position[0], 0.5 + this.position[1], this.position[2], 1.0,
            -0.5 + this.position[0], -0.5 + this.position[1], this.position[2], 1.0,
            0.5 + this.position[0], -0.5 + this.position[1], this.position[2], 1.0
        ]);
        this.vertexBuffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
        this.vertexBuffer.unmap();
    }

    private createPipeline(): void {
        const vertexShaderCode = `
            @vertex
            fn vs_main(@location(0) position: vec4<f32>) -> @builtin(position) vec4<f32> {
                return position;
            }
        `;
    
        const fragmentShaderCode = `
            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(${this.color.join(',')});
            }
        `;
    
        this.pipeline = this.device.createRenderPipeline({
            label: "triangle-pipeline",
            layout:"auto",
            vertex: {
                module: this.device.createShaderModule({
                    code: vertexShaderCode
                }),
                entryPoint: "vs_main",
                buffers: [{
                    arrayStride: 4 * 4,
                    attributes: [{
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x4'
                    }]
                }]
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: fragmentShaderCode
                }),
                entryPoint: "fs_main",
                targets: [{
                    format: 'bgra8unorm'
                }]
            },
            primitive: {
                topology: 'triangle-list'
            }
        });
    }
    

    draw(passEncoder: GPURenderPassEncoder): void {
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.draw(3, 1, 0, 0);
    }
}
