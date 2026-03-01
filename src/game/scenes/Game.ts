import {Scene} from "phaser";
import {configureCamera, updateCameraDeadZone} from "../systems/Camera";
import {createMap, preloadMap} from "../systems/Map";
import {handleTileClick, updateTileOutline} from "../systems/TileInteraction";
import {Character} from "../entities/Character";
import {Crop, CropType} from "../entities/Crop";
import {NPC, NpcDefinition} from "../entities/NPC";
import {PlayerCharacter} from "../entities/PlayerCharacter";
import {Shopkeeper} from "../entities/Shopkeeper";
import {UserProfile} from "../UserProfile";
import {preloadAchievements, registerAchievements} from '../systems/AchievementSystem';
import {feature} from '../feature';
import {restoreState, setupHotReloadSave} from '../GameState';
import type {GameAPI} from '../GameAPI';

const NPCS: NpcDefinition[] = [
    {
        name: "Thomas",
        textureKey: "thomas",
        basePath: "assets/Characters/Alex",
        x: 50 * 16,
        y: 24 * 16,
        speed: 0
    },
    {
        name: "Lyria",
        textureKey: "lyria",
        basePath: "assets/Characters/Lyria",
        x: 24 * 16,
        y: 31 * 16,
        speed: 0
    },
    {
        name: "Manu",
        textureKey: "manu",
        basePath: "assets/Characters/Manu",
        x: 54 * 16,
        y: 7 * 16,
        speed: 0
    },
    {
        name: "Tori",
        textureKey: "tori",
        basePath: "assets/Characters/Tori",
        x: 37 * 16,
        y: 15 * 16,
        speed: 0
    }
];

export class Game extends Scene implements GameAPI {
    private tileOutline!: Phaser.GameObjects.Image;
    private baseLayer!: Phaser.Tilemaps.TilemapLayer;
    private worldLayer!: Phaser.Tilemaps.TilemapLayer;
    private tileWidth = 16;
    private tileHeight = 16;

    public player!: PlayerCharacter;
    public npcs: NPC[] = [];
    private activeNpc: NPC | null = null;

    public shopkeeper!: Shopkeeper;
    private activeShopkeeper: Shopkeeper | null = null;

    private userProfile!: UserProfile;

    private debugKey!: Phaser.Input.Keyboard.Key;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private isConversationOpen = false;
    // The DialoguePane (in the Hud scene) can also write conversationOpen=false when
    // the player selects a closing option. This listener lets that trigger a proper
    // close (unpausing characters etc.) without the DialoguePane needing a direct
    // reference to this scene.
    // The _settingFromGame flag prevents a re-entrancy loop: registry.set() fires
    // changedata events synchronously, so without the guard, setConversationOpen()
    // would trigger this listener, which would call setConversationOpen() again, ad infinitum.
    private _settingFromGame = false;

    constructor() {
        super("Game");
    }

    preload() {
        preloadMap(this.load);
        this.load.image('tile-outline', 'assets/UI/outline.png');
        preloadAchievements(this.load);
        Crop.preloadSpritesheet(this.load);
        Character.preloadSpritesheets(this.load, "player", "assets/Characters/Player");
        NPC.preloadAll(this.load, NPCS);
        Shopkeeper.preload(this.load);
        this.load.json("alex-dialogue", "assets/dialogue/alex.json");
        feature.onPreload(this);
    }

    create() {
        const {
            baseLayer,
            worldLayer,
            collisionsLayer,
            tileWidth,
            tileHeight,
            worldWidth,
            worldHeight
        } = createMap(this);

        this.baseLayer = baseLayer;
        this.worldLayer = worldLayer;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.player = new PlayerCharacter(this, 15 * 16, 16 * 8);

        // Spawn positions are relative to the map centre; add more entries to NPCS above to add characters.
        this.npcs = NPCS.map(def => new NPC(this, def));
        this.shopkeeper = new Shopkeeper(this, 33*16, 5*16);

        this.registry.set("selectedCropType", "strawberry");
        this.registry.set("gold", 0);
        this.registry.set("cropCounts", {strawberry: 5, leek: 0, potato: 0, onion: 0});
        this.registry.set("conversationOpen", false);
        this.registry.set("conversationNpc", null);
        this.registry.set("conversationDialogue", null);
        this.registry.set("shopOpen", false);
        this.registry.set("cropsHarvested", {strawberry: 0, leek: 0, potato: 0, onion: 0});
        this.registry.set("dialogueHistory", []);
        this.registry.set("gameStartedAt", Date.now());
        this.registry.set("npcsTalkedTo", [] as string[]);
        this.registry.set("totalNpcCount", NPCS.length);
        this.registry.set("cardsOpen", false);
        this.registry.set("pendingCards", []);
        this.registry.set("dialoguePendingAction", null);
        this.registry.set("unlockedAchievements", [] as string[]);
        this.registry.set("cropGrowthMultiplier", 1);

        const savedState = restoreState(this.registry);
        if (savedState?.plantedCrops) {
            Crop.restore(this, savedState.plantedCrops);
        }
        if (savedState?.playerX !== undefined && savedState?.playerY !== undefined) {
            this.player.sprite.setPosition(savedState.playerX, savedState.playerY);
        }

        this.userProfile = new UserProfile(this);
        registerAchievements(this, this.onAchievement.bind(this));
        setupHotReloadSave(this.registry, () => ({
            playerX: this.player.sprite.x,
            playerY: this.player.sprite.y,
        }));

        this.registry.events.on("changedata-conversationOpen", (_: unknown, value: boolean) => {
            if (this._settingFromGame) return;
            if (!value && this.isConversationOpen) this.setConversationOpen(false);
        });

        this.registry.events.on("changedata-shopOpen", (_: unknown, value: boolean) => {
            if (this._settingFromGame) return;
            if (!value && this.isConversationOpen) this.setShopOpen(false);
        });

        this.registry.events.on("changedata-gold", (_: unknown, newAmount: number) => {
            feature.onGoldChanged(this, newAmount);
        });

        this.registry.events.on("changedata-dialoguePendingAction", (_: unknown, action: string | null) => {
            if (!action) return;
            this.registry.set("dialoguePendingAction", null);
            if (action === "openShop") {
                this.activeShopkeeper = this.shopkeeper;
                this.setShopOpen(true);
            }
        });

        let prevAchievementCount = (this.registry.get("unlockedAchievements") as string[]).length;
        this.registry.events.on("changedata-unlockedAchievements", (_: unknown, unlocked: string[]) => {
            if (unlocked.length > prevAchievementCount) {
                feature.onAchievementUnlocked(this, unlocked[unlocked.length - 1]);
            }
            prevAchievementCount = unlocked.length;
        });

        if (!this.scene.isActive("Hud")) {
            this.scene.launch("Hud");
        }
        this.scene.bringToTop("Hud");

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        if (collisionsLayer) {
            collisionsLayer.setCollisionByExclusion([-1, 0]);
            this.physics.add.collider(this.player.sprite, collisionsLayer);
            for (const npc of this.npcs) {
                this.physics.add.collider(npc.sprite, collisionsLayer);
            }
            this.physics.add.collider(this.shopkeeper.sprite, collisionsLayer);
        }

        const camera = this.cameras.main;
        configureCamera(camera, this.player.sprite, worldWidth, worldHeight);

        this.tileOutline = this.add.image(0, 0, 'tile-outline');
        this.tileOutline.setOrigin(0, 0);
        this.tileOutline.setDepth(100000);

        this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            handleTileClick(pointer, this, this.worldLayer, this.player.sprite, this.tileWidth, this.tileHeight, () => this.isConversationOpen);
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, () => {
            updateCameraDeadZone(camera);
        });

        feature.onCreate(this);
    }

    onAchievement() {
        fetch('/api/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(this.userProfile.toJSON()),
        }).then(res => {
            if (!res.ok) {
                res.json().then(body => console.error('[ANALYZE] Server error:', body)).catch(() => {
                });
                console.error(`[ANALYZE] Request failed with status ${res.status}`);
                return;
            }
            res.json().then(body => {
                const cards = body["cards"];
                this.registry.set("pendingCards", cards);
                this.registry.set("cardsOpen", true);
            });
        }).catch(err => console.error('[ANALYZE] Network error:', err));
    }

    update(_time: number, delta: number) {
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.tryOpenConversation();
        }

        if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
            this.debug();
        }

        feature.onUpdate(this, delta);

        this.player.update(delta);
        for (const npc of this.npcs) {
            npc.update(delta);
        }
        this.shopkeeper.update(delta);
        const growthMultiplier = this.registry.get("cropGrowthMultiplier") as number;
        Crop.updateAll(delta * growthMultiplier);

        updateTileOutline(this, this.tileOutline, this.player.sprite, this.tileWidth, this.tileHeight);
    }

    addGold(amount: number): void {
        const current = this.registry.get("gold") as number;
        this.registry.set("gold", current + amount);
    }

    addCrops(type: CropType, count: number): void {
        const counts = {...(this.registry.get("cropCounts") as Record<CropType, number>)};
        counts[type] = (counts[type] ?? 0) + count;
        this.registry.set("cropCounts", counts);
    }

    unlockAchievement(id: string): void {
        const unlocked = this.registry.get("unlockedAchievements") as string[];
        if (!unlocked.includes(id)) {
            this.registry.set("unlockedAchievements", [...unlocked, id]);
        }
    }

    teleportPlayer(x: number, y: number): void {
        this.player.sprite.setPosition(x, y);
    }

    setCropGrowthMultiplier(multiplier: number): void {
        this.registry.set("cropGrowthMultiplier", multiplier);
    }

    private debug() {
        console.log(this.userProfile.toJSON());
    }

    private tryOpenConversation() {
        if (this.isConversationOpen) {
            return;
        }

        // Find the nearest interactable character within range.
        let nearestNpc: NPC | null = null;
        let nearestShopkeeper: Shopkeeper | null = null;
        let nearestDist = Infinity;

        for (const npc of this.npcs) {
            const dist = Phaser.Math.Distance.Between(
                this.player.sprite.x, this.player.sprite.y,
                npc.sprite.x, npc.sprite.y
            );
            if (dist <= 24 && dist < nearestDist) {
                nearestNpc = npc;
                nearestShopkeeper = null;
                nearestDist = dist;
            }
        }

        const shopkeeperDist = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            this.shopkeeper.sprite.x, this.shopkeeper.sprite.y
        );
        if (shopkeeperDist <= 24 && shopkeeperDist < nearestDist) {
            nearestShopkeeper = this.shopkeeper;
            nearestNpc = null;
        }

        if (nearestShopkeeper) {
            this.openShopkeeperPrompt(nearestShopkeeper);
        } else if (nearestNpc) {
            this.activeNpc = nearestNpc;
            this.setConversationOpen(true);
        }
    }

    private buildShopkeeperScript() {
        const alexScript = this.cache.json.get("alex-dialogue") as Array<{ text: string; options?: Array<{ label: string; next: number | null }> }>;
        const shifted = alexScript.map(line => ({
            ...line,
            options: line.options?.map(opt => ({
                ...opt,
                next: opt.next !== null ? opt.next + 1 : null,
            })),
        }));
        return [
            {
                text: "Well, hello there! What can I do for you today?",
                options: [
                    { label: "I'd like to see what you've got.", action: "openShop" },
                    { label: "Just wanted to chat.", next: 1 },
                ],
            },
            ...shifted,
        ];
    }

    private openShopkeeperPrompt(shopkeeper: Shopkeeper): void {
        this.isConversationOpen = true;
        this.player.setPaused(true);
        this.activeShopkeeper = shopkeeper;
        shopkeeper.setPaused(true);
        this._settingFromGame = true;
        this.registry.set("conversationNpc", { name: "Alex", textureKey: "shopkeeper" });
        this.registry.set("conversationDialogue", this.buildShopkeeperScript());
        this.registry.set("conversationOpen", true);
        this._settingFromGame = false;
    }

    public setConversationOpen(open: boolean) {
        this.isConversationOpen = open;
        this.player.setPaused(open);
        if (this.activeNpc) {
            this.activeNpc.setPaused(open);
        }
        if (this.activeShopkeeper) {
            this.activeShopkeeper.setPaused(open);
        }
        if (open && this.activeNpc) {
            feature.onNpcTalkStart(this, this.activeNpc.name);
        } else if (!open && this.activeNpc) {
            feature.onConversationEnd(this, this.activeNpc.name);
        }
        if (!open) {
            this.activeNpc = null;
            this.activeShopkeeper = null;
        }
        // Flag must wrap the registry write because changedata fires synchronously
        // inside registry.set() — the listener would otherwise re-enter this method.
        this._settingFromGame = true;
        if (open && this.activeNpc) {
            const npcDef = NPCS.find(d => d.textureKey === this.activeNpc!.textureKey)!;
            const dialogue = this.cache.json.get(NPC.dialogueKey(npcDef));
            // Tell the DialoguePane which NPC we're talking to and supply its dialogue.
            this.registry.set("conversationNpc", {
                name: this.activeNpc.name,
                textureKey: this.activeNpc.textureKey,
            });
            this.registry.set("conversationDialogue", dialogue);
        }
        this.registry.set("conversationOpen", open);
        this._settingFromGame = false;
    }

    public setShopOpen(open: boolean) {
        this.isConversationOpen = open;
        this.player.setPaused(open);
        if (this.activeShopkeeper) {
            this.activeShopkeeper.setPaused(open);
        }
        if (!open) {
            this.activeShopkeeper = null;
        }
        this._settingFromGame = true;
        this.registry.set("shopOpen", open);
        this._settingFromGame = false;
        if (open) {
            feature.onShopOpen(this);
        } else {
            feature.onShopClose(this);
        }
    }
}
