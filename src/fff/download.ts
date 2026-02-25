import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { getLibFilename, getNpmPackageName } from "./platform.js";

function getCurrentDir(): string {
  const url = import.meta.url;
  if (url.startsWith("file://")) {
    return dirname(fileURLToPath(url));
  }
  return dirname(url);
}

function getPackageDir(): string {
  const currentDir = getCurrentDir();
  const parent = dirname(currentDir);
  if (basename(parent) === "dist") {
    return dirname(parent);
  }

  let dir = currentDir;
  for (let i = 0; i < 4; i += 1) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const next = dirname(dir);
    if (next === dir) break;
    dir = next;
  }

  return parent;
}

function resolvePackageBinary(fromPackageJsonPath: string, packageName: string): string | null {
  try {
    const require = createRequire(fromPackageJsonPath);
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = dirname(packageJsonPath);
    const binaryPath = join(packageDir, getLibFilename());

    if (existsSync(binaryPath)) {
      return binaryPath;
    }
  } catch {
    // package missing from this root
  }

  return null;
}

function resolveFromNpmPackage(): string | null {
  try {
    const packageName = getNpmPackageName();

    const fromCwd = resolvePackageBinary(join(process.cwd(), "package.json"), packageName);
    if (fromCwd) return fromCwd;

    return resolvePackageBinary(join(getPackageDir(), "package.json"), packageName);
  } catch {
    return null;
  }
}

export function findBinary(): string | null {
  return resolveFromNpmPackage();
}

function getInstallHint(): string {
  try {
    return getNpmPackageName();
  } catch {
    return "@ff-labs/fff-bun-<target>";
  }
}

export function binaryExists(): boolean {
  return findBinary() !== null;
}

export async function ensureBinary(): Promise<string> {
  const existingPath = findBinary();
  if (existingPath) {
    return existingPath;
  }

  throw new Error(
    `fff native library not found. Install the matching platform package (${getInstallHint()}) and reinstall with optional dependencies enabled.`
  );
}
