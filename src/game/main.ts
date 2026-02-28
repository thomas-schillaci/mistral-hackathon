import {Game as MainGame} from './scenes/Game';
import {AUTO, Game} from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scene: MainGame,
};

const StartGame = (parent: string) => {
    return new Game({...config, parent});
}

export default StartGame;
