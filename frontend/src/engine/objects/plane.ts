import { Camera } from 'engine/camera/camera';
import { createSampler, loadTexture } from "../loaders/texture-loader";
import { mat4, vec3 } from 'wgpu-matrix';

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
    
    private modeBuffer!: GPUBuffer;
    private zRangeBuffer!: GPUBuffer;
    private mode: number = 0; // 0: texture, 1: Z-based color
    private minZ: number = 0; // Will be set based on DEM data
    private maxZ: number = 0; // Will be set based on DEM data


    private modelMatrix = mat4.identity();
    
    constructor(device: GPUDevice, position: [number, number, number], width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1) {
        this.device = device;
        this.position = new Float32Array(position);
        this.modelMatrix = mat4.identity();
        this.initializeBindGroupLayout();
        this.createModeBuffer();
        this.createZRangeBuffer();
        this.initializeBuffers(width, height, widthSegments, heightSegments);
        this.createUniformBuffer();
        this.createPipeline();
    }

    async loadTexture(url: string, isVideo: boolean = false): Promise<void> {
        let texture, sampler;
        texture = await loadTexture(this.device, url);
        sampler = createSampler(this.device, 'static');
        this.textures.push(texture);
        this.samplers.push(sampler);  // Corresponding samplers for each texture
        this.updateBindGroup();
    }

    private createModeBuffer(): void {
        this.modeBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.modeBuffer, 0, new Uint32Array([this.mode]));
    }

    rotate(axis: [number, number, number], angle: number): void {
        const axisVec = new Float32Array(axis);
        mat4.axisRotate(this.modelMatrix, vec3.fromValues(axisVec[0], axisVec[1], axisVec[2]), angle, this.modelMatrix);
        this.updateUniformBuffer();
    }

    private updateUniformBuffer(){
        const byteOffsetModelMatrix = 0;

        this.device.queue.writeBuffer(
            this.uniformBuffer,
            byteOffsetModelMatrix,
            this.modelMatrix.buffer,
            this.modelMatrix.byteOffset,
            this.modelMatrix.byteLength
        );
    }
    
    private createZRangeBuffer(): void {
        this.zRangeBuffer = this.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // Initialize with default values
        this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
    }    

    private updateBindGroup(): void {
        if (this.textures.length === 0 || this.samplers.length === 0) {
            console.error("No textures or samplers initialized");
            return;
        }

        //always use the current texture index to update the bind group
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: this.samplers[0] },
                { binding: 2, resource: this.textures[0].createView() },
                { binding: 3, resource: { buffer: this.modeBuffer } },
                { binding: 4, resource: { buffer: this.zRangeBuffer } },
            ],
        });
    }

    public setMode(mode: number): void {
        this.mode = mode;
        this.device.queue.writeBuffer(this.modeBuffer, 0, new Uint32Array([this.mode]));
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
                const u = ix / gridX; // Calculate UV coordinates
                const v = (iy / gridY);

                // Position (x, y, z), UV (u, v)
                this.vertices.push(x + this.position[0], -y + this.position[1], 0 + this.position[2], 1.0, u, v);
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
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: 4 } }, // mode
                { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: 8 } }, // zRange
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
                @location(0) uv: vec2<f32>,
                @location(1) zValue: f32,
            };

            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            @vertex
            fn vs_main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
                var output: VertexOutput;
                let worldPosition = uniforms.modelMatrix * vec4<f32>(position.xyz, 1.0);
                output.zValue = position.z;
                let viewPosition = uniforms.viewMatrix * worldPosition;
                let clipPosition = uniforms.projectionMatrix * viewPosition;
                output.position = clipPosition;
                output.uv = uv;
                return output;
            }`;

        const fragmentShaderCode = `
            @group(0) @binding(1) var mySampler: sampler;
            @group(0) @binding(2) var myTexture: texture_2d<f32>;
            @group(0) @binding(3) var<uniform> mode: u32;
            @group(0) @binding(4) var<uniform> zRange: vec2<f32>;

            // Function to interpolate between colors
            fn interpolateColor(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
                return mix(a, b, t);
            }

            @fragment
            fn fs_main(@location(0) uv: vec2<f32>, @location(1) zValue: f32) -> @location(0) vec4<f32> {
            if (mode == 0u) {
                    return textureSample(myTexture, mySampler, uv);
            }else{
                   // Z-based coloring mode
                    let t = clamp((zValue - zRange.x) / (zRange.y - zRange.x), 0.0, 1.0);
                    
                    // Define the colors: purple (bottom), yellow (mid), red (top)
                    let purple = vec3<f32>(0.5, 0.0, 0.5);
                    let yellow = vec3<f32>(1.0, 1.0, 0.0);
                    let red = vec3<f32>(1.0, 0.0, 0.0);

                    // Interpolate between purple and yellow for t < 0.5, and yellow and red for t >= 0.5
                    let color = mix(
                        interpolateColor(purple, yellow, t * 2.0), // Bottom to mid
                        interpolateColor(yellow, red, (t - 0.5) * 2.0), // Mid to top
                        step(0.5, t) // Switch interpolation based on the midpoint
                    );

                    return vec4<f32>(color, 1.0);
            }
                //return textureSample(myTexture, mySampler, uv);
                //return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Output solid red color
            }`;

        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            label: "plane-pipeline",
            vertex: {
                module: this.device.createShaderModule({ code: vertexShaderCode, label: "plane-vertex" }),
                entryPoint: "vs_main",
                buffers: [{
                    arrayStride: 4 * 6,  // Only position, no UVs
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },
                        {
                            shaderLocation: 1,
                            offset: 4 * 4,
                            format: 'float32x2'
                        }
                    ]
                }]
            },
            fragment: {
                module: this.device.createShaderModule({ code: fragmentShaderCode, label: "plane-fragment" }),
                entryPoint: "fs_main",
                targets: [{ format: 'bgra8unorm' }]
            },
            primitive: { topology: 'line-list' },
            depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
        });
        //this.createBindGroup();
    }

    applyElevationData(demData: any): void {
        let minZ = Number.POSITIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
    
        demData.forEach((elevation: number, index: number) => {
            const zValue = (elevation / 10000) * 1; // Adjust scaling as needed
            this.vertices[index * 6 + 2] = zValue; // Update Z value
            minZ = Math.min(minZ, zValue);
            maxZ = Math.max(maxZ, zValue);
        });
    
        this.minZ = minZ; 
        this.maxZ = maxZ;
    
        // Update zRangeBuffer
        this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
    
        // Recreate the vertex buffer with updated Z values
        this.createVertexBuffer();
    }
    

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        if(!this.bindGroup) return;
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
