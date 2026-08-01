import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import './styles/board.css';
import './styles/win.css';
import './styles/artdev.css';
import { mountShell, registerScreen, navigate, el } from './app/shell';
import { artDevScreen } from './app/artdev';
import { boardScreen } from './app/board';
import { t } from './i18n/am';

/* Phase 1 placeholder home — replaced by the real screen set in Phase 4. */
const homeScreen = (): HTMLElement => {
  const screen = el('main', 'home');
  const title = el('h1', 'home__title type-display', t('app.title'));
  const sub = el('p', 'home__sub type-caption', t('mode.sliding.desc'));
  screen.append(title, sub);
  return screen;
};

const app = document.getElementById('app');
if (app) {
  mountShell(app);
  registerScreen('home', homeScreen);
  registerScreen('art', artDevScreen);
  registerScreen('board', boardScreen);
  if (location.hash === '#art') navigate('art');
  else if (location.hash.startsWith('#board')) {
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
    navigate('board', Object.fromEntries(q));
  } else navigate('home');
}
