// Attach all necessary functions to the global window object to avoid breaking HTML event handlers (onclick etc.)
// This is necessary because Vite bundles JS files as ESM modules with their own scope.

import * as api from './js/api.js';
import * as utils from './js/utils.js';
import * as socket from './js/socket.js';
import * as auth from './js/auth.js';
import * as onboarding from './js/onboarding.js';
import * as chat from './js/chat.js';
import * as feed from './js/feed.js';
import * as discover from './js/discover.js';
import * as profile from './js/profile.js';
import * as events from './js/events.js';
import * as app from './js/app.js';

// Flattening all exports onto window
const allModules = [api, utils, socket, auth, onboarding, chat, feed, discover, profile, events, app];

allModules.forEach(mod => {
  Object.keys(mod).forEach(key => {
    window[key] = mod[key];
  });
});

console.log('SkillConnect Globals Attached');
