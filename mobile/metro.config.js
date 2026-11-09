const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, "../packages/shared");
config.watchFolders = [shared];
config.resolver.extraNodeModules = { "@shared": path.join(shared, "src") };
module.exports = config;
