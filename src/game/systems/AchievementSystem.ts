import { Scene } from "phaser";

export interface Achievement {
    id: string;
    label: string;
    condition: string;
}

type Evaluator = {
    registryKey: string;
    check: (value: unknown) => boolean;
};

const EVALUATORS: Record<string, Evaluator> = {
    npcsTalkedToMin1: {
        registryKey: "npcsTalkedTo",
        check: (v) => (v as string[]).length >= 1,
    },
};

export function preloadAchievements(load: Phaser.Loader.LoaderPlugin): void {
    load.json("achievements", "assets/achievements.json");
}

export function registerAchievements(scene: Scene): void {
    const achievements = scene.cache.json.get("achievements") as Achievement[];

    for (const achievement of achievements) {
        const evaluator = EVALUATORS[achievement.condition];
        if (!evaluator) continue;

        scene.registry.events.on(
            `changedata-${evaluator.registryKey}`,
            (_: unknown, value: unknown) => {
                if (!evaluator.check(value)) return;
                const unlocked = scene.registry.get("unlockedAchievements") as string[];
                if (!unlocked.includes(achievement.id)) {
                    scene.registry.set("unlockedAchievements", [...unlocked, achievement.id]);
                }
            }
        );
    }
}
