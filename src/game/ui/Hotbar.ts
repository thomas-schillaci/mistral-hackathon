import {Scene} from "phaser";
import {CropType} from "../entities/Crop";
import {TEXT_STYLE} from "./styles";

type HotbarSlot = {
    cropType: CropType;
    label: string;
    frame: number;
};

export class Hotbar {
    static readonly REGISTRY_KEY_SELECTED_CROP = "selectedCropType";
    private static readonly HOTBAR_TEXTURE_KEY = "ui-hotbar-base";
    private static readonly HUD_SCALE = 4;
    private static readonly TEXT_SCALE = 2;
    private static readonly SLOT_SIZE = 18;
    private static readonly SLOT_GAP = 4;
    private static readonly HOTBAR_PADDING = 6;
    private static readonly BOTTOM_MARGIN_PX = 18;

    private static readonly SLOTS: HotbarSlot[] = [
        {cropType: "strawberry", label: "1", frame: 6},
        {cropType: "leek", label: "2", frame: 19},
        {cropType: "potato", label: "3", frame: 32},
        {cropType: "onion", label: "4", frame: 45},
    ];

    private readonly scene: Scene;
    private readonly hotbarSprite: Phaser.GameObjects.Sprite;
    private readonly itemSprites: Phaser.GameObjects.Sprite[] = [];
    private readonly keyTexts: Phaser.GameObjects.Text[] = [];
    private readonly selectedOutline: Phaser.GameObjects.Image;
    private selectedIndex = 0;
    private readonly numberKeys: Phaser.Input.Keyboard.Key[];
    private readonly wheelHandler: (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number
    ) => void;

    constructor(scene: Scene) {
        this.scene = scene;
        this.ensureHotbarTexture();

        this.hotbarSprite = this.scene.add
            .sprite(0, 0, Hotbar.HOTBAR_TEXTURE_KEY)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setScale(Hotbar.HUD_SCALE)
            .setDepth(100001);

        const initialCounts = this.scene.registry.get("cropCounts");
        Hotbar.SLOTS.forEach((slot) => {
            const sprite = this.scene.add
                .sprite(0, 0, "crops", slot.frame)
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0)
                .setScale(Hotbar.HUD_SCALE)
                .setDepth(100002);
            this.itemSprites.push(sprite);

            const keyText = this.scene.add
                .text(0, 0, String(initialCounts[slot.cropType]), TEXT_STYLE)
                .setOrigin(1, 1)
                .setScrollFactor(0)
                .setScale(Hotbar.TEXT_SCALE)
                .setDepth(100004);
            this.keyTexts.push(keyText);
        });

        this.selectedOutline = this.scene.add
            .image(0, 0, "tile-outline")
            .setOrigin(0.5, 0.5)
            .setScrollFactor(0)
            .setDepth(100003)
            .setScale((Hotbar.SLOT_SIZE / 16) * Hotbar.HUD_SCALE);

        this.numberKeys = [
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
            Phaser.Input.Keyboard.KeyCodes.FOUR,
        ].map((keyCode) => this.scene.input.keyboard!.addKey(keyCode));

        this.wheelHandler = (_pointer, _currentlyOver, _deltaX, deltaY) => {
            if (deltaY === 0) {
                return;
            }
            const direction = deltaY > 0 ? 1 : -1;
            this.selectByOffset(direction);
        };

        this.scene.input.on("wheel", this.wheelHandler);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.scene.registry.events.on("changedata-cropCounts", this.onCropCountsChanged, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

        this.layout();
        this.scene.registry.set(
            Hotbar.REGISTRY_KEY_SELECTED_CROP,
            Hotbar.SLOTS[this.selectedIndex].cropType
        );
        this.refreshSelectionStyles();
    }

    update(): void {
        this.numberKeys.forEach((key, index) => {
            if (Phaser.Input.Keyboard.JustDown(key)) {
                this.setSelectedIndex(index);
            }
        });
    }

    private setSelectedIndex(index: number): void {
        if (index < 0 || index >= Hotbar.SLOTS.length || index === this.selectedIndex) {
            return;
        }

        this.selectedIndex = index;
        this.scene.registry.set(
            Hotbar.REGISTRY_KEY_SELECTED_CROP,
            Hotbar.SLOTS[this.selectedIndex].cropType
        );
        this.refreshSelectionStyles();
    }

    private selectByOffset(offset: number): void {
        const slotCount = Hotbar.SLOTS.length;
        const nextIndex = (this.selectedIndex + offset + slotCount) % slotCount;
        this.setSelectedIndex(nextIndex);
    }

    private onCropCountsChanged(_parent: unknown, counts: Record<string, number>): void {
        Hotbar.SLOTS.forEach((slot, index) => {
            this.keyTexts[index].setText(String(counts[slot.cropType]));
        });
    }

    private refreshSelectionStyles(): void {
        const slotCenter = this.getSlotCenterPosition(this.selectedIndex);
        this.selectedOutline.setPosition(slotCenter.x, slotCenter.y);
    }

    private layout(): void {
        const hotbarHeight = this.hotbarSprite.displayHeight;
        const hotbarDisplayWidth = this.hotbarSprite.displayWidth;
        const x = Math.round((this.scene.scale.width - hotbarDisplayWidth) / 2);
        const y = Math.round(
            this.scene.scale.height - hotbarHeight - Hotbar.BOTTOM_MARGIN_PX
        );

        this.hotbarSprite.setPosition(x, y);

        this.itemSprites.forEach((itemSprite, index) => {
            const slotCenter = this.getSlotCenterPosition(index);
            itemSprite.setPosition(slotCenter.x, slotCenter.y);
        });

        this.keyTexts.forEach((keyText, index) => {
            const slotCenter = this.getSlotCenterPosition(index);
            keyText.setPosition(
                slotCenter.x + 10 * Hotbar.HUD_SCALE,
                slotCenter.y + 10 * Hotbar.HUD_SCALE
            );
        });

        this.refreshSelectionStyles();
    }

    private getSlotCenterPosition(index: number): { x: number; y: number } {
        const x =
            this.hotbarSprite.x +
            (Hotbar.HOTBAR_PADDING +
                Hotbar.SLOT_SIZE / 2 +
                index * (Hotbar.SLOT_SIZE + Hotbar.SLOT_GAP)) *
            Hotbar.HUD_SCALE;
        const y =
            this.hotbarSprite.y +
            (Hotbar.HOTBAR_PADDING + Hotbar.SLOT_SIZE / 2) * Hotbar.HUD_SCALE;
        return {x, y};
    }

    private ensureHotbarTexture(): void {
        if (this.scene.textures.exists(Hotbar.HOTBAR_TEXTURE_KEY)) {
            return;
        }

        const slotCount = Hotbar.SLOTS.length;
        const width =
            Hotbar.HOTBAR_PADDING * 2 +
            slotCount * Hotbar.SLOT_SIZE +
            (slotCount - 1) * Hotbar.SLOT_GAP;
        const height = Hotbar.HOTBAR_PADDING * 2 + Hotbar.SLOT_SIZE;

        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x1f1f1f, 0.95);
        graphics.fillRect(0, 0, width, height);
        graphics.lineStyle(2, 0x8f8f8f, 1);
        graphics.strokeRect(0, 0, width, height);

        for (let i = 0; i < slotCount; i += 1) {
            const slotX = Hotbar.HOTBAR_PADDING + i * (Hotbar.SLOT_SIZE + Hotbar.SLOT_GAP);
            const slotY = Hotbar.HOTBAR_PADDING;
            graphics.fillStyle(0x111111, 1);
            graphics.fillRect(slotX, slotY, Hotbar.SLOT_SIZE, Hotbar.SLOT_SIZE);
            graphics.lineStyle(1, 0x555555, 1);
            graphics.strokeRect(slotX, slotY, Hotbar.SLOT_SIZE, Hotbar.SLOT_SIZE);
        }

        graphics.generateTexture(Hotbar.HOTBAR_TEXTURE_KEY, width, height);
        graphics.destroy();
    }

    private destroy(): void {
        this.scene.input.off("wheel", this.wheelHandler);
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.scene.registry.events.off("changedata-cropCounts", this.onCropCountsChanged, this);
        this.hotbarSprite.destroy();
        this.selectedOutline.destroy();
        this.itemSprites.forEach((sprite) => sprite.destroy());
        this.keyTexts.forEach((text) => text.destroy());
    }
}