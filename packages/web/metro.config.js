const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Monorepo config. npm workspaces hoist most dependencies to the repo-root
// node_modules, which is outside Metro's default project root -- so without
// this, resolution fails for every hoisted package.
//
// Deliberately NOT setting resolver.disableHierarchicalLookup: under npm
// hoisting, version conflicts are resolved by NESTING
// (packages/web/node_modules/foo/node_modules/bar@1 alongside root bar@2).
// Disabling hierarchical lookup makes Metro ignore those nested resolutions and
// hand every requester the nodeModulesPaths copy -- i.e. silently the wrong
// version of a transitive dep.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
