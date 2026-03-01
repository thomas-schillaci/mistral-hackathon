import type { GameAPI } from './GameAPI';
import type { CropType } from './entities/Crop';

export const feature = {
    onPreload: (_scene: GameAPI) => {},

    onCreate: (_scene: GameAPI) => {},

    onUpdate: (_scene: GameAPI, _delta: number) => {},

    onNpcTalkStart: (_scene: GameAPI, _npcId: string) => {},

    onConversationEnd: (_scene: GameAPI, _npcId: string) => {},

    onCropPlanted: (_scene: GameAPI, _tileX: number, _tileY: number, _cropType: CropType) => {},

    onCropHarvested: (_scene: GameAPI, _cropType: CropType, _goldEarned: number) => {},

    onGoldChanged: (_scene: GameAPI, _newAmount: number) => {},

    onShopOpen: (_scene: GameAPI) => {},

    onShopClose: (_scene: GameAPI) => {},

    onAchievementUnlocked: (_scene: GameAPI, _achievementId: string) => {},
};