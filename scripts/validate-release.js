#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];

function log(message) {
  console.log(`[release-check] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[release-check] FAIL: ${message}`);
}

function readJson(file) {
  const fullPath = path.join(root, file);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${file} is missing or invalid JSON: ${error.message}`);
    return null;
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }
}

function assertSemver(value, label) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
    fail(`${label} must look like a semantic version, for example 1.0.0.`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    fail(`${label} must be a positive integer.`);
  }
}

function assertHexColor(value, label) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    fail(`${label} must be a 6-digit hex color.`);
  }
}

function getPngDimensions(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    fail(`${file} does not exist.`);
    return null;
  }
  const buffer = fs.readFileSync(fullPath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    fail(`${file} is not a PNG file.`);
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.length,
  };
}

function validatePng(file, { minSize, square = true, exactSize }) {
  if (typeof file !== "string" || file.trim().length === 0) {
    return;
  }

  const dimensions = getPngDimensions(file);
  if (!dimensions) return;

  log(`${file}: ${dimensions.width}x${dimensions.height}, ${dimensions.bytes} bytes`);
  if (dimensions.bytes < 500) {
    fail(`${file} looks too small to be a real app asset.`);
  }
  if (square && dimensions.width !== dimensions.height) {
    fail(`${file} must be square.`);
  }
  if (exactSize && (dimensions.width !== exactSize || dimensions.height !== exactSize)) {
    fail(`${file} must be ${exactSize}x${exactSize}.`);
  }
  if (minSize && (dimensions.width < minSize || dimensions.height < minSize)) {
    fail(`${file} must be at least ${minSize}x${minSize}.`);
  }
}

log("Reading release configuration.");
const appJson = readJson("app.json");
const pkg = readJson("package.json");

if (appJson?.expo) {
  const expo = appJson.expo;
  assertString(expo.name, "expo.name");
  assertString(expo.slug, "expo.slug");
  assertSemver(expo.version, "expo.version");
  assertString(expo.scheme, "expo.scheme");

  const android = expo.android ?? {};
  assertString(android.package, "expo.android.package");
  assertPositiveInteger(android.versionCode, "expo.android.versionCode");

  const adaptiveIcon = android.adaptiveIcon ?? {};
  assertHexColor(adaptiveIcon.backgroundColor, "expo.android.adaptiveIcon.backgroundColor");
  assertString(expo.icon, "expo.icon");
  assertString(adaptiveIcon.foregroundImage, "expo.android.adaptiveIcon.foregroundImage");
  assertString(adaptiveIcon.monochromeImage, "expo.android.adaptiveIcon.monochromeImage");
  assertString(expo.web?.favicon, "expo.web.favicon");

  const iconPath = expo.icon?.replace(/^\.\//, "");
  const foregroundPath = adaptiveIcon.foregroundImage?.replace(/^\.\//, "");
  const monochromePath = adaptiveIcon.monochromeImage?.replace(/^\.\//, "");
  const faviconPath = expo.web?.favicon?.replace(/^\.\//, "");

  validatePng(iconPath, { exactSize: 1024 });
  validatePng(foregroundPath, { minSize: 432 });
  validatePng(monochromePath, { minSize: 432 });
  validatePng(faviconPath, { minSize: 32 });
}

if (pkg) {
  assertString(pkg.scripts?.typecheck, "package.json scripts.typecheck");
  assertString(pkg.scripts?.lint, "package.json scripts.lint");
  assertString(pkg.scripts?.test, "package.json scripts.test");
  assertString(pkg.scripts?.["build:android"], "package.json scripts.build:android");
}

if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  fail("package-lock.json is required for reproducible Jenkins builds.");
}

if (!fs.existsSync(path.join(root, "Dockerfile"))) {
  fail("Dockerfile is required for Jenkins Android builds.");
}

if (!fs.existsSync(path.join(root, "docker-compose.yml"))) {
  fail("docker-compose.yml is required for Jenkins Android builds.");
}

if (failures.length > 0) {
  console.error(`[release-check] ${failures.length} release check(s) failed.`);
  process.exit(1);
}

log("Release configuration checks passed.");
