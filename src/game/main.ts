import {Game as MainGame} from './scenes/Game';
import {Hud} from './scenes/Hud';
import {AUTO, Game, Scale} from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#028af8',
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [MainGame, Hud]
};

const StartGame = (parent: string) => {
    return new Game({...config, parent});
}

export default StartGame;