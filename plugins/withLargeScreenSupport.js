const { withAndroidManifest } = require("@expo/config-plugins");

function isLauncherActivity(activity) {
  return activity["intent-filter"]?.some((filter) => {
    const actions = filter.action ?? [];
    const categories = filter.category ?? [];

    const hasMainAction = actions.some(
      (action) => action.$?.["android:name"] === "android.intent.action.MAIN"
    );
    const hasLauncherCategory = categories.some(
      (category) => category.$?.["android:name"] === "android.intent.category.LAUNCHER"
    );

    return hasMainAction && hasLauncherCategory;
  });
}

function withLargeScreenSupport(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];
    const mainActivity =
      activities.find((activity) => activity.$?.["android:name"] === ".MainActivity") ??
      activities.find(isLauncherActivity);

    if (mainActivity?.$) {
      mainActivity.$["android:resizeableActivity"] = "true";
      delete mainActivity.$["android:screenOrientation"];
    }

    return config;
  });
}

module.exports = withLargeScreenSupport;
