import './style.css';
import { Game } from './game/game.js';
import { Save } from './core/save.js';
import { UI } from './ui/ui.js';
import './ui/screens.js';
import { SandboxState } from './game/states/sandbox.js';
import { TitleState } from './game/states/title.js';
import { HubState } from './game/states/hub.js';
import { RunState } from './game/states/run.js';
import { InterludeState } from './game/states/interlude.js';
import { RunEndState } from './game/states/runend.js';
import { EndingState } from './game/states/ending.js';
import { Run } from './game/run.js';
import { installDebug, installBot } from './debug.js';
import { AudioEngine } from './audio/index.js';

Save.load();
const game = new Game(document.getElementById('game'));
game.ui = new UI(game);
game.audio = new AudioEngine(game);
window.__game = game;
installDebug(game);
installBot(game);
game.addState('sandbox', new SandboxState());
game.addState('title', new TitleState());
game.addState('hub', new HubState());
game.addState('run', new RunState());
game.addState('interlude', new InterludeState());
game.addState('runEnd', new RunEndState());
game.addState('ending', new EndingState());

const q = new URLSearchParams(location.search);
if (q.has('sandbox')) game.setState('sandbox', { circle: Number(q.get('c') || 0), type: q.get('t') || 'combat', boss: q.get('boss') });
else if (q.has('run')) {
  game.run = new Run({ weapon: q.get('w') || 'espada' });
  game.setState('run', { circle: Number(q.get('c') || 0) });
} else if (q.has('hub')) game.setState('hub', {});
else game.setState('title', {});
game.start();
