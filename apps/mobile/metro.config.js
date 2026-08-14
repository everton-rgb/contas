// Metro num monorepo: precisa enxergar packages/core, que fica fora de apps/mobile.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const raizProjeto = __dirname;
const raizWorkspace = path.resolve(raizProjeto, '../..');

const config = getDefaultConfig(raizProjeto);

config.watchFolders = [raizWorkspace];
config.resolver.nodeModulesPaths = [
  path.resolve(raizProjeto, 'node_modules'),
  path.resolve(raizWorkspace, 'node_modules'),
];
// Sem isto, uma dependência duplicada em dois níveis vira duas cópias do React.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
