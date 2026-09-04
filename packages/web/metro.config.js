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

// Alias @aiw/shared explicitly rather than leaning on its package.json
// "exports" map: SDK 52's Metro doesn't enable package exports by default, and
// TypeScript here inherits expo/tsconfig.base's classic moduleResolution, which
// ignores them outright. Pointing at src/ means "@aiw/shared/bridge" resolves
// to src/bridge/index.ts under both. Mirrored in tsconfig.json's paths, and in
// packages/shell/metro.config.js.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@aiw/shared": path.resolve(workspaceRoot, "packages/shared/src"),
};

module.exports = config;
