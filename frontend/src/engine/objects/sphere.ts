import { Camera } from "../camera/camera";
import { createSampler, loadTexture } from "../loaders/texture-loader";
import {vec3, mat4 } from 'wgpu-matrix';
import { setupHLSVideoTexture } from "../loaders/texture-loader";

// frontend/src/engine/Sphere.ts
export class Sphere {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;

    private position: Float32Array;
    private radius: number = 0.5;
    private sampler!: GPUSampler;
    private currentTextureIndex = 0;

    private numIndices!: number;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private bindGroupLayout!: GPUBindGroupLayout;

    private textures: GPUTexture[] = [];
    private samplers : GPUSampler[] = [];

    private modelMatrix = mat4.identity();

    constructor(device: GPUDevice, position: [number, number, number], radius: number) {
        this.device = device;
        this.position = new Float32Array(position);
        this.radius = radius;
        this.modelMatrix = mat4.identity();
        this.initializeBindGroupLayout();
        this.initializeBuffers();
        this.createPipeline();
    }

    private initializeBuffers(): void {
        this.createVertexBuffer();
        this.createUniformBuffer();
    }

    private initializeBindGroupLayout(): void {
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', hasDynamicOffset: false, minBindingSize: 192 } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                //{ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                // { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
            ]
        });
    }
    

    async loadTexture(url: string, isVideo: boolean = false): Promise<void> {
        let texture, sampler;
        if (isVideo && url.endsWith('.m3u8')) {
            ({ texture, sampler } = await setupHLSVideoTexture(this.device, url));
        } else {
            texture = await loadTexture(this.device, url);
            sampler = createSampler(this.device, 'static');  // Assume a default sampler for static textures
        }
        this.textures.push(texture);
        this.samplers.push(sampler);  // Corresponding samplers for each texture
        this.updateBindGroup();
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
                { binding: 1, resource: this.samplers[this.currentTextureIndex] },
                { binding: 2, resource: this.textures[this.currentTextureIndex].createView() },
            ],
        });
    }


    // Buffers and pipeline creation
    private createVertexBuffer(): void {
        const segments = 128;
        const vertices = [];
        const indices = [];

        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = this.radius * cosPhi * sinTheta;
                const y = this.radius * cosTheta;
                const z = this.radius * sinPhi * sinTheta;
                let u = lon / segments;
                const v = lat / segments;
                u = 1 - u;

                vertices.push(x + this.position[0], y + this.position[1], z + this.position[2], 1.0, u, v);
            }
        }

        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = (lat * (segments + 1)) + lon;
                const second = first + segments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        this.numIndices = indices.length;

        this.vertexBuffer = this.device.createBuffer({
            size: vertices.length * 4,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(new Float32Array(vertices));
        this.vertexBuffer.unmap();

        this.indexBuffer = this.device.createBuffer({
            size: indices.length * 4,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint32Array(this.indexBuffer.getMappedRange()).set(new Uint32Array(indices));
        this.indexBuffer.unmap();
    }

    private createUniformBuffer(): void {
        this.uniformBuffer = this.device.createBuffer({
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    private async createPipeline(): Promise<void> {
        const vertexShaderCode = `
            struct Uniforms {
                viewMatrix: mat4x4<f32>,
                projectionMatrix: mat4x4<f32>,
                modelMatrix: mat4x4<f32>,
            };

            // Define the output structure for vertex shader
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>,
            }

            // Declare the uniform buffer and other resources
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            @vertex
            fn vs_main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
                var output: VertexOutput;
                let worldPosition = uniforms.modelMatrix * vec4<f32>(position.xyz, 1.0);
                let viewPosition = uniforms.viewMatrix * worldPosition;
                let clipPosition = uniforms.projectionMatrix * viewPosition;
                output.position = clipPosition;
                output.uv = uv; // Pass the UV coordinates to the fragment shader
                return output;
            }`;

        const fragmentShaderCode = `
            @group(0) @binding(1) var mySampler: sampler;
            @group(0) @binding(2) var myTexture: texture_2d<f32>;
            @group(0) @binding(3) var myNormalMap: texture_2d<f32>;
            // @group(0) @binding(4) var mySpecularMap: texture_2d<f32>;

            @fragment
            fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
                // Use the UV coordinates to sample the texture
                return textureSample(myTexture, mySampler, uv);
            }
        `;

        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            label: "sphere-pipeline",
            vertex: {
                module: this.device.createShaderModule({
                    code: vertexShaderCode
                }),
                entryPoint: "vs_main",
                buffers: [{
                    arrayStride: 4 * 6,
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x4'
                        },
                        {
                            shaderLocation: 1,
                            offset: 4 * 4,
                            format: 'float32x2'
                        }
                    ]
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
                topology: 'triangle-list',
                //topology: 'line-list',
            },depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }
            
        });
        //this.createBindGroup();
    }


    private updateUniformBuffer(){
        const byteOffsetModelMatrix = 0;// Assuming modelMatrix is the first in the buffer.

        this.device.queue.writeBuffer(
            this.uniformBuffer,
            byteOffsetModelMatrix,
            this.modelMatrix.buffer,
            this.modelMatrix.byteOffset,
            this.modelMatrix.byteLength
        );
    }

    latLongToSphereCoords(radius:number, latitude:number , longitude:number) {
        const latRad = (latitude * Math.PI) / 180;
        const longRad = (longitude * Math.PI) / 180;
    
        // Spherical to Cartesian conversion
        const x = radius * Math.cos(latRad) * Math.cos(longRad);
        const y = radius * Math.cos(latRad) * Math.sin(longRad);
        const z = radius * Math.sin(latRad);
    
        return vec3.fromValues(-x, z, y);
    }

    rotate(axis: [number, number, number], angle: number): void {
        const axisVec = new Float32Array(axis);
        mat4.axisRotate(this.modelMatrix, vec3.fromValues(axisVec[0], axisVec[1], axisVec[2]), angle, this.modelMatrix);
        this.updateUniformBuffer();
    }

    getPosition(): Float32Array {
        return this.position;
    }

    switchTexture(index: number): void {
        if (index < 0 || index >= this.textures.length) {
            console.error("Texture index out of bounds");
            return;
        }
        this.currentTextureIndex = index;
        this.updateBindGroup();
    }

    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        //console.log(this.modelMatrix);
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
        this.device.queue.writeBuffer(
            this.uniformBuffer,
            128,
            this.modelMatrix.buffer,
            this.modelMatrix.byteOffset,
            this.modelMatrix.byteLength
        );

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.drawIndexed(this.numIndices);
    }
}
