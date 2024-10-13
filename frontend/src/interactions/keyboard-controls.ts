/* The `KeyboardControls` class handles keyboard input events to control objects in a scene, allowing
for actions such as switching textures on a specific object. */
import { Scene } from "../engine/scene";

export class KeyboardControls {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeControls();
    }

    private initializeControls(): void {
        window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    }

    private handleKeyDown(event: KeyboardEvent): void {
        switch (event.key) {
            case "q":
                this.handleQKey();
                break;
            case "e":
                this.handleEKey();
                break;
            default:
                break;
        }
    }

    private handleQKey(): void {
        //THIS IS JUST FOR TESTING STUFF
        this.scene.getObjectById('object-0').switchTexture((this.scene.getObjectById('object-0').currentTextureIndex + 1) % this.scene.getObjectById('object-0').textures.length);
        console.log(this.scene.getObjectById('object-0'));
        console.log("Q key pressed");

    }

    private handleEKey(): void {
        //THIS IS JUST FOR TESTING STUFF
        this.scene.getObjectById('object-0').switchTexture((this.scene.getObjectById('object-0').currentTextureIndex - 1) % this.scene.getObjectById('object-0').textures.length);
        console.log("E key pressed");
    }
}