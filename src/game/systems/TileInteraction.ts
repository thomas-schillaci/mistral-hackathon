import {Crop, CropType} from "../entities/Crop";
import {feature} from '../feature';
import type {GameAPI} from '../GameAPI';

const DIRT_TILE_ID = 130;


function isNearPlayer(
    tileX: number,
    tileY: number,
    playerX: number,
    playerY: number,
    tileWidth: number,
    tileHeight: number
): boolean {
    const playerTileX = Math.floor(playerX / tileWidth);
    const playerTileY = Math.floor(playerY / tileHeight);
    return Math.abs(tileX - playerTileX) <= 1 && Math.abs(tileY - playerTileY) <= 1;
}

export function updateTileOutline(
    scene: Phaser.Scene,
    outline: Phaser.GameObjects.Image,
    playerSprite: Phaser.GameObjects.GameObject & { x: number; y: number },
    tileWidth: number,
    tileHeight: number
): void {
    const worldPoint = scene.input.activePointer.positionToCamera(scene.cameras.main);
    if (!worldPoint || typeof worldPoint !== 'object' || !('x' in worldPoint) || !('y' in worldPoint)) {
        outline.setVisible(false);
        return;
    }

    const tileX = Math.floor(worldPoint.x / tileWidth);
    const tileY = Math.floor(worldPoint.y / tileHeight);

    if (!isNearPlayer(tileX, tileY, playerSprite.x, playerSprite.y, tileWidth, tileHeight)) {
        outline.setVisible(false);
        return;
    }

    outline.setVisible(true);
    outline.setPosition(tileX * tileWidth, tileY * tileHeight);
}

export function handleTileClick(
    pointer: Phaser.Input.Pointer,
    scene: Phaser.Scene & GameAPI,
    baseLayer: Phaser.Tilemaps.TilemapLayer,
    playerSprite: Phaser.GameObjects.GameObject & { x: number; y: number },
    tileWidth: number,
    tileHeight: number,
    isConversationOpen: () => boolean
): void {
    if (isConversationOpen()) return;

    const worldPoint = pointer.positionToCamera(scene.cameras.main);
    if (!worldPoint || typeof worldPoint !== 'object' || !('x' in worldPoint) || !('y' in worldPoint)) {
        return;
    }

    const tileX = Math.floor(worldPoint.x / tileWidth);
    const tileY = Math.floor(worldPoint.y / tileHeight);

    const tile = baseLayer.getTileAt(tileX, tileY);
    if (!tile || tile.index !== DIRT_TILE_ID) return;
    if (!isNearPlayer(tileX, tileY, playerSprite.x, playerSprite.y, tileWidth, tileHeight)) return;

    const crop = Crop.getCrop(tileX, tileY);
    if (!crop) {
        const selectedType = scene.registry.get("selectedCropType") as CropType;
        const counts = scene.registry.get("cropCounts");
        if (counts[selectedType] <= 0) return;
        scene.registry.set("cropCounts", {...counts, [selectedType]: counts[selectedType] - 1});
        Crop.plant(scene, tileX, tileY, selectedType);
        feature.onCropPlanted(scene, tileX, tileY, selectedType);
    } else if (crop.isFullyGrown) {
        const cropType = crop.type;
        crop.harvest();
        const goldEarned = 10;
        const gold = scene.registry.get("gold") as number;
        scene.registry.set("gold", gold + goldEarned);
        const cropsHarvested = { ...scene.registry.get("cropsHarvested") };
        cropsHarvested[cropType]++;
        scene.registry.set("cropsHarvested", cropsHarvested);
        feature.onCropHarvested(scene, cropType, goldEarned);
    }
}
