import type Phaser from 'phaser';
import type { PlayerCharacter } from './entities/PlayerCharacter';
import type { NPC } from './entities/NPC';
import type { Shopkeeper } from './entities/Shopkeeper';
import type { CropType } from './entities/Crop';

/**
 * Public surface exposed to LLM-generated code in feature.ts.
 * Game implements this interface; feature.ts imports only this type
 * to avoid a circular dependency.
 */
export interface GameAPI {
    readonly registry: Phaser.Data.DataManager;
    readonly load: Phaser.Loader.LoaderPlugin;
    readonly add: Phaser.GameObjects.GameObjectFactory;
    readonly player: PlayerCharacter;
    readonly npcs: NPC[];
    readonly shopkeeper: Shopkeeper;

    /** Give or take gold (use a negative value to deduct). */
    addGold(amount: number): void;

    /** Give crops to the player's inventory. */
    addCrops(type: CropType, count: number): void;

    /** Instantly unlock an achievement by its ID string. */
    unlockAchievement(id: string): void;

    /** Teleport the player sprite to world coordinates. */
    teleportPlayer(x: number, y: number): void;

    /**
     * Scale how fast crops grow. 1 = normal, 2 = double speed, 0.5 = half speed.
     * Applied as a multiplier on the delta passed to Crop.updateAll each frame.
     */
    setCropGrowthMultiplier(multiplier: number): void;

    /** Open or close the NPC dialogue programmatically. */
    setConversationOpen(open: boolean): void;

    /** Open or close the shop programmatically. */
    setShopOpen(open: boolean): void;
}
