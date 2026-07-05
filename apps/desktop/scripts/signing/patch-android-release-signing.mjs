#!/usr/bin/env node
/**
 * Idempotently enable release signing in the generated Gradle project when
 * keystore.properties exists (OSS self-signing workflow).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gradlePath = resolve(
  __dirname,
  "../../src-tauri/gen/android/app/build.gradle.kts",
);
const keystoreProps = resolve(__dirname, "../../src-tauri/gen/android/keystore.properties");

if (!existsSync(gradlePath)) {
  console.error("patch-android-release-signing: run `tauri android init` first");
  process.exit(1);
}

if (!existsSync(keystoreProps)) {
  console.log(
    "patch-android-release-signing: no keystore.properties — release APK will use debug signing",
  );
  process.exit(0);
}

let source = readFileSync(gradlePath, "utf8");
const marker = "// aperio-j release signing";

if (source.includes(marker)) {
  console.log("patch-android-release-signing: already patched");
  process.exit(0);
}

if (!source.includes("import java.util.Properties")) {
  source = source.replace(
    "plugins {",
    "import java.io.FileInputStream\n\nplugins {",
  );
}

const signingBlock = `
    ${marker}
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
`;

source = source.replace(
  "    buildTypes {",
  `${signingBlock}\n    buildTypes {`,
);

source = source.replace(
  /getByName\("release"\) \{\s*\n\s*isMinifyEnabled = true/,
  `getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true`,
);

writeFileSync(gradlePath, source, "utf8");
console.log("patch-android-release-signing: patched", gradlePath);
