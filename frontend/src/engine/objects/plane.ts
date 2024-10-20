import { Camera } from 'engine/camera/camera';
import { createSampler, loadTexture } from "../loaders/texture-loader";
import { mat4 } from 'wgpu-matrix';

export class Plane {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;

    private vertices: number[] = [];
    private position: Float32Array;

    private numIndices!: number;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private bindGroupLayout!: GPUBindGroupLayout;
    
    private textures: GPUTexture[] = [];
    private samplers : GPUSampler[] = [];

    private modelMatrix = mat4.identity();
    
    constructor(device: GPUDevice, position: [number, number, number], width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1) {
        this.device = device;
        this.position = new Float32Array(position);
        this.modelMatrix = mat4.identity();
        this.initializeBindGroupLayout();
        this.initializeBuffers(width, height, widthSegments, heightSegments);
        this.createUniformBuffer();
        this.createPipeline();
    }

    private initializeBuffers(width: number, height: number, widthSegments: number, heightSegments: number): void {
        const width_half = width / 2;
        const height_half = height / 2;

        const gridX = Math.floor(widthSegments);
        const gridY = Math.floor(heightSegments);

        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;

        const segment_width = width / gridX;
        const segment_height = height / gridY;

        //const vertices = [];
        this.vertices = [];
        const indices = [];

        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segment_height - height_half;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segment_width - width_half;
                this.vertices.push(x + this.position[0], -y + this.position[1], 0 + this.position[2], 1.0);  // Position only
            }
        }

        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = (ix + 1) + gridX1 * (iy + 1);
                const d = (ix + 1) + gridX1 * iy;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        this.numIndices = indices.length;
        this.createVertexBuffer();

        this.indexBuffer = this.device.createBuffer({
            size: indices.length * 4,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint32Array(this.indexBuffer.getMappedRange()).set(new Uint32Array(indices));
        this.indexBuffer.unmap();
    }

    private initializeBindGroupLayout(): void {
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', hasDynamicOffset: false, minBindingSize: 192 } },
            ]
        });
    }

    private createUniformBuffer(): void {
        this.uniformBuffer = this.device.createBuffer({
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    private createVertexBuffer(): void {
        this.vertexBuffer = this.device.createBuffer({
            size: this.vertices.length * 4,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(new Float32Array(this.vertices));
        this.vertexBuffer.unmap();
    }

    

    private async createPipeline(): Promise<void> {
        const vertexShaderCode = `
            struct Uniforms {
                viewMatrix: mat4x4<f32>,
                projectionMatrix: mat4x4<f32>,
                modelMatrix: mat4x4<f32>,
            };

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
            };

            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            @vertex
            fn vs_main(@location(0) position: vec4<f32>) -> VertexOutput {
                var output: VertexOutput;
                let worldPosition = uniforms.modelMatrix * position;
                let viewPosition = uniforms.viewMatrix * worldPosition;
                let clipPosition = uniforms.projectionMatrix * viewPosition;
                output.position = clipPosition;
                return output;
            }`;

        const fragmentShaderCode = `
            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Output solid red color
            }`;

        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            label: "plane-pipeline",
            vertex: {
                module: this.device.createShaderModule({ code: vertexShaderCode }),
                entryPoint: "vs_main",
                buffers: [{
                    arrayStride: 4 * 4,  // Only position, no UVs
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },
                    ]
                }]
            },
            fragment: {
                module: this.device.createShaderModule({ code: fragmentShaderCode }),
                entryPoint: "fs_main",
                targets: [{ format: 'bgra8unorm' }]
            },
            primitive: { topology: 'line-list' },
            depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
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
                    size: 192
                }
            }]
        });
    }

    applyElevationData(demData: any): void {
        console.log("DEM Data Length:", demData.length);
        // Modify the Z value of each vertex based on the DEM data
        demData.forEach((elevation: number, index: number) => {
            //console.log("Elevation:", elevation/1000);
            this.vertices[index * 4 + 2] = (elevation/1000) * -1; // Scale and invert elevation
        });
        console.log("Vertices Length:", this.vertices);

        // Recreate the vertex buffer with updated Z values
        this.createVertexBuffer();
    }

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        this.device.queue.writeBuffer(this.uniformBuffer, 0, camera.viewMatrix.buffer, camera.viewMatrix.byteOffset, camera.viewMatrix.byteLength);
        this.device.queue.writeBuffer(this.uniformBuffer, 64, camera.projectionMatrix.buffer, camera.projectionMatrix.byteOffset, camera.projectionMatrix.byteLength);
        this.device.queue.writeBuffer(this.uniformBuffer, 128, this.modelMatrix.buffer, this.modelMatrix.byteOffset, this.modelMatrix.byteLength);

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.drawIndexed(this.numIndices);
    }
}
