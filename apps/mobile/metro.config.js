// O metro-config do Expo já detecta o workspace do monorepo sozinho: acha o
// packages/core pelo watchFolders e resolve o node_modules hoisted da raiz.
// Overrides manuais aqui (watchFolders, disableHierarchicalLookup) são
// desnecessários e o expo-doctor reclama deles com razão.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
