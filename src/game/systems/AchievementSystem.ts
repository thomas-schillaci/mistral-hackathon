import {Scene} from "phaser";

export interface Achievement {
    id: string;
    label: string;
    condition: string;
}

type Evaluator = {
    registryKey: string;
    check: (value: unknown, scene: Scene) => boolean;
};

const EVALUATORS: Record<string, Evaluator> = {
    npcsTalkedToMin1: {
        registryKey: "npcsTalkedTo",
        check: (v) => (v as string[]).length >= 1,
    },
    harvest5Crops: {
        registryKey: "cropsHarvested",
        check: (v) => Object.values(v as Record<string, number>).reduce((sum, n) => sum + n, 0) >= 5,
    },
    harvest5OfEachType: {
        registryKey: "cropsHarvested",
        check: (v) => Object.values(v as Record<string, number>).every(n => n >= 5),
    },
    earn100Gold: {
        registryKey: "gold",
        check: (v) => (v as number) >= 100,
    },
    talkToAllVillagers: {
        registryKey: "npcsTalkedTo",
        check: (v, scene) => (v as string[]).length >= (scene.registry.get("totalNpcCount") as number),
    },
    earn1000Gold: {
        registryKey: "gold",
        check: (v) => (v as number) >= 1000,
    },
};

export function preloadAchievements(load: Phaser.Loader.LoaderPlugin): void {
    load.json("achievements", "assets/achievements.json");
}

export function registerAchievements(scene: Scene, onAchievement: ()=>void): void {
    const achievements = scene.cache.json.get("achievements") as Achievement[];

    for (const achievement of achievements) {
        const evaluator = EVALUATORS[achievement.condition];
        if (!evaluator) continue;

        scene.registry.events.on(
            `changedata-${evaluator.registryKey}`,
            (_: unknown, value: unknown) => {
                if (!evaluator.check(value, scene)) return;
                const unlocked = scene.registry.get("unlockedAchievements") as string[];
                if (!unlocked.includes(achievement.id)) {
                    scene.registry.set("unlockedAchievements", [...unlocked, achievement.id]);
                    onAchievement();
                }
            }
        );
    }
}
