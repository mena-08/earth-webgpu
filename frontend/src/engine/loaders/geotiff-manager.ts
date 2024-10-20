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
        const raster = await elevationData.readRasters({ interleave: true });
        //console.log("Elevation Data:", raster.entries());
        const float32Data = []//new Float32Array(raster.length);
        // for (let i = 0; i < float32Data.length; i++) {
        //     // Convert each int16 value to float; handle no-data values appropriately
        //     if (raster[i] === -32767) { // Assuming -32767 is a no-data value
        //         float32Data[i] = NaN; // or another no-data representation
        //     } else {
        //         //float32Data[i] = raster[i]; // Direct conversion or apply scaling factor if needed
        //     }
        // }

        for (const [index, value] of raster.entries()) {
            if (value === -32767) {  // Handle no-data values appropriately
                float32Data.push(NaN);
            } else {
                float32Data.push(value);  // Convert and store the value
            }
        }
        const data = float32Data.filter((value) => typeof value === 'number' && (!isNaN(value) || value === 0));
        const float32Array = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'number') {
                float32Array[i] = data[i] as number;
            } else {
                throw new Error(`Unexpected data type: ${typeof data[i]}`);
            }
        }
        console.log("Elevation Data:", float32Array);
        const model = new DigitalElevationModel(device, position, float32Array);
        console.log("WAHTS THIS ", model);
        //console.log("Elevation Data:", float32Data);
        return float32Data;
        //console.log("Elevation Data:", int16Data);
        //console.log("Elevation Data Properties:", Object.keys(raster));
        //const model = new DigitalElevationModel(device, position, raster);
        
        //console.log("Elevation Data:", raster);

        // const model = new DigitalElevationModel(device, position, elevationData);
        // model.initialize(); // Ensure initialization is complete before rendering
        // return model;
    } catch (error) {
        console.error("Failed to initialize Digital Elevation Model:", error);
        throw error;
    }
}
