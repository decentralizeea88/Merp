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
import { dailyScreen } from './app/daily';
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
  registerScreen('daily', dailyScreen);
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
