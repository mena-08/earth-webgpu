import Hls from 'hls.js';

export async function loadTexture(device: GPUDevice, imageUrl: string): Promise<GPUTexture> {
    const img = new Image();
    img.src = imageUrl;
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

// export async function setupHLSVideoTexture(device:GPUDevice, videoUrl:string) {
//     const video = document.createElement('video');
//     video.crossOrigin = "anonymous";
//     video.autoplay = true;
//     video.muted = true;
//     video.loop = true;

//     if (video.canPlayType('application/vnd.apple.mpegurl') === '') {
//         const hls = new Hls();
//         hls.loadSource(videoUrl);
//         hls.attachMedia(video);
//     } else {
//         video.src = videoUrl;
//     }

//     await new Promise((resolve) => video.onloadedmetadata = resolve);

//     const canvas = document.createElement('canvas');
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const texture = device.createTexture({
//         size: { width: video.videoWidth, height: video.videoHeight, depthOrArrayLayers: 1 },
//         format: 'rgba8unorm',
//         usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
//     });

//     const sampler = createSampler(device);

//     function updateTexture() {
//         const ctx = canvas.getContext('2d', { willReadFrequently: true });
//         ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
//         const imageData = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);

//         device.queue.writeTexture(
//             { texture: texture },
//             imageData.data,
//             { bytesPerRow: 4 * video.videoWidth },
//             { width: video.videoWidth, height: video.videoHeight, depthOrArrayLayers: 1 }
//         );

//         requestAnimationFrame(updateTexture);
//     }

//     video.play().then(() => {
//         updateTexture(); // Start updating texture after the video starts playing
//     });

//     return { texture, sampler };
// }

export async function setupHLSVideoTexture(device: GPUDevice, videoUrl: string) {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    if (Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl') === '') {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        video.src = videoUrl;
    }

    await new Promise((resolve) => video.onloadedmetadata = resolve);

    //create the gpu texture
    const texture = device.createTexture({
        size: { width: video.videoWidth, height: video.videoHeight, depthOrArrayLayers: 1 },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    const sampler = createSampler(device);

    function updateTexture() {

        if (navigator.gpu && 'copyExternalImageToTexture' in device.queue) {
            device.queue.copyExternalImageToTexture(
                { source: video },
                { texture: texture },
                { width: video.videoWidth, height: video.videoHeight }
            );
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageData = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);

            device.queue.writeTexture(
                { texture: texture },
                imageData.data,
                { bytesPerRow: 4 * video.videoWidth },
                { width: video.videoWidth, height: video.videoHeight, depthOrArrayLayers: 1 }
            );
        }
        requestAnimationFrame(updateTexture);
    }

    video.play().then(() => {
        updateTexture();
    });

    return { texture, sampler };
}
