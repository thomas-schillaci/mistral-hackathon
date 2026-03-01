import { Scene } from "phaser";
import { TEXT_STYLE } from "./styles";

const STORAGE_KEY = "tutorialViewed";

export class TutorialPane {
    private static readonly DEPTH = 350000;

    private readonly scene: Scene;
    private readonly overlay: Phaser.GameObjects.Graphics;
    private readonly panel: Phaser.GameObjects.Graphics;
    private readonly titleText: Phaser.GameObjects.Text;
    private readonly bodyText: Phaser.GameObjects.Text;
    private visible = false;

    constructor(scene: Scene) {
        this.scene = scene;

        this.overlay = scene.add.graphics()
            .setScrollFactor(0)
            .setDepth(TutorialPane.DEPTH);
        this.overlay.fillStyle(0x000000, 0.75);
        this.overlay.fillRect(0, 0, 1920, 1080);

        this.panel = scene.add.graphics()
            .setScrollFactor(0)
            .setDepth(TutorialPane.DEPTH + 1);

        this.titleText = scene.add
            .text(960, 240, "SOWN", { ...TEXT_STYLE, color: "#f0c070" })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setScale(4)
            .setDepth(TutorialPane.DEPTH + 2);

        this.bodyText = scene.add
            .text(960, 380, [
                "You're experiencing a lucid dream, and this one is a tiny farm.",
                "WASD (or ZQSD) / Arrow Keys  —  Move",
                "E  —  Talk to nearby villagers",
                "Click on soil  —  Plant a crop",
                "Click on a grown crop  —  Harvest it",
                "Unlock achievements to get new customized game content!",
            ].join("\n\n"), {
                ...TEXT_STYLE,
                color: "#e0d0f0",
                align: "center",
            })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setScale(2)
            .setDepth(TutorialPane.DEPTH + 2);

        this.setAllVisible(false);

        if (!localStorage.getItem(STORAGE_KEY)) {
            this.show();
        }

        scene.input.on("pointerdown", this.close, this);
        scene.input.keyboard!.on("keydown", this.close, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private show(): void {
        this.panel.clear();
        this.panel.fillStyle(0x1a1020, 0.95);
        this.panel.fillRoundedRect(280, 200, 1360, 740, 12);
        this.panel.lineStyle(2, 0xf0c070, 1);
        this.panel.strokeRoundedRect(280, 200, 1360, 740, 12);
        this.setAllVisible(true);
        this.visible = true;
    }

    private close(): void {
        if (!this.visible) return;
        localStorage.setItem(STORAGE_KEY, "true");
        this.setAllVisible(false);
        this.visible = false;
    }

    private setAllVisible(visible: boolean): void {
        this.overlay.setVisible(visible);
        this.panel.setVisible(visible);
        this.titleText.setVisible(visible);
        this.bodyText.setVisible(visible);
    }

    private destroy(): void {
        this.scene.input.off("pointerdown", this.close, this);
        this.scene.input.keyboard!.off("keydown", this.close, this);
        this.overlay.destroy();
        this.panel.destroy();
        this.titleText.destroy();
        this.bodyText.destroy();
    }
}
