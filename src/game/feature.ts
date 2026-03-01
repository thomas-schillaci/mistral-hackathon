import Phaser from 'phaser';
import { Crop, CropType } from './entities/Crop';

// Extend the CropType union to include mystery_seed
type ExtendedCropType = CropType | "mystery_seed";

const MYSTERY_SEED_TYPE: ExtendedCropType = "mystery_seed";
const POSSIBLE_CROP_TYPES: CropType[] = ["strawberry", "leek", "potato", "onion"];

export const feature = {
    onUpdate: (scene: Phaser.Scene, delta: number) => {
        // No update logic needed for mystery seeds
    },

    onNpcTalkStart: (scene: Phaser.Scene, npcId: string) => {
        // No NPC interaction logic needed for mystery seeds
    },

    onConversationEnd: (scene: Phaser.Scene, npcId: string) => {
        // No conversation end logic needed for mystery seeds
    }
};

// Override the original plant method to handle mystery seeds
const originalPlant = Crop.plant;
Crop.plant = function(scene: Phaser.Scene, tileX: number, tileY: number, type: ExtendedCropType) {
    if (type === MYSTERY_SEED_TYPE) {
        // Randomly select a crop type for mystery seeds
        const randomIndex = Math.floor(Math.random() * POSSIBLE_CROP_TYPES.length);
        const randomType = POSSIBLE_CROP_TYPES[randomIndex];
        originalPlant(scene, tileX, tileY, randomType);
    } else {
        originalPlant(scene, tileX, tileY, type as CropType);
    }
};