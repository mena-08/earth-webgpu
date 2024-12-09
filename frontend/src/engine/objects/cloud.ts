import { Camera } from "engine/camera/camera";

export class CloudComputeTest {
    private device: GPUDevice;
    private computePipeline!: GPUComputePipeline;
    private densityTexture!: GPUTexture;
    private densityBuffer!: GPUBuffer;
    private resultBuffer!: GPUBuffer;
    private renderBindGroup!: GPUBindGroup;
    private computeBindGroup!: GPUBindGroup;

    //rendering part
    private renderPipeline!: GPURenderPipeline;
    private cubeBuffer!: GPUBuffer;
    private sampler!: GPUSampler; 
    private uniformBuffer!: GPUBuffer;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initializeBuffers();
        this.createComputePipeline();
        this.createRenderPipeline();
        this.createPointBuffer();

        //this.createCubeBuffer();
        this.createSampler();
        this.createRenderBindGroup();
        this.createComputeBindGroup();
    }

    private initializeBuffers(): void {
        // const bufferSize = 256 * 256 * 256 * Float32Array.BYTES_PER_ELEMENT;
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
            // size: { width: 256, height: 256, depthOrArrayLayers: 256 },
            size: { width: 128, height: 128, depthOrArrayLayers: 128 },
            dimension: "3d",
            format: "r32float",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.uniformBuffer = this.device.createBuffer({
            size: 128,
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
    
                    // Add randomness for better cloud distribution
                    points.push(
                        (u * 2 - 1) + Math.random() * 0.3, 
                        (v * 2 - 1) + Math.random() * 0.3, 
                        (w * 2 - 1) + Math.random() * 0.3
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
        fn hash(n: f32) -> f32 {
            return fract(sin(n) * 43758.5453);
        }

        fn noise(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);

    let n = i.x + i.y * 157.0 + i.z * 113.0;
    return mix(
        mix(
            mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 157.0), hash(n + 158.0), f.x),
            f.y),
        mix(
            mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 270.0), hash(n + 271.0), f.x),
            f.y),
        f.z);
}

fn fbm(p: vec3<f32>) -> f32 {
    var total: f32 = 0.0;
    var frequency: f32 = 1.0;
    var amplitude: f32 = 1.0;

    for (var i = 0; i < 6; i = i + 1) {
        total += noise(p * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

fn generateDensity(uvw: vec3<f32>) -> f32 {
    let frequency = 8.0; // Increase frequency for finer details
    let turbulence = fbm(uvw * frequency);
    let heightFalloff = smoothstep(0.1, 0.9, uvw.y); // Adjust height falloff
    return clamp(turbulence * heightFalloff, 0.0, 1.0);
}

fn clouds(uvw: vec3<f32>) -> f32 {
    let baseTurbulence = fbm(uvw * 4.0); // Adjust frequency
    let layeredTurbulence = fbm(uvw * 8.0) * 0.5; // Add layers
    let heightFalloff = smoothstep(0.2, 0.8, uvw.y); // Ensure a smoother vertical gradient
    return clamp(baseTurbulence + layeredTurbulence * heightFalloff, 0.0, 1.0);
}


@group(0) @binding(0) var<storage, read_write> densityBuffer: array<f32>; // Ensure binding to storage buffer


@compute @workgroup_size(8, 4, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = vec3<u32>(8, 8, 8);
    let index = id.x + size.x * (id.y + size.y * id.z);

    if (id.x < size.x && id.y < size.y && id.z < size.z) {
        let uvw = vec3<f32>(id) / vec3<f32>(size) + fbm(vec3<f32>(id) * 0.1);
        let density = generateDensity(uvw);
        densityBuffer[index] = clamp(density * 1.5, 0.0, 1.0);
    }
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

    private createRenderPipeline(): void {
        const vertexShaderCode = `
            struct Uniforms {
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
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
    output.uvw = (input.position + vec3<f32>(1.0)) / 0.8; // Normalize to [0, 1]
    return output;
}`;

        const fragmentShaderCode = `
       @group(0) @binding(1) var densityTexture: texture_3d<f32>;
@group(0) @binding(2) var sampler3D: sampler;

@fragment
fn main(@location(0) uvw: vec3<f32>) -> @location(0) vec4<f32> {
    let rayStart = vec3<f32>(0.0, 0.0, 0.0); // Starting position of the ray
    let rayDir = normalize(vec3<f32>(uvw.x, uvw.y, 1.0)); // Fixed direction along +z
    let steps = 72; // Fixed number of raymarching steps
    let stepSize = 1.0 / f32(steps); // Step size in volume space

    var accumulatedColor = vec3<f32>(0.0);
    var accumulatedAlpha = 0.0;

    // Fixed loop for raymarching
    for (var i = 0; i < steps; i = i + 1) {
        let pos = rayStart + rayDir * f32(i) * stepSize;

        // Sample density from the 3D texture
        let density = textureSample(densityTexture, sampler3D, pos).r;

        // Map density to alpha
        let alpha = clamp(density * 0.5, 0.0, 1.0); 

        // Accumulate color and alpha contributions
        let color = vec3<f32>(1.0); // Static white cloud color
        accumulatedColor += (1.0 - accumulatedAlpha) * color ;
        accumulatedAlpha += (1.0 - accumulatedAlpha) * alpha;
    }

    // Final color output with accumulated alpha
    return vec4<f32>(accumulatedColor, accumulatedAlpha);
}
`;

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
                                { shaderLocation: 0, offset: 0, format: "float32x3", },
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
    private createCubeBuffer(): void {
        const cubeVertices = new Float32Array([
            // Front face
            -1, -1,  1,   1, -1,  1,   1,  1,  1,
            -1, -1,  1,   1,  1,  1,  -1,  1,  1,
            // Back face
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,
            -1, -1, -1,   1,  1, -1,   1, -1, -1,
            // Top face
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,
            -1,  1, -1,   1,  1,  1,   1,  1, -1,
            // Bottom face
            -1, -1, -1,   1, -1, -1,   1, -1,  1,
            -1, -1, -1,   1, -1,  1,  -1, -1,  1,
            // Right face
             1, -1, -1,   1,  1, -1,   1,  1,  1,
             1, -1, -1,   1,  1,  1,   1, -1,  1,
            // Left face
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,
            -1, -1, -1,  -1,  1,  1,  -1,  1, -1,
        ]);
    
        this.cubeBuffer = this.device.createBuffer({
            size: cubeVertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
    
        new Float32Array(this.cubeBuffer.getMappedRange()).set(cubeVertices);
        this.cubeBuffer.unmap();
    }

    private createSampler(): void {
        this.sampler = this.device.createSampler({
            // magFilter: "nearest",
            // minFilter: "nearest",
            // mipmapFilter: "nearest",
        });
    }

    private createRenderBindGroup(): void {
        const bindGroupLayout = this.renderPipeline.getBindGroupLayout(0);
    
        this.renderBindGroup = this.device.createBindGroup({
            label: "cloud-render-bind-group",
            layout: bindGroupLayout,
            entries: [
                {
                  binding: 0,
                  resource: {buffer: this.uniformBuffer},  
                },
                {
                    binding: 1,
                    resource: this.densityTexture.createView({
                        dimension: "3d",
                    }),
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
            ],
        });
    }

    public async compute(): Promise<void> {
        //TEST BUFFER TO TEXTURE, THEN, TEXTURE TO BUFFER
        const textureDebugBuffer = this.device.createBuffer({
            label: "texture-debug-buffer",
            size: 128 * 128 * 128 * Float32Array.BYTES_PER_ELEMENT, // Match texture size
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // Command encoder
        const commandEncoder = this.device.createCommandEncoder();

        // Compute pass
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        
        passEncoder.setBindGroup(0, this.computeBindGroup);
        passEncoder.dispatchWorkgroups(32, 32, 32);
        passEncoder.end();

        //try to copy the buffer to the 3d texture now
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

        //2. Copy the texture to the buffer
        commandEncoder.copyTextureToBuffer(
            {
                texture: this.densityTexture,
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                buffer: textureDebugBuffer,
                bytesPerRow: 128 * Float32Array.BYTES_PER_ELEMENT,
                rowsPerImage: 128,
            },
            {
                width: 128,
                height: 128,
                depthOrArrayLayers: 128,
            }
        );
        

        // Copy the density buffer to the result buffer
        commandEncoder.copyBufferToBuffer(this.densityBuffer, 0, this.resultBuffer, 0, this.densityBuffer.size);

        // Submit the commands
        this.device.queue.submit([commandEncoder.finish()]);


        // Read back the result
        await this.resultBuffer.mapAsync(GPUMapMode.READ);
        await textureDebugBuffer.mapAsync(GPUMapMode.READ);
        const debugData = new Float32Array(textureDebugBuffer.getMappedRange());
        const result = new Float32Array(this.resultBuffer.getMappedRange());
        console.log(this.densityTexture, this.densityBuffer, this.resultBuffer);
        console.log("Computed Densities:", result.slice(0,1000000));
        console.log("TEXTURE VALUES:", debugData.slice(0,100));
        this.resultBuffer.unmap();
    }

    public draw(renderPass: GPURenderPassEncoder, camera:Camera): void {

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

        console.log("DRAWING CLOUDS...");
        renderPass.setPipeline(this.renderPipeline);
        renderPass.setVertexBuffer(0, this.cubeBuffer);
        renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(128*128*128, 1, 0, 0);
    }
}
