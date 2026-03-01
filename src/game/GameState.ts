import { Crop, CropState } from './entities/Crop';

const STORAGE_KEY = 'gameState';

const PERSIST_KEYS = [
    'gold',
    'cropCounts',
    'cropsHarvested',
    'npcsTalkedTo',
    'unlockedAchievements',
    'dialogueHistory',
    'gameStartedAt',
] as const;

type SavedState = Record<string, unknown> & { plantedCrops: CropState[] };

export function saveState(registry: Phaser.Data.DataManager): void {
    const state: Record<string, unknown> = {};
    for (const key of PERSIST_KEYS) {
        state[key] = registry.get(key);
    }
    state.plantedCrops = Crop.serialize();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function restoreState(registry: Phaser.Data.DataManager): SavedState | null {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved) as SavedState;
    for (const key of PERSIST_KEYS) {
        if (key in state) registry.set(key, state[key]);
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return state;
}
