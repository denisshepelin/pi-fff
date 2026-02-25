export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: string): Result<T> {
  return { ok: false, error };
}

export interface InitOptions {
  basePath: string;
  frecencyDbPath?: string;
  historyDbPath?: string;
  useUnsafeNoLock?: boolean;
  warmupMmapCache?: boolean;
}

export interface SearchOptions {
  maxThreads?: number;
  currentFile?: string;
  comboBoostMultiplier?: number;
  minComboCount?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface FileItem {
  path: string;
  relativePath: string;
  fileName: string;
  size: number;
  modified: number;
  accessFrecencyScore: number;
  modificationFrecencyScore: number;
  totalFrecencyScore: number;
  gitStatus: string;
}

export interface Score {
  total: number;
  baseScore: number;
  filenameBonus: number;
  specialFilenameBonus: number;
  frecencyBoost: number;
  distancePenalty: number;
  currentFilePenalty: number;
  comboMatchBoost: number;
  exactMatch: boolean;
  matchType: string;
}

export type Location =
  | { type: "line"; line: number }
  | { type: "position"; line: number; col: number }
  | {
      type: "range";
      start: { line: number; col: number };
      end: { line: number; col: number };
    };

export interface SearchResult {
  items: FileItem[];
  scores: Score[];
  totalMatched: number;
  totalFiles: number;
  location?: Location;
}

export interface ScanProgress {
  scannedFilesCount: number;
  isScanning: boolean;
}

export interface DbHealth {
  path: string;
  diskSize: number;
}

export interface HealthCheck {
  version: string;
  git: {
    available: boolean;
    repositoryFound: boolean;
    workdir?: string;
    libgit2Version: string;
    error?: string;
  };
  filePicker: {
    initialized: boolean;
    basePath?: string;
    isScanning?: boolean;
    indexedFiles?: number;
    error?: string;
  };
  frecency: {
    initialized: boolean;
    dbHealthcheck?: DbHealth;
    error?: string;
  };
  queryTracker: {
    initialized: boolean;
    dbHealthcheck?: DbHealth;
    error?: string;
  };
}

export interface InitOptionsInternal {
  base_path: string;
  frecency_db_path?: string;
  history_db_path?: string;
  use_unsafe_no_lock: boolean;
  warmup_mmap_cache: boolean;
}

export interface SearchOptionsInternal {
  max_threads?: number;
  current_file?: string;
  combo_boost_multiplier?: number;
  min_combo_count?: number;
  page_index?: number;
  page_size?: number;
}

export function toInternalInitOptions(opts: InitOptions): InitOptionsInternal {
  return {
    base_path: opts.basePath,
    frecency_db_path: opts.frecencyDbPath,
    history_db_path: opts.historyDbPath,
    use_unsafe_no_lock: opts.useUnsafeNoLock ?? false,
    warmup_mmap_cache: opts.warmupMmapCache ?? false,
  };
}

export function toInternalSearchOptions(
  opts?: SearchOptions
): SearchOptionsInternal {
  return {
    max_threads: opts?.maxThreads,
    current_file: opts?.currentFile,
    combo_boost_multiplier: opts?.comboBoostMultiplier,
    min_combo_count: opts?.minComboCount,
    page_index: opts?.pageIndex,
    page_size: opts?.pageSize,
  };
}

export type GrepMode = "plain" | "regex" | "fuzzy";

export interface GrepCursor {
  readonly __brand: "GrepCursor";
  readonly _offset: number;
}

export function createGrepCursor(offset: number): GrepCursor {
  return { __brand: "GrepCursor", _offset: offset };
}

export interface GrepOptions {
  maxFileSize?: number;
  maxMatchesPerFile?: number;
  smartCase?: boolean;
  cursor?: GrepCursor | null;
  pageLimit?: number;
  mode?: GrepMode;
  timeBudgetMs?: number;
}

export interface GrepMatch {
  path: string;
  relativePath: string;
  fileName: string;
  gitStatus: string;
  size: number;
  modified: number;
  isBinary: boolean;
  totalFrecencyScore: number;
  accessFrecencyScore: number;
  modificationFrecencyScore: number;
  lineNumber: number;
  col: number;
  byteOffset: number;
  lineContent: string;
  matchRanges: [number, number][];
  fuzzyScore?: number;
}

export interface GrepResult {
  items: GrepMatch[];
  totalMatched: number;
  totalFilesSearched: number;
  totalFiles: number;
  filteredFileCount: number;
  nextCursor: GrepCursor | null;
  regexFallbackError?: string;
}

export interface GrepOptionsInternal {
  max_file_size?: number;
  max_matches_per_file?: number;
  smart_case?: boolean;
  file_offset?: number;
  page_limit?: number;
  mode?: string;
  time_budget_ms?: number;
}

export function toInternalGrepOptions(opts?: GrepOptions): GrepOptionsInternal {
  return {
    max_file_size: opts?.maxFileSize,
    max_matches_per_file: opts?.maxMatchesPerFile,
    smart_case: opts?.smartCase,
    file_offset: opts?.cursor?._offset ?? 0,
    page_limit: opts?.pageLimit,
    mode: opts?.mode,
    time_budget_ms: opts?.timeBudgetMs,
  };
}
