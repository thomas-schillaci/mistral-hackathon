import {Scene} from "phaser";
import {TEXT_STYLE} from "./styles";

type ShopItem = { crop: string; label: string; price: number };

const SHOP_ITEMS: ShopItem[] = [
    {crop: "strawberry", label: "Strawberry", price: 2},
    {crop: "leek", label: "Leek", price: 2},
    {crop: "potato", label: "Potato", price: 2},
    {crop: "onion", label: "Onion", price: 2},
];

export class ShopPane {
    static readonly REGISTRY_KEY = "shopOpen";

    private static readonly PANEL_X = 80;
    private static readonly PANEL_Y = 720;
    private static readonly PANEL_W = 1760;
    private static readonly PANEL_H = 300;
    private static readonly CONTENT_X = 320;
    private static readonly TITLE_Y = 736;
    private static readonly ITEMS_START_Y = 800;
    private static readonly ITEM_GAP = 52;
    private static readonly TEXT_SCALE = 2;
    private static readonly TITLE_SCALE = 3;
    private static readonly DEPTH = 200000;

    private readonly scene: Scene;

    private readonly panelBg: Phaser.GameObjects.Graphics;
    private readonly titleText: Phaser.GameObjects.Text;
    private readonly itemTexts: Phaser.GameObjects.Text[];
    private readonly itemHighlight: Phaser.GameObjects.Graphics;

    private readonly upKey: Phaser.Input.Keyboard.Key;
    private readonly zKey: Phaser.Input.Keyboard.Key;
    private readonly wKey: Phaser.Input.Keyboard.Key;
    private readonly downKey: Phaser.Input.Keyboard.Key;
    private readonly sKey: Phaser.Input.Keyboard.Key;
    private readonly confirmKey: Phaser.Input.Keyboard.Key;
    private readonly spaceKey: Phaser.Input.Keyboard.Key;
    private readonly eKey: Phaser.Input.Keyboard.Key;
    private readonly escKey: Phaser.Input.Keyboard.Key;

    private selectedIndex = 0;
    private visible = false;

    constructor(scene: Scene) {
        this.scene = scene;

        this.panelBg = scene.add.graphics();
        this.panelBg.setScrollFactor(0).setDepth(ShopPane.DEPTH);

        this.titleText = scene.add
            .text(ShopPane.CONTENT_X, ShopPane.TITLE_Y, "Shop", {
                ...TEXT_STYLE,
                color: "#f0c070",
            })
            .setScrollFactor(0)
            .setScale(ShopPane.TITLE_SCALE)
            .setDepth(ShopPane.DEPTH + 2);

        this.itemHighlight = scene.add.graphics();
        this.itemHighlight.setScrollFactor(0).setDepth(ShopPane.DEPTH + 2);

        this.itemTexts = SHOP_ITEMS.map((item, i) => {
            const text = scene.add
                .text(
                    ShopPane.CONTENT_X,
                    ShopPane.ITEMS_START_Y + i * ShopPane.ITEM_GAP,
                    `${item.label}  —  ${item.price}g`,
                    {...TEXT_STYLE, color: "#cccccc"}
                )
                .setScrollFactor(0)
                .setScale(ShopPane.TEXT_SCALE)
                .setDepth(ShopPane.DEPTH + 3)
                .setInteractive({useHandCursor: true});

            text.on("pointerover", () => this.selectItem(i));
            text.on("pointerdown", () => {
                this.selectItem(i);
                this.buySelected();
            });

            return text;
        });

        this.upKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.zKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.wKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.downKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.sKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.confirmKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.escKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        scene.registry.events.on(
            `changedata-${ShopPane.REGISTRY_KEY}`,
            this.onRegistryChanged,
            this
        );
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

        this.setAllVisible(false);
    }

    update(): void {
        if (!this.visible) return;

        if (Phaser.Input.Keyboard.JustDown(this.upKey) || Phaser.Input.Keyboard.JustDown(this.zKey) || Phaser.Input.Keyboard.JustDown(this.wKey)) {
            this.selectItem((this.selectedIndex - 1 + SHOP_ITEMS.length) % SHOP_ITEMS.length);
        }
        if (Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.selectItem((this.selectedIndex + 1) % SHOP_ITEMS.length);
        }
        if (Phaser.Input.Keyboard.JustDown(this.confirmKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.buySelected();
        }
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.scene.registry.set(ShopPane.REGISTRY_KEY, false);
        }
    }

    private show(): void {
        this.selectedIndex = 0;
        this.drawPanel();
        this.refreshItemVisuals();
        this.setAllVisible(true);
        this.visible = true;
    }

    private hide(): void {
        this.setAllVisible(false);
        this.visible = false;
    }

    private selectItem(index: number): void {
        this.selectedIndex = index;
        this.refreshItemVisuals();
    }

    private buySelected(): void {
        const item = SHOP_ITEMS[this.selectedIndex];
        const gold = this.scene.registry.get("gold") as number;
        if (gold < item.price) return;
        this.scene.registry.set("gold", gold - item.price);
        const counts = {...this.scene.registry.get("cropCounts") as Record<string, number>};
        counts[item.crop]++;
        this.scene.registry.set("cropCounts", counts);
    }

    private refreshItemVisuals(): void {
        this.itemTexts.forEach((text, i) => {
            text.setStyle({color: i === this.selectedIndex ? "#f0c070" : "#cccccc"});
        });
        this.drawHighlight();
    }

    private drawPanel(): void {
        const {PANEL_X, PANEL_Y, PANEL_W, PANEL_H} = ShopPane;
        this.panelBg.clear();
        this.panelBg.fillStyle(0x1a1020, 0.93);
        this.panelBg.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        this.panelBg.lineStyle(2, 0xc8778a, 1);
        this.panelBg.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    }

    private drawHighlight(): void {
        const y = ShopPane.ITEMS_START_Y + this.selectedIndex * ShopPane.ITEM_GAP;
        const rowHeight = ShopPane.TEXT_SCALE * 10 + 8;
        this.itemHighlight.clear();
        this.itemHighlight.fillStyle(0x3d2040, 0.7);
        this.itemHighlight.fillRoundedRect(
            ShopPane.CONTENT_X - 8,
            y - 4,
            900,
            rowHeight,
            4
        );
    }

    private setAllVisible(visible: boolean): void {
        this.panelBg.setVisible(visible);
        this.titleText.setVisible(visible);
        this.itemHighlight.setVisible(visible);
        this.itemTexts.forEach(t => t.setVisible(visible));
    }

    private onRegistryChanged(_parent: unknown, value: boolean): void {
        if (value && !this.visible) this.show();
        else if (!value && this.visible) this.hide();
    }

    private destroy(): void {
        this.scene.registry.events.off(
            `changedata-${ShopPane.REGISTRY_KEY}`,
            this.onRegistryChanged,
            this
        );
        this.panelBg.destroy();
        this.titleText.destroy();
        this.itemHighlight.destroy();
        this.itemTexts.forEach(t => t.destroy());
    }
}
