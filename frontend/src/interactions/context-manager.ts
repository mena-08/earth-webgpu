// export class ContextManager {
//     private context: Array<{ role: string, content: string }> = [];
//     private dataset: any = {};
//     private coordinates: string = '';
//     private prompt_engineering!: string;

//     constructor() {
//         this.prompt_engineering = "You are an interactive 3D Earth visualization assistant. Provide information and display animations from the current dataset. Reply in 35 words or less, separating paragraphs naturally with dots. Only apologize if corrected.\
// 	Check for correctness when interpreting prompts, ignore typos, and complete information based on context. Omit mentioning inability to do things. Share only relevant context to the last prompt, no need to repeat titles or specific terms frequently. Use the metric system without abbreviations. Be friendly and concise, focusing on answering what is asked.\
// 	You have the following datasets: Loggerhead Sea Turtles Track from NOAA. This is are your current coordinates. Just in case the user asks something related to what region or specific place is seeing:"
//     // this.prompt_engineering = "You are an interactive 3D Earth visualization assistant. Provide information and display animations from the current dataset. Reply in 35 words or less, separating paragraphs naturally with dots. Only apologize if corrected.\
// 	// Check for correctness when interpreting prompts, ignore typos, and complete information based on context. Omit mentioning inability to do things. Share only relevant context to the last prompt, no need to repeat titles or specific terms frequently. Use the metric system without abbreviations. Be friendly and concise, focusing on answering what is asked.\
// 	// You have the following datasets: Loggerhead Sea Turtles Track, Phytoplankton model, Sea Surface Temperature NOAA."
//         this.setInitialSystemContext(this.prompt_engineering);
//         //THIS ONE IS FOT DEPLOYMENT
//         this.setDatasetFromString('https://mena-08.github.io/conversational-website/assets/ocean/sea_surface_temperature/sea_surface_temperature.txt');
       
//         //this is only for local testing
//         //this.setDatasetFromString('http://localhost:3000/ocean/turtles/loggerhead_sea_turtles_track.txt');

//     }

//     setInitialUserContext(content: string): void {
//         this.addText('user', content);
//     }

//     setInitialSystemContext(content: string): void {
//         this.addText('system', content);
//     }

//     updateUserContext(content: string): void {
//         this.addText('user', content);
//     }

//     updateSystemContext(content: string): void {
//         this.addText('system', content);
//     }

//     addText(role: string, content: string): void {
//         this.context.push({ role, content });
//     }

//     updateSystemContextWithCoordinates(): void {
//         // Find the existing system context (if any)
//         const systemContext = this.context.find(entry => entry.role === 'system');
    
//         // Get the current system context content without coordinates
//         const systemContentWithoutCoordinates = systemContext ? systemContext.content.replace(/Coordinates:.*$/, '').trim() : '';
    
//         // Create the new system context with updated coordinates
//         const updatedSystemContent = `${systemContentWithoutCoordinates}\nCoordinates: ${this.coordinates}`;
    
//         // Update the system context
//         this.updateSystemContext(updatedSystemContent);
//     }

//     setCoordinates(lat: number, lon: number): void {
//         this.coordinates = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`;
//         this.updateSystemContextWithCoordinates();
//     }

//     setDatasetFromString(url: string): void {
//         fetch(url)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.text();
//         })
//         .then(jsonString => {
//             try {
//                 this.dataset = JSON.parse(jsonString);
//                 const datasetTitle = this.dataset.title || "Untitled Dataset";
//                 this.updateContextWithDataset();
//             } catch (error) {
//                 console.error("Invalid JSON string", error);
//             }
//         })
//         .catch(error => {
//             console.error("Error fetching or parsing dataset", error);
//         });
//     }
    
//     updateContextWithDataset(): void {
//         const datasetEntries = Object.entries(this.dataset)
//         .map(([key, value]) => {
//             if (typeof value === 'object' && value !== null) {
//                 return `${key}: ${JSON.stringify(value, null, 2)}`;
//             }
//             return `${key}: ${value}`;
//         })
//         .join(". ");
        
//         const datasetSummary = `Current Dataset: ${datasetEntries}`;
//         const datasetContextIndex = this.context.findIndex(entry => entry.role === 'system' && entry.content.startsWith('Current Dataset:'));
        
//         if (datasetContextIndex !== -1) {
//             this.context[datasetContextIndex].content = datasetSummary;
//         } else {
//             this.addText('system', datasetSummary);
//         }
//     }

//     getFullConversation(): string[] {
//         return this.context.map(entry => {
//             if (entry.role === 'system') {
//                 const cleanedContent = entry.content.replace(/\n/g, '');
//                 return `${entry.role}: ${cleanedContent}`;
//             }
//             return `${entry.role}: ${entry.content}`;
//         });
//     }
    

//     resetConversation(): void {
//         this.context = [];
//         this.dataset = {};
//     }

//     getDataset(): any {
//         return this.dataset;
//     }

//     getDatasetTitle(): string {
//         return this.dataset.title || "No Title";
//     }
// }

import { test } from "main";
export class ContextManager {
    private context: Array<{ role: string, content: string }> = [];
    private dataset: any = {};
    private coordinates: string = '';
    private prompt_engineering!: string;

    constructor() {
        this.prompt_engineering = "You are an interactive 3D Earth visualization assistant. Provide information and display animations from the current dataset. Reply in 35 words or less, separating paragraphs naturally with dots. Only apologize if corrected.\
	Check for correctness when interpreting prompts, ignore typos, and complete information based on context. Omit mentioning inability to do things. Share only relevant context to the last prompt, no need to repeat titles or specific terms frequently. Use the metric system without abbreviations. Be friendly and concise, focusing on answering what is asked.\
	This is are your current coordinates. Just in case the user asks something related to what region or specific place is seeing:";
        this.setInitialSystemContext(this.prompt_engineering);
        //this.setDatasetFromString('https://mena-08.github.io/conversational-website/assets/ocean/sea_surface_temperature/sea_surface_temperature.txt');
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
        const systemContext = this.context.find(entry => entry.role === 'system');
        const systemContentWithoutCoordinates = systemContext ? systemContext.content.replace(/Coordinates:.*$/, '').trim() : '';
        const updatedSystemContent = `${systemContentWithoutCoordinates}\nCoordinates: ${this.coordinates}`;
        this.updateSystemContext(updatedSystemContent);
    }

    setCoordinates(lat: number, lon: number): void {
        this.coordinates = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`;
        this.updateSystemContextWithCoordinates();
    }

    async setDatasetFromString(url: string): Promise<void> {
        console.log("WHAT IS ALL OF THISSSS WTF: ", test);
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
        
        // Check if the last entry is a dataset entry and update it, otherwise add a new entry
        if (this.context.length > 0 && this.context[this.context.length - 1].content.startsWith("Current Dataset:")) {
            console.log("Updating last dataset entry in context.");
            this.context[this.context.length - 1].content = datasetSummary;
        } else {
            console.log("Adding new dataset entry to context.");
            this.addText('system', datasetSummary);
        }
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
