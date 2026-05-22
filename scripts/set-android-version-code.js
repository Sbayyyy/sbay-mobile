const fs = require("fs");

const appJsonPath = "app.json";
const requestedVersionCode = Number.parseInt(process.argv[2] || "", 10);

if (!Number.isInteger(requestedVersionCode) || requestedVersionCode < 1) {
  console.error("Usage: node scripts/set-android-version-code.js <positive-integer>");
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const currentVersionCode = appJson?.expo?.android?.versionCode;

if (!Number.isInteger(currentVersionCode)) {
  throw new Error("app.json is missing expo.android.versionCode");
}

const nextVersionCode = Math.max(currentVersionCode, requestedVersionCode);

appJson.expo.android.versionCode = nextVersionCode;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

console.log(`Android versionCode set to ${nextVersionCode}`);
