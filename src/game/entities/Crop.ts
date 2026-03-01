import {Scene} from "phaser";

export type CropType = "strawberry" | "leek" | "potato" | "onion";
export type CropState = { tileX: number; tileY: number; type: CropType; growthStage: number };

export class Crop {
    private static readonly STAGES_PER_CROP = 6;
    private static readonly GROWTH_INTERVAL_MS = 5000;
    private static crops = new Map<string, Crop>();
    private static readonly CROP_ROW_BY_TYPE: Record<CropType, number> = {
        strawberry: 0,
        leek: 1,
        potato: 2,
        onion: 3,
    };

    static preloadSpritesheet(loader: Phaser.Loader.LoaderPlugin): void {
        loader.spritesheet("crops", "assets/Farm Crops/Spring Crops.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
    }

    static plant(
        scene: Scene,
        tileX: number,
        tileY: number,
        type: CropType
    ) {
        const tileKey = Crop.getTileKey(tileX, tileY);
        if (Crop.crops.has(tileKey)) {
            return;
        }
        Crop.crops.set(tileKey,  new Crop(scene, tileX, tileY, type));
    }

    static getCrop(tileX: number, tileY: number): Crop | undefined {
        return Crop.crops.get(Crop.getTileKey(tileX, tileY));
    }

    static serialize(): CropState[] {
        return Array.from(Crop.crops.values()).map(c => ({
            tileX: c.tileX,
            tileY: c.tileY,
            type: c.type,
            growthStage: c.growthStage,
        }));
    }

    static restore(scene: Scene, crops: CropState[]): void {
        for (const { tileX, tileY, type, growthStage } of crops) {
            const crop = new Crop(scene, tileX, tileY, type);
            crop.setGrowthStage(growthStage);
            Crop.crops.set(Crop.getTileKey(tileX, tileY), crop);
        }
    }

    static updateAll(delta: number): void {
        Crop.crops.forEach((crop) => {
            crop.update(delta);
        });
    }

    private static getTileKey(tileX: number, tileY: number): string {
        return `${tileX},${tileY}`;
    }

    private readonly sprite: Phaser.GameObjects.Sprite;
    readonly type: CropType;
    private readonly tileX: number;
    private readonly tileY: number;
    private growthStage: number;
    private counter = 0;

    get isFullyGrown(): boolean {
        return this.growthStage >= Crop.STAGES_PER_CROP - 1;
    }

    harvest(): void {
        this.sprite.destroy();
        Crop.crops.delete(Crop.getTileKey(this.tileX, this.tileY));
    }

    constructor(
        scene: Scene,
        tileX: number,
        tileY: number,
        type: CropType
    ) {
        this.type = type;
        this.tileX = tileX;
        this.tileY = tileY;
        this.growthStage = 0;
        const worldX = (tileX + 0.5) * 16;
        const worldY = (tileY + 1) * 16;
        this.sprite = scene.add.sprite(worldX, worldY, "crops", 0);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(worldY);
        this.setGrowthStage(0);
        this.counter = 0;
    }

    setGrowthStage(stage: number): void {
        this.growthStage = Phaser.Math.Clamp(stage, 0, Crop.STAGES_PER_CROP - 1);
        const row = Crop.CROP_ROW_BY_TYPE[this.type];
        const frame = 13 * row + this.growthStage;
        this.sprite.setFrame(frame);
    }

    private update(delta: number): void {
        if (this.growthStage >= Crop.STAGES_PER_CROP - 1) {
            return;
        }

        this.counter += delta;
        while (this.counter >= Crop.GROWTH_INTERVAL_MS) {
            this.counter -= Crop.GROWTH_INTERVAL_MS;
            this.setGrowthStage(this.growthStage + 1);
            if (this.growthStage >= Crop.STAGES_PER_CROP - 1) {
                return;
            }
        }
    }
}