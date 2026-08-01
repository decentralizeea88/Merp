import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import './styles/select.css';
import './styles/board.css';
import './styles/jigsaw.css';
import './styles/win.css';
import './styles/artdev.css';
import { mountShell, registerScreen, navigate } from './app/shell';
import { splashScreen } from './app/splash';
import { homeScreen } from './app/home';
import { selectScreen } from './app/select';
import { boardScreen } from './app/board';
import { jigsawScreen } from './app/jigsaw';
import { galleryScreen } from './app/gallery';
import { settingsScreen } from './app/settings';
import { artDevScreen } from './app/artdev';

const app = document.getElementById('app');
if (app) {
  mountShell(app);
  registerScreen('splash', splashScreen);
  registerScreen('home', homeScreen);
  registerScreen('select', selectScreen);
  registerScreen('board', boardScreen);
  registerScreen('jigsaw', jigsawScreen);
  registerScreen('gallery', galleryScreen);
  registerScreen('settings', settingsScreen);
  registerScreen('art', artDevScreen);

  const openFromHash = (): void => {
    const [name, query] = location.hash.replace(/^#/, '').split('?');
    if (name && name !== 'splash') {
      navigate(name, Object.fromEntries(new URLSearchParams(query ?? '')));
    } else {
      navigate('splash');
    }
  };
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
}
