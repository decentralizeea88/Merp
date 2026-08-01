import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import { mountShell, registerScreen, navigate, el } from './app/shell';
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
  navigate('home');
}
