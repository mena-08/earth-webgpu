import { createSampler, loadTexture, setupHLSVideoTexture } from "./texture-loader";

export class TextureManager {
    private device: GPUDevice;
    private textures: GPUTexture[] = [];
    private samplers: GPUSampler[] = [];

    constructor(device: GPUDevice) {
        this.device = device;
    }

    async loadTexture(url: string, isVideo: boolean = false): Promise<void> {
        let texture, sampler;
        if (isVideo && url.endsWith('.m3u8')) {
            ({ texture, sampler } = await setupHLSVideoTexture(this.device, url));
        } else {
            texture = await loadTexture(this.device, url);
            sampler = createSampler(this.device, 'static');
        }
        console.log("Texture loaded: ", texture);
        console.log("Sampler created: ", sampler);
        this.textures.push(texture);
        this.samplers.push(sampler);
    }

    getTexture(index: number): { texture: GPUTexture, sampler: GPUSampler } {
        console.log("Getting texture: ", this.textures[index]);
        console.log("Getting sampler: ", this.samplers[index]);

        if (index < 0 || index >= this.textures.length) {
            console.error("Texture index out of bounds. Returning default texture.");
            // Return a default texture or handle the error appropriately
            return { texture: this.textures[0], sampler: this.samplers[0] }; // Make sure you have a default texture loaded as the first texture
        }
        return { texture: this.textures[index], sampler: this.samplers[index] };
    }
    

    getTexturesCount(): number {
        return this.textures.length;
    }
}
