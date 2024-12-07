import { test } from "main";
export class ContextManager {
    private context: Array<{ role: string, content: string }> = [];
    private dataset: any = {};
    private coordinates: string = '';
    private prompt_engineering!: string;
    private lastDatasetId: string | null = null; 

    constructor() {
        //LAST WORKING PROMPT
        this.prompt_engineering = "You are an interactive 3D Earth visualization assistant. Provide information and display animations from the current dataset. Reply in 35 words or less, separating paragraphs naturally with dots. Only apologize if corrected.\
        Check for correctness when interpreting prompts, ignore typos, and complete information based on context. Omit mentioning inability to do things. Share only relevant context to the last prompt, no need to repeat titles or specific terms frequently. Use the metric system without abbreviations. Be friendly and concise, focusing on answering what is asked.\
	    This is are your current coordinates. Just in case the user asks something related to what region or specific place is seeing:";
        this.setInitialSystemContext(this.prompt_engineering);

        //TEST PROMPT
        //this.prompt_engineering = ' "red": "fastest-moving air, highest wind speeds",\
        //                            "orange": "fast-moving air, slightly less intense than red",\
        //                            "yellow": "relatively fast-moving air, slower than red and orange"'
        //this.setInitialSystemContext(this.prompt_engineering);                                

        //we want a default value for the first datasetq
        this.setDatasetFromString('https://mena-08.github.io/conversational-website/assets/atmosphere/nccs_winds/nccs_winds.txt');
        //THIS ONE IS FOT DEPLOYMENT
        //this.setDatasetFromString('https://mena-08.github.io/conversational-website/assets/ocean/sea_surface_temperature/sea_surface_temperature.txt');
            
        //this is only for local testing
        //this.setDatasetFromString('http://localhost:3000/ocean/turtles/loggerhead_sea_turtles_track.txt');
    }

    setInitialUserContext(content: string): void {
        this.addText('user', content);
    }

    setInitialSystemContext(content: string): void {
        this.addText('system', content);
    }

    updateUserContext(content: string): void {
        this.addText('user', content);
    }

    updateSystemContext(content: string): void {
        this.addText('system', content);
    }

    addText(role: string, content: string): void {
        this.context.push({ role, content });
    }

    updateSystemContextWithCoordinates(): void {
        // Find the existing system context entry for coordinates
        const coordinateIndex = this.context.findIndex(entry => entry.content.includes("Coordinates:"));
        
        const systemContentWithoutCoordinates = this.prompt_engineering;
        const updatedSystemContent = `${systemContentWithoutCoordinates} Coordinates: ${this.coordinates}`;

        if (coordinateIndex !== -1) {
            // Update existing coordinates entry
            this.context[coordinateIndex].content = updatedSystemContent;
        } else {
            // Add new coordinates entry if none exists
            this.addText('system', updatedSystemContent);
        }
    }

    setCoordinates(lat: number, lon: number): void {
        this.coordinates = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`;
        this.updateSystemContextWithCoordinates();
    }

    async setDatasetFromString(url: string): Promise<void> {
        console.log("Fetching dataset from:", url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonString = await response.text();
            console.log("Raw JSON string fetched:", jsonString);
    
            try {
                this.dataset = JSON.parse(jsonString);
                console.log("Parsed dataset successfully:", this.dataset);
                this.updateContextWithDataset();
            } catch (error) {
                console.error("Failed to parse JSON:", error);
            }
        } catch (error) {
            console.error("Error fetching or parsing dataset:", error);
        }
    }
    

    updateContextWithDataset(): void {
        const datasetId = this.dataset.id || null;

        // Avoid updating if the dataset has not changed
        if (datasetId && datasetId === this.lastDatasetId) {
            console.log("Dataset is the same as the last one, skipping update.");
            return;
        }

        // Update the last dataset ID
        this.lastDatasetId = datasetId;

        // Clear previous dataset entry
        this.context = this.context.filter(entry => !entry.content.startsWith("Current Dataset:"));

        // Generate the new dataset summary
        const datasetEntries = Object.entries(this.dataset)
            .map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return `${key}: ${JSON.stringify(value, null, 2)}`;
                }
                return `${key}: ${value}`;
            })
            .join(". ");
        const datasetSummary = `Current Dataset: ${datasetEntries}`;
        console.log("Generated dataset summary:", datasetSummary);

        // Add the new dataset summary to the context
        this.addText('system', datasetSummary);
        console.log("Updated context:", this.context);
    }
    

    getFullConversation(): string[] {
        return this.context.map(entry => {
            const cleanedContent = entry.content.replace(/\n/g, ' ');
            return `${entry.role}: ${cleanedContent}`;
        });
    }
    
    

    resetConversation(): void {
        this.context = [];
        this.dataset = {};
    }

    getDataset(): any {
        return this.dataset;
    }

    getDatasetTitle(): string {
        return this.dataset.title || "No Title";
    }
}
