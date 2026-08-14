const { withAppBuildGradle, withSettingsGradle } = require('expo/config-plugins');

// Android Studio's (and some CI runners') Gradle daemon launches without the
// shell's PATH, so a bare "node" command fails to spawn when node is managed
// by nvm/volta and isn't on a standard system PATH. Resolves the real
// absolute path via a login shell once at config time, falling back to plain
// "node" when it's already on PATH normally (e.g. most CI images).
const NODE_BINARY_SNIPPET = `
def nodeBinary = {
  try {
    def resolved = ["/bin/zsh", "-lc", "command -v node"].execute(null, rootDir).text.trim()
    return resolved ?: "node"
  } catch (Exception e) {
    return "node"
  }
}()
`;

function withAppBuildGradleNodeBinary(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('def nodeBinary')) {
      return config;
    }
    let contents = config.modResults.contents;
    contents = contents.replace(
      /(def projectRoot = rootDir\.getAbsoluteFile\(\)\.getParentFile\(\)\.getAbsolutePath\(\))/,
      `$1\n${NODE_BINARY_SNIPPET}`
    );
    contents = contents.replace(/\["node",/g, '[nodeBinary,');
    contents = contents.replace(/react\s*\{/, (match) => `${match}\n    nodeExecutableAndArgs = [nodeBinary]`);
    config.modResults.contents = contents;
    return config;
  });
}

function withSettingsGradleNodeBinary(config) {
  return withSettingsGradle(config, (config) => {
    if (config.modResults.contents.includes('def nodeBinary')) {
      return config;
    }
    let contents = config.modResults.contents;
    contents = contents.replace(
      /(pluginManagement\s*\{)/,
      `$1\n  def nodeBinary = {\n    try {\n      def resolved = ["/bin/zsh", "-lc", "command -v node"].execute(null, rootDir).text.trim()\n      return resolved ?: "node"\n    } catch (Exception e) {\n      return "node"\n    }\n  }()\n`
    );
    contents = contents.replace(/commandLine\("node",/g, 'commandLine(nodeBinary,');
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withNodeBinaryFix(config) {
  config = withAppBuildGradleNodeBinary(config);
  config = withSettingsGradleNodeBinary(config);
  return config;
};
