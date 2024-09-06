// frontend/src/engine/Sphere.ts
export class Sphere {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private color: Float32Array;
    private position: Float32Array;
    private radius: number = 0.5;
    private numIndices!: number;

    constructor(device: GPUDevice, color: [number, number, number, number], position: [number, number, number], radius: number) {
        this.device = device;
        this.color = new Float32Array(color);
        this.position = new Float32Array(position);
        this.radius = radius;
        this.createVertexBuffer();
        this.createPipeline();
    }

    private createVertexBuffer(): void {
        const segments = 32;
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
                const nx = x;
                const ny = y;
                const nz = z;

                vertices.push(x + this.position[0], y + this.position[1], z + this.position[2], 1.0);
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
            layout:"auto",
            label: "sphere-pipeline",
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
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
        passEncoder.drawIndexed(this.numIndices);
    }
}
