const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// The shell is intentionally NOT an npm workspace of the repo root, so it has
// its own node_modules and nothing is hoisted past it. What enforces that
// isolation at native-build time is `expo.autolinking.searchPaths` in
// package.json -- NOT anything here. Expo autolinking and Metro resolution are
// separate mechanisms, and only the former decides which native modules get
// linked into the build.
//
// Notably we do NOT set resolver.disableHierarchicalLookup. It sounds like the
// right isolation knob and is not: npm nests conflicting versions
// (node_modules/expo/node_modules/expo-asset), and disabling hierarchical
// lookup makes Metro refuse to look there at all, so the bundle fails on
// dependencies that are correctly installed.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(workspaceRoot, "packages/shared");

const config = getDefaultConfig(projectRoot);

// @aiw/shared is resolved by path rather than npm, since it lives outside this
// package's install graph. It must stay dependency-free for this to hold.
config.watchFolders = [sharedRoot];
config.resolver.extraNodeModules = {
  "@aiw/shared": sharedRoot,
};

module.exports = config;
