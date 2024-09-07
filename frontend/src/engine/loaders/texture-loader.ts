export async function loadTexture(device: GPUDevice, url: string): Promise<GPUTexture> {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const texture = device.createTexture({
        size: [img.width, img.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.writeTexture(
        { texture: texture },
        imageData.data,
        { bytesPerRow: 4 * img.width, rowsPerImage: img.height },
        { width: img.width, height: img.height, depthOrArrayLayers: 1 }
    );

    return texture;
}

export function createSampler(device: GPUDevice): GPUSampler {
    return device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
    });
}
