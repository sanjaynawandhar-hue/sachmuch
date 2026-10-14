const { getDefaultConfig } = require('expo/metro-config');
// Expo detects pnpm workspaces and resolves native modules consistently.
module.exports = getDefaultConfig(__dirname);
