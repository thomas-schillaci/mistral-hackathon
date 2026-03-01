import { Scene } from "phaser";
import { TEXT_STYLE } from "./styles";
import type { Achievement } from "../systems/AchievementSystem";

export type { Achievement };

export class AchievementPane {
    static readonly REGISTRY_KEY = "unlockedAchievements";

    private static readonly HUD_SCALE = 2;
    private static readonly MARGIN = 18;
    // GoldCounter: y=18, scale=3, (fontSize 16 + padding.y*2=6) * 3 = 66px tall → bottom at 84
    private static readonly START_Y = 92;
    // Per-row display height at scale 2: (fontSize 16 + padding.y*2=6) * 2 = 44px
    private static readonly ROW_HEIGHT = 44;
    private static readonly ROW_GAP = 4;

    private readonly scene: Scene;
    private readonly achievements: Achievement[];
    private readonly rows: Phaser.GameObjects.Text[];

    constructor(scene: Scene, achievements: Achievement[]) {
        this.scene = scene;
        this.achievements = achievements;

        this.rows = achievements.map((achievement, i) => {
            const y = AchievementPane.START_Y + i * (AchievementPane.ROW_HEIGHT + AchievementPane.ROW_GAP);
            return scene.add
                .text(0, y, `[ ] ${achievement.label}`, {
                    ...TEXT_STYLE,
                    color: "#aaaaaa",
                    backgroundColor: "#1f1f1ff2",
                    padding: { x: 4, y: 3 },
                })
                .setOrigin(1, 0)
                .setScrollFactor(0)
                .setScale(AchievementPane.HUD_SCALE)
                .setDepth(100001);
        });

        this.layout();

        scene.registry.events.on(`changedata-${AchievementPane.REGISTRY_KEY}`, this.onUnlockedChanged, this);
        scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private onUnlockedChanged(_parent: unknown, unlocked: string[]): void {
        this.achievements.forEach((achievement, i) => {
            const done = unlocked.includes(achievement.id);
            this.rows[i]
                .setText(`${done ? "[x]" : "[ ]"} ${achievement.label}`)
                .setStyle({ color: done ? "#88dd88" : "#aaaaaa" });
        });
    }

    private layout(): void {
        const x = this.scene.scale.width - AchievementPane.MARGIN;
        this.rows.forEach(row => row.setX(x));
    }

    private destroy(): void {
        this.scene.registry.events.off(`changedata-${AchievementPane.REGISTRY_KEY}`, this.onUnlockedChanged, this);
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.rows.forEach(row => row.destroy());
    }
}
