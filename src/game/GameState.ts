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

type SavedState = Record<string, unknown> & { plantedCrops: CropState[]; playerX?: number; playerY?: number };

export function saveState(registry: Phaser.Data.DataManager, extra: Record<string, unknown> = {}): void {
    const state: Record<string, unknown> = {};
    for (const key of PERSIST_KEYS) {
        state[key] = registry.get(key);
    }
    state.plantedCrops = Crop.serialize();
    Object.assign(state, extra);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setupHotReloadSave(registry: Phaser.Data.DataManager, getExtra: () => Record<string, unknown>): void {
    if (import.meta.hot) {
        import.meta.hot.on('vite:beforeFullReload', () => {
            saveState(registry, getExtra());
        });
    }
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
