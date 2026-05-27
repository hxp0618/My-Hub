import Browser from 'webextension-polyfill';
import { createLogger } from '../../utils/logger';

const logger = createLogger('[DevTools]');

Browser
  .devtools
  .panels
  .create('Dev Tools', 'icon-32.png', 'src/pages/devtools/index.html')
  .catch(error => logger.error('Failed to create DevTools panel', error));
