export { FileFinder } from "./finder.js";

export type {
  Result,
  InitOptions,
  SearchOptions,
  FileItem,
  Score,
  Location,
  SearchResult,
  ScanProgress,
  HealthCheck,
  DbHealth,
  GrepMode,
  GrepOptions,
  GrepMatch,
  GrepResult,
  GrepCursor,
} from "./types.js";

export { ok, err } from "./types.js";

export { binaryExists, ensureBinary, findBinary } from "./download.js";

export {
  getTriple,
  getLibExtension,
  getLibFilename,
  getNpmPackageName,
} from "./platform.js";
