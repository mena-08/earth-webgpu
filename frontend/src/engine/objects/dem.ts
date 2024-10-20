import { Camera } from "../camera/camera";
import { createSampler, loadTexture } from "../loaders/texture-loader";
import { vec3, mat4 } from 'wgpu-matrix';

export class DigitalElevationModel {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private bindGroupLayout!: GPUBindGroupLayout;
    private modelMatrix = mat4.identity();
    private swapChainFormat: GPUTextureFormat = 'bgra8unorm'; // Define the swapChainFormat property

    constructor(device: GPUDevice, position: [number, number, number], private elevationData: Float32Array) {
        this.device = device;
        this.modelMatrix = mat4.translate(mat4.identity(), mat4.create(), vec3.fromValues(...position));
        this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.createBuffers();
        this.createBindGroupLayout();
        this.createPipeline();
        this.createBindGroup();
    }

    private createBindGroupLayout(): void {
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX, // or GPUShaderStage.FRAGMENT based on where you use it
                    buffer: {
                        type: 'uniform',
                    }
                }
            ]
        });
    }
    

    private async createBuffers(): Promise<void> {
        // Create buffers for vertices and indices based on elevation data
        const { vertices, indices } = this.generateMeshFromElevationData(this.elevationData);
        this.vertexBuffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
        this.vertexBuffer.unmap();

        this.indexBuffer = this.device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint32Array(this.indexBuffer.getMappedRange()).set(indices);
        this.indexBuffer.unmap();
    }

    private generateMeshFromElevationData(elevationData: Float32Array): { vertices: Float32Array, indices: Uint32Array } {
        // Simplified placeholder for mesh generation
        const gridWidth = Math.sqrt(elevationData.length); // Assuming a square grid
        const vertices = [];
        const indices = [];

        // Generate vertices
        for (let i = 0; i < gridWidth; i++) {
            for (let j = 0; j < gridWidth; j++) {
                const x = i / (gridWidth - 1);
                const z = j / (gridWidth - 1);
                const y = elevationData[i * gridWidth + j]; // Height from elevation data
                vertices.push(x, y, z, 1.0); // Assuming all data points are on a flat XZ plane initially
            }
        }

        // Generate indices (two triangles per grid cell)
        for (let i = 0; i < gridWidth - 1; i++) {
            for (let j = 0; j < gridWidth - 1; j++) {
                const topLeft = i * gridWidth + j;
                const topRight = topLeft + 1;
                const bottomLeft = (i + 1) * gridWidth + j;
                const bottomRight = bottomLeft + 1;

                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices)
        };
    }

    private createPipeline(): void {
        // Vertex shader code
        const vertexShaderCode = `
            @vertex
            fn vs_main(@location(0) position: vec4<f32>) -> @builtin(position) vec4<f32> {
                return position; // Simplified for demonstration
            }
        `;


        // Fragment shader code
        const fragmentShaderCode = `
            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Red color for all vertices
            }
        `;

        // Pipeline setup
        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            vertex: {
                module: this.device.createShaderModule({ code: vertexShaderCode }),
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 16,
                    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }]
                }]
            },
            fragment: {
                module: this.device.createShaderModule({ code: fragmentShaderCode }),
                entryPoint: 'fs_main',
                targets: [{ format: this.swapChainFormat }]
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
    }

    private createBindGroup(): void {
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } }
            ]
        });
    }

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.drawIndexed(this.indexBuffer.size / 4); // Assuming each index is a Uint32
    }
}
