export const CAMERA = {
    zoom: 4,
    deadZoneWidthRatio: 0.55,
    deadZoneHeightRatio: 0.5,
} as const;

export function configureCamera(
    camera: Phaser.Cameras.Scene2D.Camera,
    target: Phaser.GameObjects.GameObject,
    worldWidth: number,
    worldHeight: number
): void {
    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.setRoundPixels(true);
    camera.setZoom(CAMERA.zoom);
    camera.startFollow(target);
    updateCameraDeadZone(camera);
}

export function updateCameraDeadZone(camera: Phaser.Cameras.Scene2D.Camera): void {
    const viewWidth = camera.width / camera.zoom;
    const viewHeight = camera.height / camera.zoom;
    const deadZoneWidth = Math.max(1, Math.floor(viewWidth * CAMERA.deadZoneWidthRatio));
    const deadZoneHeight = Math.max(1, Math.floor(viewHeight * CAMERA.deadZoneHeightRatio));
    camera.setDeadzone(deadZoneWidth, deadZoneHeight);
}