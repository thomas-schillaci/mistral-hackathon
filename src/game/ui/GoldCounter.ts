import {Scene} from "phaser";
import {TEXT_STYLE} from "./styles";

export class GoldCounter {
    static readonly REGISTRY_KEY = "gold";
    private static readonly HUD_SCALE = 3;
    private static readonly MARGIN = 18;

    private readonly scene: Scene;
    private readonly text: Phaser.GameObjects.Text;

    constructor(scene: Scene) {
        this.scene = scene;

        this.text = this.scene.add
            .text(0, 0, "Gold: 0", {
                ...TEXT_STYLE,
                backgroundColor: "#1f1f1ff2",
                padding: {x: 4, y: 3},
            })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setScale(GoldCounter.HUD_SCALE)
            .setDepth(100001);

        this.layout();

        this.scene.registry.events.on(
            `changedata-${GoldCounter.REGISTRY_KEY}`,
            this.onGoldChanged,
            this
        );
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private onGoldChanged(_parent: unknown, value: number): void {
        this.text.setText(`Gold: ${value}`);
    }

    private layout(): void {
        this.text.setPosition(
            this.scene.scale.width - GoldCounter.MARGIN,
            GoldCounter.MARGIN
        );
    }

    private destroy(): void {
        this.scene.registry.events.off(
            `changedata-${GoldCounter.REGISTRY_KEY}`,
            this.onGoldChanged,
            this
        );
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.text.destroy();
    }
}
