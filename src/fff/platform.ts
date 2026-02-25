import { execSync } from "node:child_process";

export function getTriple(): string {
  const platform = process.platform;
  const arch = process.arch;

  let osName: string;
  if (platform === "darwin") {
    osName = "apple-darwin";
  } else if (platform === "linux") {
    osName = detectLinuxLibc();
  } else if (platform === "win32") {
    osName = "pc-windows-msvc";
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const archName = normalizeArch(arch);
  return `${archName}-${osName}`;
}

function detectLinuxLibc(): string {
  try {
    const lddOutput = execSync("ldd --version 2>&1", {
      encoding: "utf-8",
      timeout: 5000,
    });
    if (lddOutput.toLowerCase().includes("musl")) {
      return "unknown-linux-musl";
    }
  } catch {
    // assume gnu
  }
  return "unknown-linux-gnu";
}

function normalizeArch(arch: string): string {
  switch (arch) {
    case "x64":
    case "amd64":
      return "x86_64";
    case "arm64":
      return "aarch64";
    case "arm":
      return "arm";
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

export function getLibExtension(): "dylib" | "so" | "dll" {
  switch (process.platform) {
    case "darwin":
      return "dylib";
    case "win32":
      return "dll";
    default:
      return "so";
  }
}

function getLibPrefix(): string {
  return process.platform === "win32" ? "" : "lib";
}

export function getLibFilename(): string {
  return `${getLibPrefix()}fff_c.${getLibExtension()}`;
}

const TRIPLE_TO_NPM_PACKAGE: Record<string, string> = {
  "aarch64-apple-darwin": "@ff-labs/fff-bun-darwin-arm64",
  "x86_64-apple-darwin": "@ff-labs/fff-bun-darwin-x64",
  "x86_64-unknown-linux-gnu": "@ff-labs/fff-bun-linux-x64-gnu",
  "aarch64-unknown-linux-gnu": "@ff-labs/fff-bun-linux-arm64-gnu",
  "x86_64-unknown-linux-musl": "@ff-labs/fff-bun-linux-x64-musl",
  "aarch64-unknown-linux-musl": "@ff-labs/fff-bun-linux-arm64-musl",
  "x86_64-pc-windows-msvc": "@ff-labs/fff-bun-win32-x64",
  "aarch64-pc-windows-msvc": "@ff-labs/fff-bun-win32-arm64",
};

export function getNpmPackageName(): string {
  const triple = getTriple();
  const packageName = TRIPLE_TO_NPM_PACKAGE[triple];
  if (!packageName) {
    throw new Error(`No npm package available for platform: ${triple}`);
  }
  return packageName;
}
