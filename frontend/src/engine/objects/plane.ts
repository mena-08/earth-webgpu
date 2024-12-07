// import { Camera } from 'engine/camera/camera';
// import { createSampler, loadTexture } from "../loaders/texture-loader";
// import { mat4, vec3 } from 'wgpu-matrix';

// export class Plane {
//     private device: GPUDevice;
//     private pipeline!: GPURenderPipeline;
//     private vertexBuffer!: GPUBuffer;
//     private indexBuffer!: GPUBuffer;

//     private vertices!: Float32Array;
//     private position: Float32Array;
//     private numIndices!: number;

//     private uniformBuffer!: GPUBuffer;
//     private bindGroup!: GPUBindGroup;
//     private bindGroupLayout!: GPUBindGroupLayout;
    
//     private textureURL!: string;
//     private texture?: GPUTexture;
//     private sampler?: GPUSampler;

//     private modeBuffer!: GPUBuffer;
//     private zRangeBuffer!: GPUBuffer;
//     private minZ: number = 0;
//     private maxZ: number = 0;

//     private modelMatrix = mat4.identity();
    
//     constructor(device: GPUDevice, position: [number, number, number], width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1, tileSize: number = 1) {
//         this.device = device;
//         this.position = new Float32Array(position);
//         this.modelMatrix = mat4.identity();
        
//         this.initializeBindGroupLayout();
//         this.createZRangeBuffer();
//         this.initializeBuffers(width, height, widthSegments, heightSegments);
//         this.createUniformBuffer();
//         this.createPipeline();
//     }

//     async loadTexture(url: string, isVideo: boolean = false): Promise<void> {
//         if (!this.texture || this.textureURL !== url) { 
//             this.texture = await loadTexture(this.device, url);
//             this.sampler = createSampler(this.device, 'static');
//             this.textureURL = url;
//             this.updateBindGroup();
//         }
//     }

//     rotate(axis: [number, number, number], angle: number): void {
//         const axisVec = new Float32Array(axis);
//         mat4.axisRotate(this.modelMatrix, vec3.fromValues(axisVec[0], axisVec[1], axisVec[2]), angle, this.modelMatrix);
//         this.updateUniformBuffer();
//     }

//     private updateUniformBuffer() {
//         this.device.queue.writeBuffer(
//             this.uniformBuffer,
//             0,
//             this.modelMatrix.buffer,
//             this.modelMatrix.byteOffset,
//             this.modelMatrix.byteLength
//         );
//     }
    
//     private createZRangeBuffer(): void {
//         this.zRangeBuffer = this.device.createBuffer({
//             label: 'Z Range Buffer',
//             size: 8,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
//         });
//         this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
//     }

//     private updateBindGroup(): void {
//         if (!this.texture || !this.sampler) return;

//         this.bindGroup = this.device.createBindGroup({
//             layout: this.pipeline.getBindGroupLayout(0),
//             entries: [
//                 { binding: 0, resource: { buffer: this.uniformBuffer } },
//                 { binding: 1, resource: this.sampler },
//                 { binding: 2, resource: this.texture.createView() },
//                 //{ binding: 3, resource: { buffer: this.modeBuffer } },
//                 { binding: 4, resource: { buffer: this.zRangeBuffer } },
//             ],
//         });
//     }

//     private initializeBuffers(width: number, height: number, widthSegments: number, heightSegments: number): void {
//         const width_half = width / 2;
//         const height_half = height / 2;
//         const gridX = Math.floor(widthSegments);
//         const gridY = Math.floor(heightSegments);
//         const gridX1 = gridX + 1;
//         const gridY1 = gridY + 1;
//         const segment_width = width / gridX;
//         const segment_height = height / gridY;
    
//         // Create vertex array with only position (x, y, z)
//         this.vertices = new Float32Array(gridX1 * gridY1 * 3);
//         let vertexIdx = 0;
    
//         for (let iy = 0; iy < gridY1; iy++) {
//             const y = iy * segment_height - height_half;
//             for (let ix = 0; ix < gridX1; ix++) {
//                 const x = ix * segment_width - width_half;
//                 this.vertices.set([x + this.position[0], -y + this.position[1], 0 + this.position[2]], vertexIdx);
//                 vertexIdx += 3;
//             }
//         }
    
//         // Create index buffer for triangle strip with degenerate vertices between rows
//         const indices = [];
//         for (let iy = 0; iy < gridY; iy++) {
//             for (let ix = 0; ix < gridX1; ix++) {
//                 indices.push(iy * gridX1 + ix);         // Top vertex of the quad
//                 indices.push((iy + 1) * gridX1 + ix);   // Bottom vertex of the quad
//             }
    
//             // Insert degenerate vertices at the end of the row, except for the last row
//             if (iy < gridY - 1) {
//                 indices.push((iy + 1) * gridX1 + gridX1 - 1);  // Repeat last vertex of the row
//                 indices.push((iy + 1) * gridX1);               // First vertex of the next row
//             }
//         }
    
//         this.numIndices = indices.length;
    
//         // Create the vertex buffer
//         this.createVertexBuffer();
    
//         // Create the index buffer
//         this.indexBuffer = this.device.createBuffer({
//             label: 'plane-index-buffer',
//             size: indices.length * 4,
//             usage: GPUBufferUsage.INDEX,
//             mappedAtCreation: true
//         });
//         new Uint32Array(this.indexBuffer.getMappedRange()).set(indices);
//         this.indexBuffer.unmap();
//     }
    
    

//     private initializeBindGroupLayout(): void {
//         this.bindGroupLayout = this.device.createBindGroupLayout({
//             entries: [
//                 { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: 192 } },
//                 { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
//                 { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
//                 //{ binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: 4 } },
//                 { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: 8 } },
//             ]
//         });
//     }

//     private createUniformBuffer(): void {
//         this.uniformBuffer = this.device.createBuffer({
//             label: 'plane-uniform-buffer',
//             size: 192,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
//         });
//     }

//     private createVertexBuffer(): void {
//         this.vertexBuffer = this.device.createBuffer({
//             label: 'plane-vertex-buffer',
//             size: this.vertices.byteLength,
//             usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//         });
//         this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
//     }

//     private async createPipeline(): Promise<void> {
//         const vertexShaderCode = `
//             struct Uniforms {
//                 viewMatrix: mat4x4<f32>,
//                 projectionMatrix: mat4x4<f32>,
//                 modelMatrix: mat4x4<f32>,
//             };

//             struct VertexOutput {
//                 @builtin(position) position: vec4<f32>,
//                 @location(0) uv: vec2<f32>,
//                 @location(1) zValue: f32,
//             };

//             @group(0) @binding(0) var<uniform> uniforms: Uniforms;

//             @vertex
//             fn vs_main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
//                 var output: VertexOutput;
//                 let worldPosition = uniforms.modelMatrix * vec4<f32>(position.xyz, 1.0);
//                 output.zValue = position.z;
//                 let viewPosition = uniforms.viewMatrix * worldPosition;
//                 let clipPosition = uniforms.projectionMatrix * viewPosition;
//                 output.position = clipPosition;
//                 output.uv = uv;
//                 return output;
//             }`;

//         const fragmentShaderCode = `
//             @group(0) @binding(1) var mySampler: sampler;
//             @group(0) @binding(2) var myTexture: texture_2d<f32>;
//             //@group(0) @binding(3) var<uniform> mode: u32;
//             @group(0) @binding(4) var<uniform> zRange: vec2<f32>;

//             // Function to interpolate between colors
//             fn interpolateColor(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
//                 return mix(a, b, t);
//             }

//             @fragment
//             fn fs_main(@location(0) uv: vec2<f32>, @location(1) zValue: f32) -> @location(0) vec4<f32> {
//             return vec4<f32>(1.0, 0.0, 0.0, 1.0);
//         //    if (mode == 0u) {
//         //            return textureSample(myTexture, mySampler, uv);
//         //    }else{
//         //           // Z-based coloring mode
//         //            let t = clamp((zValue - zRange.x) / (zRange.y - zRange.x), 0.0, 1.0);
                   
//         //            // Define the colors: purple (bottom), yellow (mid), red (top)
//         //            let purple = vec3<f32>(0.5, 0.0, 0.5);
//         //            let yellow = vec3<f32>(1.0, 1.0, 0.0);
//         //            let red = vec3<f32>(1.0, 0.0, 0.0);

//         //            // Interpolate between purple and yellow for t < 0.5, and yellow and red for t >= 0.5
//         //            let color = mix(
//         //                interpolateColor(purple, yellow, t * 2.0), // Bottom to mid
//         //                interpolateColor(yellow, red, (t - 0.5) * 2.0), // Mid to top
//         //                step(0.5, t) // Switch interpolation based on the midpoint
//         //            );

//         //            return vec4<f32>(color, 1.0);
//         //    }
//                 //return textureSample(myTexture, mySampler, uv);
//                 //return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Output solid red color
//             }`;

//         this.pipeline = this.device.createRenderPipeline({
//             layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
//             label: "plane-pipeline",
//             vertex: {
//                 module: this.device.createShaderModule({ code: vertexShaderCode, label: "plane-vertex" }),
//                 entryPoint: "vs_main",
//                 buffers: [{
//                     arrayStride: 4 * 6,  // Only position, no UVs
//                     attributes: [
//                         { shaderLocation: 0, offset: 0, format: 'float32x4' },
//                         {
//                             shaderLocation: 1,
//                             offset: 4 * 4,
//                             format: 'float32x2'
//                         }
//                     ]
//                 }]
//             },
//             fragment: {
//                 module: this.device.createShaderModule({ code: fragmentShaderCode, label: "plane-fragment" }),
//                 entryPoint: "fs_main",
//                 targets: [{ format: 'bgra8unorm' }]
//             },
//             primitive: { topology: 'triangle-strip', stripIndexFormat: 'uint32' },
//             depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
//         });
//         //this.createBindGroup();
//     }    

//     applyElevationData(demData: Float32Array): void {
//         // let minZ = Number.POSITIVE_INFINITY;
//         // let maxZ = Number.NEGATIVE_INFINITY;
    
//         // for (let i = 0; i < demData.length; i++) {
//         //     const zValue = demData[i] / 10000;
//         //     this.vertices[i * 7 + 2] = zValue;
//         //     minZ = Math.min(minZ, zValue);
//         //     maxZ = Math.max(maxZ, zValue);
//         // }

//         // this.minZ = minZ;
//         // this.maxZ = maxZ;

//         // // Update zRangeBuffer and vertex buffer
//         // this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
//         // this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
//     }

//     draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
//         if (!this.bindGroup) return;
//         this.device.queue.writeBuffer(this.uniformBuffer, 0, camera.viewMatrix.buffer, camera.viewMatrix.byteOffset, camera.viewMatrix.byteLength);
//         this.device.queue.writeBuffer(this.uniformBuffer, 64, camera.projectionMatrix.buffer, camera.projectionMatrix.byteOffset, camera.projectionMatrix.byteLength);
//         this.device.queue.writeBuffer(this.uniformBuffer, 128, this.modelMatrix.buffer, this.modelMatrix.byteOffset, this.modelMatrix.byteLength);

//         passEncoder.setPipeline(this.pipeline);
//         passEncoder.setVertexBuffer(0, this.vertexBuffer);
//         passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
//         passEncoder.setBindGroup(0, this.bindGroup);
//         passEncoder.drawIndexed(this.numIndices);
//     }
// }


// import { Camera } from 'engine/camera/camera';
// import { mat4, vec3 } from 'wgpu-matrix';

// export class Plane {
//     private device: GPUDevice;
//     private pipeline!: GPURenderPipeline;
//     private vertexBuffer!: GPUBuffer;
//     private indexBuffer!: GPUBuffer;

//     private vertices!: Float32Array;
//     private position: Float32Array;
//     private numIndices!: number;

//     private uniformBuffer!: GPUBuffer;
//     private bindGroup!: GPUBindGroup;
//     private bindGroupLayout!: GPUBindGroupLayout;

//     private zRangeBuffer!: GPUBuffer;
//     private minZ: number = 0;
//     private maxZ: number = 0;

//     private modelMatrix = mat4.identity();
    
//     constructor(device: GPUDevice, position: [number, number, number], width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1) {
//         this.device = device;
//         this.position = new Float32Array(position);
//         this.modelMatrix = mat4.identity();
        
//         this.initializeBindGroupLayout();
//         this.initializeBuffers(width, height, widthSegments, heightSegments);
//         this.createUniformBuffer();
//         this.createZRangeBuffer();
//         this.createPipeline();
//     }

//     rotate(axis: [number, number, number], angle: number): void {
//         const axisVec = new Float32Array(axis);
//         mat4.axisRotate(this.modelMatrix, vec3.fromValues(axisVec[0], axisVec[1], axisVec[2]), angle, this.modelMatrix);
//         this.updateUniformBuffer();
//     }

//     private updateUniformBuffer() {
//         this.device.queue.writeBuffer(
//             this.uniformBuffer,
//             0,
//             this.modelMatrix.buffer,
//             this.modelMatrix.byteOffset,
//             this.modelMatrix.byteLength
//         );
//     }

//     private initializeBindGroupLayout(): void {
//         this.bindGroupLayout = this.device.createBindGroupLayout({
//             entries: [
//                 { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: 192 } },
//             ]
//         });
//     }

//     private createUniformBuffer(): void {
//         this.uniformBuffer = this.device.createBuffer({
//             label: 'plane-uniform-buffer',
//             size: 192,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
//         });
//     }

//     private initializeBuffers(width: number, height: number, widthSegments: number, heightSegments: number): void {
//         const width_half = width / 2;
//         const height_half = height / 2;
//         const gridX = Math.floor(widthSegments);
//         const gridY = Math.floor(heightSegments);
//         const gridX1 = gridX + 1;
//         const gridY1 = gridY + 1;
//         const segment_width = width / gridX;
//         const segment_height = height / gridY;

//         // Create vertex array with only position (x, y, z)
//         this.vertices = new Float32Array(gridX1 * gridY1 * 3);
//         let vertexIdx = 0;

//         for (let iy = 0; iy < gridY1; iy++) {
//             const y = iy * segment_height - height_half;
//             for (let ix = 0; ix < gridX1; ix++) {
//                 const x = ix * segment_width - width_half;
//                 this.vertices.set([x + this.position[0], -y + this.position[1], 0 + this.position[2]], vertexIdx);
//                 vertexIdx += 3;
//             }
//         }

//         // Create index buffer for triangle strip with degenerate vertices between rows
//         const indices = [];
//         for (let iy = 0; iy < gridY; iy++) {
//             for (let ix = 0; ix < gridX1; ix++) {
//                 indices.push(iy * gridX1 + ix);         // Top vertex of the quad
//                 indices.push((iy + 1) * gridX1 + ix);   // Bottom vertex of the quad
//             }

//             // Insert degenerate vertices at the end of the row, except for the last row
//             if (iy < gridY - 1) {
//                 indices.push((iy + 1) * gridX1 + gridX1 - 1);  // Repeat last vertex of the row
//                 indices.push((iy + 1) * gridX1);               // First vertex of the next row
//             }
//         }

//         this.numIndices = indices.length;

//         // Create the vertex buffer
//         this.vertexBuffer = this.device.createBuffer({
//             label: 'plane-vertex-buffer',
//             size: this.vertices.byteLength,
//             usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//         });
//         this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);

//         // Create the index buffer
//         this.indexBuffer = this.device.createBuffer({
//             label: 'plane-index-buffer',
//             size: indices.length * 4,
//             usage: GPUBufferUsage.INDEX,
//             mappedAtCreation: true
//         });
//         new Uint32Array(this.indexBuffer.getMappedRange()).set(indices);
//         this.indexBuffer.unmap();
//     }

//     private async createPipeline(): Promise<void> {
//         const vertexShaderCode = `
//             struct Uniforms {
//                 viewMatrix: mat4x4<f32>,
//                 projectionMatrix: mat4x4<f32>,
//                 modelMatrix: mat4x4<f32>,
//             };

//             struct VertexOutput {
//                 @builtin(position) position: vec4<f32>,
//                 @location(0) zValue: f32,
//             };

//             @group(0) @binding(0) var<uniform> uniforms: Uniforms;

//             @vertex
//             fn vs_main(@location(0) position: vec3<f32>) -> VertexOutput {
//                 var output: VertexOutput;
//                 let worldPosition = uniforms.modelMatrix * vec4<f32>(position.xyz, 1.0);
//                 output.zValue = position.z;
//                 let viewPosition = uniforms.viewMatrix * worldPosition;
//                 let clipPosition = uniforms.projectionMatrix * viewPosition;
//                 output.position = clipPosition;
//                 return output;
//             }`;

//         const fragmentShaderCode = `
//             @fragment
//             fn fs_main() -> @location(0) vec4<f32> {
//                 return vec4<f32>(1.0, 1.0, 1.0, 1.0);
//             }`;

//         this.pipeline = this.device.createRenderPipeline({
//             layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
//             label: "plane-pipeline",
//             vertex: {
//                 module: this.device.createShaderModule({ code: vertexShaderCode, label: "plane-vertex" }),
//                 entryPoint: "vs_main",
//                 buffers: [{
//                     arrayStride: 3 * 4,  // Only position (x, y, z)
//                     attributes: [
//                         { shaderLocation: 0, offset: 0, format: 'float32x3' },
//                     ]
//                 }]
//             },
//             fragment: {
//                 module: this.device.createShaderModule({ code: fragmentShaderCode, label: "plane-fragment" }),
//                 entryPoint: "fs_main",
//                 targets: [{ format: 'bgra8unorm' }]
//             },
//             primitive: { topology: 'line-list'},
//             depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
//         });
//     }

//     private createZRangeBuffer(): void {
//         this.zRangeBuffer = this.device.createBuffer({
//             label: 'Z Range Buffer',
//             size: 8,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
//         });
//         this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
//     }

//     applyElevationData(demData: Float32Array): void {
//         let minZ = Number.POSITIVE_INFINITY;
//         let maxZ = Number.NEGATIVE_INFINITY;
    
//         for (let i = 0; i < demData.length; i++) {
//             const zValue = demData[i] / 100;
    
//             this.vertices[i * 3 + 2] = zValue; 
//             minZ = Math.min(minZ, zValue);
//             maxZ = Math.max(maxZ, zValue);
//         }
    
//         // Update the min and max Z values after loop
//         this.minZ = minZ;
//         this.maxZ = maxZ;
//         console.log("minZ:", this.minZ);
//         console.log("maxZ:", this.maxZ);
    
//         // Update zRangeBuffer with new minZ and maxZ values
//         this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
    
//         // Re-upload the updated vertices to the vertex buffer
//         this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
//     }
    

//     draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
//         if (!this.bindGroup) {
//             this.bindGroup = this.device.createBindGroup({
//                 layout: this.bindGroupLayout,
//                 entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
//             });
//         }
//         this.device.queue.writeBuffer(this.uniformBuffer, 0, camera.viewMatrix.buffer, camera.viewMatrix.byteOffset, camera.viewMatrix.byteLength);
//         this.device.queue.writeBuffer(this.uniformBuffer, 64, camera.projectionMatrix.buffer, camera.projectionMatrix.byteOffset, camera.projectionMatrix.byteLength);
//         this.device.queue.writeBuffer(this.uniformBuffer, 128, this.modelMatrix.buffer, this.modelMatrix.byteOffset, this.modelMatrix.byteLength);

//         passEncoder.setPipeline(this.pipeline);
//         passEncoder.setVertexBuffer(0, this.vertexBuffer);
//         passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
//         passEncoder.setBindGroup(0, this.bindGroup);
//         passEncoder.drawIndexed(this.numIndices);
//     }
// }


import { Camera } from 'engine/camera/camera';
import { mat4, vec3 } from 'wgpu-matrix';

export class Plane {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;

    private vertices!: Float32Array;
    private position: Float32Array;
    private numIndices!: number;

    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private bindGroupLayout!: GPUBindGroupLayout;
    private elevationData!: Float32Array;
    
    private zRangeBuffer!: GPUBuffer;
    private minZ: number = 0;
    private maxZ: number = 0;

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

    rotate(axis: [number, number, number], angle: number): void {
        const axisVec = new Float32Array(axis);
        mat4.axisRotate(this.modelMatrix, vec3.fromValues(axisVec[0], axisVec[1], axisVec[2]), angle, this.modelMatrix);
        this.updateUniformBuffer();
    }

    private updateUniformBuffer() {
        this.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            this.modelMatrix.buffer,
            this.modelMatrix.byteOffset,
            this.modelMatrix.byteLength
        );
    }

    private initializeBindGroupLayout(): void {
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: 192 } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize:8 } },
            ]
        });
    }

    private createUniformBuffer(): void {
        this.uniformBuffer = this.device.createBuffer({
            label: 'plane-uniform-buffer',
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.zRangeBuffer = this.device.createBuffer({
            label: 'Z Range Buffer',
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
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

        // Create vertex array with only position (x, y, z)
        this.vertices = new Float32Array(gridX1 * gridY1 * 3);
        let vertexIdx = 0;

        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segment_height - height_half;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segment_width - width_half;
                this.vertices.set([x + this.position[0], -y + this.position[1], 0 + this.position[2]], vertexIdx);
                vertexIdx += 3;
            }
        }

        // Create index buffer for triangle strip with degenerate vertices between rows
        const indices = [];
        for (let iy = 0; iy < gridY; iy++) {
            // First row: left to right
            for (let ix = 0; ix < gridX1; ix++) {
                indices.push(iy * gridX1 + ix);
                indices.push((iy + 1) * gridX1 + ix);
            }
        
            // Add degenerate vertices to avoid unwanted connections
            if (iy < gridY - 1) {
                indices.push((iy + 1) * gridX1 + gridX1 - 1);
                indices.push((iy + 1) * gridX1); // Move to start of next row
            }
        }
        
        this.numIndices = indices.length;

        // Create the vertex buffer
        this.vertexBuffer = this.device.createBuffer({
            label: 'plane-vertex-buffer',
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
        
        console.log("vertices:", this.vertices.length/3 );
        // Create the index buffer
        this.indexBuffer = this.device.createBuffer({
            label: 'plane-index-buffer',
            size: indices.length * 4,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint32Array(this.indexBuffer.getMappedRange()).set(indices);
        this.indexBuffer.unmap();
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
                @location(1) zValue: f32,
            };

            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            @vertex
            fn vs_main(@location(0) position: vec3<f32>) -> VertexOutput {
                var output: VertexOutput;
                let worldPosition = uniforms.modelMatrix * vec4<f32>(position, 1.0);
                output.zValue = position.z;
                let viewPosition = uniforms.viewMatrix * worldPosition;
                output.position = uniforms.projectionMatrix * viewPosition;
                return output;
            }`;

            const fragmentShaderCode = `
            @group(0) @binding(1) var<uniform> zRange: vec2<f32>;
        
            fn interpolateColor(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
                return mix(a, b, t);
            }
            @fragment
            fn fs_main(@location(1) zValue: f32) -> @location(0) vec4<f32> {
                let t = clamp((zValue - zRange.x) / (zRange.y - zRange.x), 0.0, 1.0);

                if (t == 0) { discard; }
                //if (t<=0.1) { return vec4<f32>(0.2, 0.2, 0.2, 1.0); }
                //if (t >= 0.96) { return vec4<f32>(0.0, 1.0, 1.0, 1.0); }

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
            }`;
        

        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            label: "plane-pipeline",
            vertex: {
                module: this.device.createShaderModule({ code: vertexShaderCode, label: "plane-vertex" }),
                entryPoint: "vs_main",
                buffers: [{
                    arrayStride: 3 * 4,  // Only position (x, y, z)
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    ]
                }]
            },
            fragment: {
                module: this.device.createShaderModule({ code: fragmentShaderCode, label: "plane-fragment" }),
                entryPoint: "fs_main",
                targets: [{ format: 'bgra8unorm' }]
            },
            primitive: { topology: 'point-list'},
            //primitive: { topology: 'triangle-strip', stripIndexFormat: 'uint32' },
            depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
        });
    }

    loadElevationData(demData: Float32Array): void {
        this.elevationData = demData;
        let minElevation = 0;
        let maxElevation = Number.NEGATIVE_INFINITY;
        
        // Update z values and calculate max elevation (min set to 0)
        this.elevationData.forEach((elevation: number, i: number) => {
            let clampedElevation = Math.max(elevation, 0);
            const zValue = clampedElevation / 10000;
            this.vertices[i * 3 + 2] = zValue;
            minElevation = Math.min(minElevation, zValue);
            maxElevation = Math.max(maxElevation, zValue);
        });

        this.minZ = minElevation;
        this.maxZ = maxElevation;
        
        console.log("minZ:", minElevation, "maxZ:", maxElevation);
        
        // Write zRange to GPU buffer
        this.device.queue.writeBuffer(this.zRangeBuffer, 0, new Float32Array([this.minZ, this.maxZ]));
        // Update vertex buffer with new elevations
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);

        // Update GUI with min and max elevation values
        const minElevationElement = document.getElementById("min-elevation");
        const maxElevationElement = document.getElementById("max-elevation");

        if (minElevationElement && maxElevationElement) {
            minElevationElement.textContent = minElevation.toFixed(2);
            const z = maxElevation * 10000;
            maxElevationElement.textContent = z.toFixed(2);
        }
    }


    draw(passEncoder: GPURenderPassEncoder, camera: Camera): void {
        if (!this.bindGroup) {
            this.bindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.zRangeBuffer } }
                ],
            });
        }
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
