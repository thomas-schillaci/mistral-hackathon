import { Scene } from "phaser";
import { TEXT_STYLE } from "./styles";
import type { Achievement } from "../systems/AchievementSystem";

export type { Achievement };

export class AchievementPane {
    static readonly REGISTRY_KEY = "unlockedAchievements";

    private static readonly HUD_SCALE = 2;
    private static readonly MARGIN = 18;
    // Per-row display height at scale 2: (fontSize 16 + padding.y*2=6) * 2 = 44px
    private static readonly ROW_HEIGHT = 44;
    private static readonly ROW_GAP = 4;

    private readonly scene: Scene;
    private readonly achievements: Achievement[];
    private readonly title: Phaser.GameObjects.Text;
    private readonly rows: Phaser.GameObjects.Text[];

    constructor(scene: Scene, achievements: Achievement[]) {
        this.scene = scene;
        this.achievements = achievements;

        this.title = scene.add
            .text(0, 0, "Achievements", {
                ...TEXT_STYLE,
                color: "#ffffff",
                backgroundColor: "#1f1f1ff2",
                padding: { x: 4, y: 3 },
            })
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setScale(AchievementPane.HUD_SCALE)
            .setDepth(100001);

        this.rows = achievements.map((achievement) => {
            return scene.add
                .text(0, 0, `${achievement.label} [ ]`, {
                    ...TEXT_STYLE,
                    color: "#aaaaaa",
                    backgroundColor: "#1f1f1ff2",
                    padding: { x: 4, y: 3 },
                })
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setScale(AchievementPane.HUD_SCALE)
                .setDepth(100001);
        });

        this.layout();

        const alreadyUnlocked = scene.registry.get(AchievementPane.REGISTRY_KEY) as string[] ?? [];
        if (alreadyUnlocked.length > 0) {
            this.onUnlockedChanged(null, alreadyUnlocked);
        }

        scene.registry.events.on(`changedata-${AchievementPane.REGISTRY_KEY}`, this.onUnlockedChanged, this);
        scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private onUnlockedChanged(_parent: unknown, unlocked: string[]): void {
        this.achievements.forEach((achievement, i) => {
            const done = unlocked.includes(achievement.id);
            this.rows[i]
                .setText(`${achievement.label} ${done ? "[x]" : "[ ]"}`)
                .setStyle({ color: done ? "#88dd88" : "#aaaaaa" });
        });
    }

    private layout(): void {
        const { MARGIN, ROW_HEIGHT, ROW_GAP } = AchievementPane;
        const n = this.achievements.length;
        const totalHeight = (n + 1) * ROW_HEIGHT + n * ROW_GAP;
        const startY = this.scene.scale.height - MARGIN - totalHeight;
        const x = MARGIN;

        this.title.setPosition(x, startY);
        this.rows.forEach((row, i) => {
            row.setPosition(x, startY + (i + 1) * (ROW_HEIGHT + ROW_GAP));
        });
    }

    private destroy(): void {
        this.scene.registry.events.off(`changedata-${AchievementPane.REGISTRY_KEY}`, this.onUnlockedChanged, this);
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.title.destroy();
        this.rows.forEach(row => row.destroy());
    }
}
