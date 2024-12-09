// 3d density field!!

import { Camera } from "engine/camera/camera";

export class CloudComputeTest {
    private device: GPUDevice;
    private computePipeline!: GPUComputePipeline;
    private densityTexture!: GPUTexture;
    private densityBuffer!: GPUBuffer;
    private resultBuffer!: GPUBuffer;
    private renderBindGroup!: GPUBindGroup;
    private computeBindGroup!: GPUBindGroup;

    //render stuff
    private renderPipeline!: GPURenderPipeline;
    private cubeBuffer!: GPUBuffer;
    private sampler!: GPUSampler; 
    private uniformBuffer!: GPUBuffer;

    private time: number = 0;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initializeBuffers();
        this.createComputePipeline();
        this.createRenderPipeline();
        this.createPointBuffer();
        this.createSampler();
        this.createRenderBindGroup();
        this.createComputeBindGroup();
    }

    private initializeBuffers(): void {
        const bufferSize = 128 * 128 * 128 * Float32Array.BYTES_PER_ELEMENT;
        this.densityBuffer = this.device.createBuffer({
            label: "density-buffer",
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        this.resultBuffer = this.device.createBuffer({
            label: "result-buffer",
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        this.densityTexture = this.device.createTexture({
            label: "density-texture",
            size: { width: 128, height: 128, depthOrArrayLayers: 128 },
            dimension: "3d",
            format: "r32float",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        //uniform buffer size: viewMatrix(64) + projectionMatrix(64) + time(16)
        const uniformBufferSize = 144; 
        this.uniformBuffer = this.device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    private createPointBuffer(): void {
        const gridSize = 128;
        const points = [];
    
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    const u = x / (gridSize - 1);
                    const v = y / (gridSize - 1);
                    const w = z / (gridSize - 1);

                    points.push(
                        (u * 2 - 1) + Math.random() * 0.3, 
                        ((v * 2 - 1) * 1.0)  * 0.3, 
                        (w * 2 - 1) + Math.random() * 0.3, 
                    );
                }
            }
        }
    
        const pointBuffer = new Float32Array(points);
        this.cubeBuffer = this.device.createBuffer({
            size: pointBuffer.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
    
        new Float32Array(this.cubeBuffer.getMappedRange()).set(pointBuffer);
        this.cubeBuffer.unmap();
    }

    private createComputePipeline(): void {
    const computeShaderCode = `
        struct Uniforms {
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
            time: f32,
        };

        @group(0) @binding(0) var<storage, read_write> densityBuffer: array<f32>;
        @group(0) @binding(1) var<uniform> uniforms: Uniforms;

        fn fract(x: f32) -> f32 {
            return x - floor(x);
        }

        fn fract_vec2(x: vec2<f32>) -> vec2<f32> {
            return x - floor(x);
        }

        fn random(st: vec2<f32>) -> f32 {
            return fract(sin(dot(st, vec2<f32>(12.9898,78.233))) * 43758.5453123);
        }

        fn noise(st: vec2<f32>) -> f32 {
            let i = floor(st);
            let f = fract_vec2(st);

            let a = random(i);
            let b = random(i + vec2<f32>(1.0, 0.0));
            let c = random(i + vec2<f32>(0.0, 1.0));
            let d = random(i + vec2<f32>(1.0, 1.0));

            let u = f * f * (3.0 - 2.0 * f);

            return mix(
                mix(a, b, u.x),
                mix(c, d, u.x),
                u.y
            );
        }

        const NUM_OCTAVES = 5;

        fn fbm2D(st: vec2<f32>) -> f32 {
            var v = 0.0;
            var a = 0.5;
            let shift = vec2<f32>(100.0, 100.0);
            let rot = mat2x2<f32>(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

            var pos = st;
            for (var i = 0; i < NUM_OCTAVES; i = i + 1) {
                v += a * noise(pos);
                pos = rot * pos * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }

        @compute @workgroup_size(8, 4, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
            //sizes of the 3d texture
            let size = vec3<u32>(8, 8, 8);

            //tried some postprocessing on the noise function
            let p = vec3<f32>(f32(id.x)/f32(size.x), f32(id.y)/f32(size.y), f32(id.z)/f32(size.z));
            let center = vec3<f32>(0.0, 0.0, 0.0);
            let radius = 0.4;
            let dist = distance(p, center);
            if (id.x < size.x && id.y < size.y && id.z < size.z) {
                let index = id.x + size.x * (id.y + size.y * id.z);

                //id to uvw
                let uv = vec2<f32>(f32(id.x)/f32(size.x), f32(id.y)/f32(size.y));
                let w = f32(id.z) / f32(size.z);

                let scaledUV = uv * 3.0;

                //this won't work, looks like palpitationg noise
                let offset = vec2<f32>(0.5 * w, 0.2 * w);
                let timeOffset = vec2<f32>(uniforms.time * 0.1, 0.0);

                var density = fbm2D(scaledUV + offset + timeOffset);
                if(dist>radius) {
                    density = 0.0;
                }

                densityBuffer[index] = clamp(density, 0.0, 1.0);
            }
        }`;

        this.computePipeline = this.device.createComputePipeline({
            label: "cloud-compute-pipeline",
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({ code: computeShaderCode }),
                entryPoint: "main",
            },
        });
    }

    private createRenderPipeline(): void {
        const vertexShaderCode = `
        struct Uniforms {
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
            time: f32,
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        struct VertexInput {
            @location(0) position: vec3<f32>
        };

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) uvw: vec3<f32>
        };

        @vertex
        fn main(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let worldPosition = vec4<f32>(input.position, 1.0);
            let viewPosition = uniforms.viewMatrix * worldPosition;
            let clipPosition = uniforms.projectionMatrix * viewPosition;

            output.position = clipPosition;
            output.uvw = (input.position + vec3<f32>(1.0)) / 0.8;
            return output;
        }`;

        const fragmentShaderCode = `
        struct Uniforms {
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
            time: f32,
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var densityTexture: texture_3d<f32>;
        @group(0) @binding(2) var sampler3D: sampler;

        //ray marrching goes brrrr

        @fragment
        fn main(@location(0) uvw: vec3<f32>) -> @location(0) vec4<f32> {
            let rayStart = vec3<f32>(0.0, 0.0, 0.0); 
            let rayDir = normalize(vec3<f32>(uvw.x, uvw.y, 1.0)); 
            let steps = 72;
            let stepSize = 1.0 / f32(steps);

            var accumulatedColor = vec3<f32>(0.0);
            var accumulatedAlpha = 0.0;

            for (var i = 0; i < steps; i = i + 1) {
                let pos = rayStart + rayDir * f32(i) * stepSize;
                let density = textureSample(densityTexture, sampler3D, pos).r;
                // if (density < 0.9) {
                //     discard;
                // }
                let alpha = clamp(density * 0.5, 0.0, 1.0);
                let color = vec3<f32>(1.0);
                accumulatedColor += (0.5 - accumulatedAlpha) * color;
                accumulatedAlpha += (1.0 - accumulatedAlpha) * alpha;
            }

            return vec4<f32>(accumulatedColor, accumulatedAlpha);
        }`;

        this.renderPipeline = this.device.createRenderPipeline({
            label: "cloud-render-pipeline",
            layout: "auto",
            vertex: {
                module: this.device.createShaderModule({ code: vertexShaderCode }),
                entryPoint: "main",
                buffers: [
                    {
                        arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x3" },
                        ],
                    },
                ],
            },
            fragment: {
                module: this.device.createShaderModule({ code: fragmentShaderCode }),
                entryPoint: "main",
                targets: [
                    {
                        format: "bgra8unorm",
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            },
                            alpha: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            },
                        },
                    },
                ],
            },
            primitive: {
                topology: "point-list",
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'always',
                format: 'depth24plus',
            }
        });
    }

    private createSampler(): void {
        this.sampler = this.device.createSampler({});
    }

    private createRenderBindGroup(): void {
        const bindGroupLayout = this.renderPipeline.getBindGroupLayout(0);
        this.renderBindGroup = this.device.createBindGroup({
            label: "cloud-render-bind-group",
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer },  
                },
                {
                    binding: 1,
                    resource: this.densityTexture.createView({ dimension: "3d" }),
                },
                {
                    binding: 2,
                    resource: this.sampler,
                },
            ],
        });
    }

    private createComputeBindGroup(): void {
        const bindGroupLayout = this.computePipeline.getBindGroupLayout(0);
        this.computeBindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            label: "cloud-compute-bind-group",
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.densityBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this.uniformBuffer },
                },
            ],
        });
    }

    public async compute(): Promise<void> {
        //time uniform buffer
        const timeBuffer = new Float32Array([this.time]);
        this.device.queue.writeBuffer(this.uniformBuffer, 128, timeBuffer);

        const textureDebugBuffer = this.device.createBuffer({
            label: "texture-debug-buffer",
            size: 128 * 128 * 128 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = this.device.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.computeBindGroup);
        passEncoder.dispatchWorkgroups(32, 32, 32);
        passEncoder.end();

        const bytesPerRow = 128 * Float32Array.BYTES_PER_ELEMENT;
        const rowsPerImage = 128;
        commandEncoder.copyBufferToTexture(
            {
                buffer: this.densityBuffer,
                bytesPerRow: bytesPerRow,
                rowsPerImage: rowsPerImage,
            },
            {
                texture: this.densityTexture,
            },
            {
                width: 128,
                height: 128,
                depthOrArrayLayers: 128,
            }
        );

        commandEncoder.copyTextureToBuffer(
            {
                texture: this.densityTexture,
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                buffer: textureDebugBuffer,
                bytesPerRow: bytesPerRow,
                rowsPerImage: rowsPerImage,
            },
            {
                width: 128,
                height: 128,
                depthOrArrayLayers: 128,
            }
        );

        commandEncoder.copyBufferToBuffer(this.densityBuffer, 0, this.resultBuffer, 0, this.densityBuffer.size);

        this.device.queue.submit([commandEncoder.finish()]);
    }

    public draw(renderPass: GPURenderPassEncoder, camera: Camera): void {
        //increment time before draw call
        this.time += 1.0;
        const timeBuffer = new Float32Array([this.time]);
        this.device.queue.writeBuffer(this.uniformBuffer, 128, timeBuffer);

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

        //compute pass
        this.compute();

        console.log("current time: ", this.time);
        console.log("DRAWING CLOUDS...");

        renderPass.setPipeline(this.renderPipeline);
        renderPass.setVertexBuffer(0, this.cubeBuffer);
        renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(128 * 128 * 128, 1, 0, 0);
    }
}

////------------------------------------------------------------------------------------------------------------
// 2D CLOUDS!!
// import { Camera } from "engine/camera/camera";

// export class CloudComputeTest {
//     private device: GPUDevice;
//     private uniformBuffer!: GPUBuffer;
//     private renderPipeline!: GPURenderPipeline;
//     private sampler!: GPUSampler;
//     private renderBindGroup!: GPUBindGroup;
//     private quadBuffer!: GPUBuffer;
//     private time: number = 0;

//     constructor(device: GPUDevice) {
//         this.device = device;
//         this.initializeUniformBuffer();
//         this.createFullscreenQuad();
//         this.createSampler();
//         this.createRenderPipeline();
//         this.createRenderBindGroup();
//     }

//     private initializeUniformBuffer(): void {
//         //uniform layout: 
//         //viewMatrix (64 bytes)
//         //projectionMatrix (64 bytes)
//         //time (4 bytes, padded to 16)
//         // total- 144 bytes
//         const uniformBufferSize = 144; 
//         this.uniformBuffer = this.device.createBuffer({
//             size: uniformBufferSize,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
//         });
//     }

//     private createFullscreenQuad(): void {
//         const vertices = new Float32Array([
//             // positions
//             -1.0, -1.0, 
//              1.0, -1.0,
//             -1.0,  1.0,

//             -1.0,  1.0,
//              1.0, -1.0,
//              1.0,  1.0,
//         ]);

//         this.quadBuffer = this.device.createBuffer({
//             size: vertices.byteLength,
//             usage: GPUBufferUsage.VERTEX,
//             mappedAtCreation: true,
//         });

//         new Float32Array(this.quadBuffer.getMappedRange()).set(vertices);
//         this.quadBuffer.unmap();
//     }

//     private createSampler(): void {
//         this.sampler = this.device.createSampler({});
//     }

//     private createRenderPipeline(): void {
//         const vertexShaderCode = `
//         struct Uniforms {
//             viewMatrix: mat4x4<f32>,
//             projectionMatrix: mat4x4<f32>,
//             time: f32,
//         };

//         @group(0) @binding(0) var<uniform> uniforms: Uniforms;

//         struct VertexOutput {
//             @builtin(position) position: vec4<f32>,
//         };

//         @vertex
//         fn main(@location(0) position: vec2<f32>) -> VertexOutput {
//             var output: VertexOutput;
//             output.position = vec4<f32>(position, 0.0, 1.0);
//             return output;
//         }`;

//         const fragmentShaderCode = `
//         struct Uniforms {
//             viewMatrix: mat4x4<f32>,
//             projectionMatrix: mat4x4<f32>,
//             time: f32,
//         };

//         @group(0) @binding(0) var<uniform> uniforms: Uniforms;

//         fn fract(x: f32) -> f32 {
//             return x - floor(x);
//         }

//         fn fract_vec2(x: vec2<f32>) -> vec2<f32> {
//             return vec2<f32>(fract(x.x), fract(x.y));
//         }

//         fn random(st: vec2<f32>) -> f32 {
//             return fract(sin(dot(st, vec2<f32>(12.9898,78.233))) * 43758.5453123);
//         }

//         fn noise(st: vec2<f32>) -> f32 {
//             let i = floor(st);
//             let f = fract_vec2(st);

//             let a = random(i);
//             let b = random(i + vec2<f32>(1.0, 0.0));
//             let c = random(i + vec2<f32>(0.0, 1.0));
//             let d = random(i + vec2<f32>(1.0, 1.0));

//             let u = f * f * (3.0 - 2.0 * f);

//             return mix(
//                 mix(a, b, u.x),
//                 mix(c, d, u.x),
//                 u.y
//             );
//         }

//         const NUM_OCTAVES: i32 = 5;

//         fn fbm(st: vec2<f32>) -> f32 {
//             var v: f32 = 0.0;
//             var a: f32 = 0.5;
//             var shift: vec2<f32> = vec2<f32>(100.0, 100.0);
//             let rot: mat2x2<f32> = mat2x2<f32>(
//                 vec2<f32>(cos(0.5), sin(0.5)),
//                 vec2<f32>(-sin(0.5), cos(0.5))
//             );

//             var newSt = st;
//             for (var i = 0; i < NUM_OCTAVES; i = i + 1) {
//                 v += a * noise(newSt);
//                 newSt = rot * (newSt * 2.0) + shift;
//                 a *= 0.5;
//             }
//             return v;
//         }

//         @fragment
//         fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
//             let LOD = vec2<f32>(1000.0, 500.0);

//             let st = (fragCoord.xy / LOD) * 3.0;
//             let u_time = uniforms.time;

//             let q = vec2<f32>(
//                 fbm(st + 0.00 * u_time),
//                 fbm(st + vec2<f32>(1.0, 0.0))
//             );

//             let r = vec2<f32>(
//                 fbm(st + q + vec2<f32>(1.7,9.2) + 0.15*u_time),
//                 fbm(st + q + vec2<f32>(8.3,2.8) + 0.126*u_time)
//             );

//             let f = fbm(st + r);

//             // Define purple and yellow
//             let purple = vec3<f32>(0.5, 0.0, 0.5);
//             let yellow = vec3<f32>(1.0, 1.0, 0.0);

//             //color mixing stuff
//             var color = mix(purple, yellow, clamp((f*f)*4.0, 0.0, 1.0));
//             color = mix(color, purple, clamp(length(q), 0.0, 1.0));
//             color = mix(color, yellow, clamp(r.x, 0.0, 1.0));

//             let finalColor = (f*f*f + 0.6*f*f + 0.5*f)*color;
//             return vec4<f32>(finalColor, 1.0);
//         }`;

//         this.renderPipeline = this.device.createRenderPipeline({
//             label: "fbm-render-pipeline",
//             layout: "auto",
//             vertex: {
//                 module: this.device.createShaderModule({ code: vertexShaderCode }),
//                 entryPoint: "main",
//                 buffers: [
//                     {
//                         arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
//                         attributes: [
//                             { shaderLocation: 0, offset: 0, format: "float32x2" },
//                         ],
//                     },
//                 ],
//             },
//             fragment: {
//                 module: this.device.createShaderModule({ code: fragmentShaderCode }),
//                 entryPoint: "main",
//                 targets: [
//                     {
//                         format: "bgra8unorm",
//                         blend: {
//                             color: {
//                                 srcFactor: "src-alpha",
//                                 dstFactor: "one-minus-src-alpha",
//                                 operation: "add",
//                             },
//                             alpha: {
//                                 srcFactor: "one",
//                                 dstFactor: "one-minus-src-alpha",
//                                 operation: "add",
//                             },
//                         },
//                     },
//                 ],
//             },
//             primitive: {
//                 topology: "triangle-list",
//             },
//             depthStencil: {
//                 depthWriteEnabled: true,
//                 depthCompare: 'always',
//                 format: 'depth24plus',
//             }
//         });
//     }

//     private createRenderBindGroup(): void {
//         //only one uniform
//         const bindGroupLayout = this.renderPipeline.getBindGroupLayout(0);
//         this.renderBindGroup = this.device.createBindGroup({
//             label: "fbm-render-bind-group",
//             layout: bindGroupLayout,
//             entries: [
//                 {
//                     binding: 0,
//                     resource: { buffer: this.uniformBuffer },  
//                 },
//             ],
//         });
//     }

//     public draw(renderPass: GPURenderPassEncoder, camera: Camera): void {
//         this.time += 0.01;
//         const timeBuffer = new Float32Array([this.time]);
//         this.device.queue.writeBuffer(this.uniformBuffer, 128, timeBuffer);

//         this.device.queue.writeBuffer(
//             this.uniformBuffer,
//             0,
//             camera.viewMatrix.buffer,
//             camera.viewMatrix.byteOffset,
//             camera.viewMatrix.byteLength
//         );
//         this.device.queue.writeBuffer(
//             this.uniformBuffer,
//             64,
//             camera.projectionMatrix.buffer,
//             camera.projectionMatrix.byteOffset,
//             camera.projectionMatrix.byteLength
//         );

//         // Set pipeline and bind group
//         renderPass.setPipeline(this.renderPipeline);
//         renderPass.setVertexBuffer(0, this.quadBuffer);
//         renderPass.setBindGroup(0, this.renderBindGroup);

//         //draw quad
//         renderPass.draw(6, 1, 0, 0);
//     }
// }

/////------------------------------------------------------------------------------------------------------------
