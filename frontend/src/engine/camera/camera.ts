import { vec3, mat4, quat } from 'wgpu-matrix';

// frontend/src/engine/Camera.ts
export class Camera {
    position: Float32Array;
    target: Float32Array;
    up: Float32Array;
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;
    fov: number;
    aspectRatio: number;
    near: number;
    far: number;
    orientation = quat.create();
    distance: number;
    angularVelocity = 0.01;
    axis = vec3.create();

    constructor(position: [number, number, number], target: [number, number, number], up: [number, number, number], fov: number, aspectRatio: number, near: number, far: number) {
        this.position = new Float32Array(position);
        this.target = new Float32Array(target);
        this.up = new Float32Array(up);
        this.fov = fov * Math.PI / 180; // Convert degrees to radians
        this.aspectRatio = aspectRatio;
        this.near = near;
        this.far = far;
        this.distance = vec3.length(vec3.subtract(new Float32Array(3), position, target));
        this.viewMatrix = mat4.lookAt(this.position, this.target, this.up);
        this.projectionMatrix = mat4.perspective(this.fov, this.aspectRatio, this.near, this.far);
    }

    updateViewMatrix(): void {
        mat4.lookAt(this.position, this.target, this.up, this.viewMatrix);
    }

    setAspectRatio(aspectRatio: number): void {
        this.aspectRatio = aspectRatio;
        this.updateProjectionMatrix();
    }

    setPosition(position: [number, number, number]): void {
        this.position = new Float32Array(position);
        this.updateViewMatrix();
    }

    updateProjectionMatrix(): void {
        mat4.perspective(this.fov, this.aspectRatio, this.near, this.far, this.projectionMatrix);
    }

    move(direction: [number, number, number]): void {
        vec3.add(this.position, direction, this.position);
        this.updateViewMatrix();
    }    
}
