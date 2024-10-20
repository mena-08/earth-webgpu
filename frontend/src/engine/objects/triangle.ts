import { Camera } from "../camera/camera";


// frontend/src/engine/Triangle.ts
export class Triangle {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private color: Float32Array;
    private position: Float32Array;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;

    constructor(device: GPUDevice, color: [number, number, number, number], position: [number, number, number]) {
        this.device = device;
        //console.log("Device in Triangle:", this.device);
        this.color = new Float32Array(color);
        this.position = new Float32Array(position);
        this.initializeBuffers();
        this.createPipeline();
    }

    private initializeBuffers(): void {
        this.createVertexBuffer();
        this.createUniformBuffer();
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

    private createUniformBuffer(): void {
        // Ensure to align and size the buffer according to WebGPU specifications
        this.uniformBuffer = this.device.createBuffer({
            size: 128,  //Minimum size required by WebGPU for uniform buffers
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    private createPipeline(): void {
        const vertexShaderCode = `
        struct Uniforms {
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(@location(0) position: vec4<f32>) -> @builtin(position) vec4<f32> {
    let worldPosition = position;
    let viewPosition = uniforms.viewMatrix * worldPosition;
    let clipPosition = uniforms.projectionMatrix * viewPosition;
    return clipPosition;
}`;

        const fragmentShaderCode = `
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
            return vec4<f32>(${this.color.join(',')});
        }`;

        this.pipeline = this.device.createRenderPipeline({
            label: "triangle-pipeline",
            layout: "auto",
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
            },depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }
        });
        this.createBindGroup();
    }

    private createBindGroup(): void {
        const bindGroupLayout = this.pipeline.getBindGroupLayout(0);
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                    size: 128
                }
            }]
        });
    }

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        // Update the uniform buffer with the latest camera matrices
        this.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            camera.viewMatrix.buffer,
            camera.viewMatrix.byteOffset,
            camera.viewMatrix.byteLength
        );
        this.device.queue.writeBuffer(
            this.uniformBuffer,
            64,
            camera.projectionMatrix.buffer,
            camera.projectionMatrix.byteOffset,
            camera.projectionMatrix.byteLength
        );

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.draw(3, 1, 0, 0);  // Draw 3 vertices (triangle)
    }
}