import { fromArrayBuffer, GeoTIFFImage } from 'geotiff';
import { DigitalElevationModel } from 'engine/objects/dem';

async function fetchGeoTIFF(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.arrayBuffer();
  }

async function parseGeoTIFF(arrayBuffer: ArrayBuffer): Promise<GeoTIFFImage> {
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage(); // Get the first image
  return image;
}

export async function initDigitalElevationModel(device: GPUDevice, position: [number, number, number], url: string) {
    try {
        const arrayBuffer = await fetchGeoTIFF(url);
        const elevationData = await parseGeoTIFF(arrayBuffer);

        return [elevationData.getWidth(), elevationData.getHeight(), elevationData];
    } catch (error) {
        console.error("Failed to initialize Digital Elevation Model:", error);
        throw error;
    }
}
