import { Scene } from "phaser";
import { Character } from "./Character";

export class Shopkeeper extends Character {
    static readonly TEXTURE_KEY = "shopkeeper";
    private static readonly BASE_PATH = "assets/Characters/ShopKeeper";

    static preload(loader: Phaser.Loader.LoaderPlugin): void {
        // ShopKeeper has no Walk sheet — load Idle only.
        loader.spritesheet(`${Shopkeeper.TEXTURE_KEY}-idle`, `${Shopkeeper.BASE_PATH}/Idle.png`, {
            frameWidth: 32,
            frameHeight: 32,
            endFrame: 11,
        });
    }

    constructor(scene: Scene, x: number, y: number) {
        super(scene, {
            x,
            y,
            animationPrefix: Shopkeeper.TEXTURE_KEY,
            walkTextureKey: `${Shopkeeper.TEXTURE_KEY}-idle`,
            idleTextureKey: `${Shopkeeper.TEXTURE_KEY}-idle`,
            speed: 0,
        });
    }

    update(delta: number): void {
        this.applyMovement(0, 0, delta);
    }
}
