export class ChatResizer {
    private chatContainer: HTMLElement;
    private resizeBar: HTMLElement;
    private isResizing: boolean = false;
    private startY: number = 0;
    private startHeight: number = 0;

    constructor(chatContainerId: string, resizeBarId: string) {
        this.chatContainer = document.getElementById(chatContainerId) as HTMLElement;
        this.resizeBar = document.getElementById(resizeBarId) as HTMLElement;
        console.log(this.chatContainer);
        console.log(this.resizeBar);

        //this.addEventListeners();
    }

    private addEventListeners(): void {
        this.resizeBar.addEventListener("mousedown", this.handleMouseDown);
        this.resizeBar.addEventListener("touchstart", this.handleTouchStart, { passive: false });

        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("touchmove", this.handleTouchMove, { passive: false });

        document.addEventListener("mouseup", this.handleMouseUp);
        document.addEventListener("touchend", this.handleTouchEnd);
    }

    private handleMouseDown = (event: MouseEvent): void => {
        this.startResizing(event.clientY, this.chatContainer.offsetHeight);
        event.preventDefault();
    };

    private handleTouchStart = (event: TouchEvent): void => {
        if (event.touches.length === 1) {
            this.startResizing(event.touches[0].clientY, this.chatContainer.offsetHeight);
            event.preventDefault();
        }
    };

    private handleMouseMove = (event: MouseEvent): void => {
        if (this.isResizing) {
            this.resizeChat(event.clientY);
        }
    };

    private handleTouchMove = (event: TouchEvent): void => {
        if (this.isResizing && event.touches.length === 1) {
            this.resizeChat(event.touches[0].clientY);
            event.preventDefault();
        }
    };

    private handleMouseUp = (): void => {
        this.stopResizing();
    };

    private handleTouchEnd = (): void => {
        this.stopResizing();
    };

    private startResizing(startY: number, startHeight: number): void {
        this.isResizing = true;
        this.startY = startY;
        this.startHeight = startHeight;
        document.body.style.cursor = "row-resize";
    }

    // private resizeChat(currentY: number): void {
    //     const delta = currentY - this.startY;
    //     const newHeight = this.startHeight - delta;

    //     // Ensure the height is within reasonable bounds
    //     if (newHeight >= 150 && newHeight <= window.innerHeight * 0.8) {
    //         this.chatContainer.style.height = `${newHeight}px`;
    //     }
    // }
    private resizeChat(currentY: number): void {
        const delta = currentY - this.startY;
        const newHeight = this.startHeight - delta;
    
        // Ensure the height is within reasonable bounds
        if (newHeight >= 150 && newHeight <= window.innerHeight * 0.8) {
            this.chatContainer.style.height = `${newHeight}px`;
    
            // Dynamically adjust the messages container height
            const messagesContainer = this.chatContainer.querySelector("#messages") as HTMLElement;
            messagesContainer.style.maxHeight = `calc(${newHeight}px - 100px)`;
        }
    }
    

    private stopResizing(): void {
        this.isResizing = false;
        document.body.style.cursor = "default";
    }
}
