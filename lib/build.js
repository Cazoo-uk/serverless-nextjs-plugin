const nextBuild = require("next/dist/build").default;
const path = require("path");
const fse = require("fs-extra");
const parseNextConfiguration = require("./parseNextConfiguration");
const logger = require("../utils/logger");
const copyBuildFiles = require("./copyBuildFiles");
const getNextPagesFromBuildDir = require("./getNextPagesFromBuildDir");
const rewritePageHandlers = require("./rewritePageHandlers");

const overrideTargetIfNotServerless = nextConfiguration => {
  if (nextConfiguration.target !== "serverless") {
    logger.log(
      `Target "${
        nextConfiguration.target
      }" found! Overriding it with serverless`
    );
    nextConfiguration.target = "serverless";
  }
};

module.exports = async (
  pluginBuildDir,
  pageConfig,
  customHandler,
  omitErrorPage
) => {
  logger.log("Started building next app ...");

  const nextConfigDir = pluginBuildDir.nextConfigDir;
  const { nextConfiguration } = await parseNextConfiguration(nextConfigDir);

  overrideTargetIfNotServerless(nextConfiguration);

  await nextBuild(path.resolve(nextConfigDir), nextConfiguration);
  await copyBuildFiles(
    path.join(nextConfigDir, nextConfiguration.distDir),
    pluginBuildDir
  );

  if (customHandler) {
    await fse.copy(
      path.resolve(nextConfigDir, customHandler),
      path.join(pluginBuildDir.buildDir, customHandler)
    );
  }

  let nextPages = await getNextPagesFromBuildDir(
    pluginBuildDir.buildDir,
    pageConfig,
    customHandler ? [path.basename(customHandler)] : undefined
  );

  if (omitErrorPage) {
    nextPages = nextPages.filter(page => page.pageName != "_error");
  }

  await rewritePageHandlers(nextPages, customHandler);

  return nextPages;
};
