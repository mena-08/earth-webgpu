import { Camera } from "../engine/camera/camera";

export class CameraControls {
    private camera: Camera;
    private canvas: HTMLCanvasElement;
    private isMouseDown: boolean = false;
    private lastMouseX: number | null = null;
    private lastMouseY: number | null = null;
    private mouseDelta = { x: 0, y: 0 };
    private touchStartPos: { x: number, y: number } | null = null;
    private lastTouchDistance: number | null = null;

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;
        //this.addKeyboardListeners();
        this.addMouseListeners();
    }

    private addKeyboardListeners(): void {
        window.addEventListener('keydown', this.handleKeyDown);
    }
    private addMouseListeners(): void {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('wheel', this.handleMouseWheel);

            // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart);
        this.canvas.addEventListener('touchmove', this.handleTouchMove);
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
    }

    handleMouseDown = (event: MouseEvent): void => {
        this.isMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
    }

    handleMouseUp = (): void => {
        this.isMouseDown = false;
        //console.log(this.camera.getSphericalCoordinates());
    }

    handleMouseMove = (event: MouseEvent): void => {
        if (!this.isMouseDown) {
            return;
        }
        const deltaX = event.clientX - (this.lastMouseX || event.clientX);
        const deltaY = event.clientY - (this.lastMouseY || event.clientY);

        this.mouseDelta.x += deltaX;
        this.mouseDelta.y += deltaY

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    handleMouseWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const minDistance = 1.5; // Minimum distance from the target
    
        // Calculate the zoom direction based on the wheel delta
        const zoomDirection = event.deltaY > 0 ? -1 : 1;
    
        // Calculate the vector from the camera to its target
        let cameraDirection = [
            this.camera.target[0] - this.camera.position[0],
            this.camera.target[1] - this.camera.position[1],
            this.camera.target[2] - this.camera.position[2]
        ];
    
        // Calculate the current distance between the camera and the target
        const currentDistance = Math.sqrt(
            cameraDirection[0] * cameraDirection[0] + 
            cameraDirection[1] * cameraDirection[1] + 
            cameraDirection[2] * cameraDirection[2]
        );
    
        // If zooming in and current distance is less than minDistance, do nothing
        if (zoomDirection > 0 && currentDistance <= minDistance) {
            return;
        }
    
        // Normalize the direction vector
        cameraDirection = [
            cameraDirection[0] / currentDistance,
            cameraDirection[1] / currentDistance,
            cameraDirection[2] / currentDistance
        ];
    
        // Update the camera position based on the zoom direction and speed
        this.camera.setPosition([
            this.camera.position[0] + cameraDirection[0] * zoomSpeed * zoomDirection,
            this.camera.position[1] + cameraDirection[1] * zoomSpeed * zoomDirection,
            this.camera.position[2] + cameraDirection[2] * zoomSpeed * zoomDirection
        ]);
    
        // Update the camera view matrix
        this.camera.updateViewMatrix();
    }
    
    

    updateCameraOrbit(deltaTime: number) {
        const orbitSpeed = 0.5;
    
        //spherical coordinates of the camera position
        let radius = Math.sqrt(this.camera.position[0] ** 2 + this.camera.position[1] ** 2 + this.camera.position[2] ** 2);
        let theta = Math.atan2(this.camera.position[0], this.camera.position[2]); // Azimuthal angle
        let phi = Math.acos(this.camera.position[1] / radius); // Polar angle
    
        theta -= this.mouseDelta.x * deltaTime * orbitSpeed;
        phi -= this.mouseDelta.y * deltaTime * orbitSpeed;
    
        //clamp phi to avoid flipping at the poles
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
    
        //spherical to xyz coordinates
        this.camera.setPosition([radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta)]);
    
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        //this.camera.lookAt([0, 0, 0]);
    }


    private handleKeyDown = (event: KeyboardEvent): void => {
        switch (event.key) {
            case 'ArrowUp':
                case 'w':
                this.moveCamera([0, 0, -0.1]);//forward
                break;
            case 'ArrowDown':
            case 's':
                this.moveCamera([0, 0, 0.1]);//backward
                break;
            case 'ArrowLeft':
            case 'a':
                this.moveCamera([-0.1, 0, 0]);//left
                break;
            case 'ArrowRight':
            case 'd':
                this.moveCamera([0.1, 0, 0]);//right
                break;
            case 'q':
                this.moveCamera([0, 0.1, 0]);//up
                break;
            case 'e':
                this.moveCamera([0, -0.1, 0]);//down
                break;
        }
        event.preventDefault();
    }


    private moveCamera(direction: [number, number, number]): void {
        this.camera.move(direction);
    }

    handleTouchStart = (event: TouchEvent): void => {
        if (event.touches.length === 1) {
            // Single finger for orbit
            this.touchStartPos = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        } else if (event.touches.length === 2) {
            // Two fingers for zoom
            this.lastTouchDistance = this.getDistanceBetweenTouches(event.touches);
        }
    };
    
    handleTouchMove = (event: TouchEvent): void => {
        if (event.touches.length === 1 && this.touchStartPos) {
            // Orbit control
            const touchDeltaX = event.touches[0].clientX - this.touchStartPos.x;
            const touchDeltaY = event.touches[0].clientY - this.touchStartPos.y;
    
            this.mouseDelta.x += touchDeltaX;
            this.mouseDelta.y += touchDeltaY;
    
            this.touchStartPos.x = event.touches[0].clientX;
            this.touchStartPos.y = event.touches[0].clientY;
        } else if (event.touches.length === 2 && this.lastTouchDistance !== null) {
            // Zoom control
            const currentDistance = this.getDistanceBetweenTouches(event.touches);
            const zoomDelta = (currentDistance - this.lastTouchDistance) * 0.005; // Adjust zoom sensitivity
    
            this.handleZoom(zoomDelta);
            this.lastTouchDistance = currentDistance;
        }
    };
    
    handleTouchEnd = (): void => {
        this.touchStartPos = null;
        this.lastTouchDistance = null;
    };
    
    private getDistanceBetweenTouches(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    private handleZoom(zoomDelta: number): void {
        const zoomSpeed = 0.1;
        const minDistance = 1.5;
    
        let cameraDirection = [
            this.camera.target[0] - this.camera.position[0],
            this.camera.target[1] - this.camera.position[1],
            this.camera.target[2] - this.camera.position[2]
        ];
    
        const currentDistance = Math.sqrt(
            cameraDirection[0] * cameraDirection[0] +
            cameraDirection[1] * cameraDirection[1] +
            cameraDirection[2] * cameraDirection[2]
        );
    
        if (zoomDelta > 0 && currentDistance <= minDistance) {
            return;
        }
    
        cameraDirection = [
            cameraDirection[0] / currentDistance,
            cameraDirection[1] / currentDistance,
            cameraDirection[2] / currentDistance
        ];
    
        this.camera.setPosition([
            this.camera.position[0] + cameraDirection[0] * zoomSpeed * zoomDelta,
            this.camera.position[1] + cameraDirection[1] * zoomSpeed * zoomDelta,
            this.camera.position[2] + cameraDirection[2] * zoomSpeed * zoomDelta
        ]);
    
        this.camera.updateViewMatrix();
    }
    

}
