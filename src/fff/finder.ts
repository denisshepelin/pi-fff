import {
  ffiDestroy,
  ffiGetHistoricalQuery,
  ffiGetScanProgress,
  ffiHealthCheck,
  ffiInit,
  ffiIsScanning,
  ffiLiveGrep,
  ffiRefreshGitStatus,
  ffiRestartIndex,
  ffiScanFiles,
  ffiSearch,
  ffiTrackAccess,
  ffiTrackQuery,
  ffiWaitForScan,
  ensureLoaded,
  isAvailable,
} from "./ffi.js";

import type {
  GrepOptions,
  GrepResult,
  HealthCheck,
  InitOptions,
  Result,
  ScanProgress,
  SearchOptions,
  SearchResult,
} from "./types.js";

import {
  createGrepCursor,
  err,
  toInternalGrepOptions,
  toInternalInitOptions,
  toInternalSearchOptions,
} from "./types.js";

export class FileFinder {
  private static initialized = false;

  static init(options: InitOptions): Result<void> {
    const internalOpts = toInternalInitOptions(options);
    const result = ffiInit(JSON.stringify(internalOpts));

    if (result.ok) {
      this.initialized = true;
    }

    return result;
  }

  static destroy(): Result<void> {
    const result = ffiDestroy();
    if (result.ok) {
      this.initialized = false;
    }
    return result;
  }

  static search(query: string, options?: SearchOptions): Result<SearchResult> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }

    const internalOpts = toInternalSearchOptions(options);
    const result = ffiSearch(query, JSON.stringify(internalOpts));

    if (!result.ok) {
      return result;
    }

    return result as Result<SearchResult>;
  }

  static liveGrep(query: string, options?: GrepOptions): Result<GrepResult> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }

    const internalOpts = toInternalGrepOptions(options);
    const result = ffiLiveGrep(query, JSON.stringify(internalOpts));

    if (!result.ok) {
      return result;
    }

    const raw = result.value as Record<string, unknown>;
    const nextFileOffset = raw.nextFileOffset as number;

    const grepResult: GrepResult = {
      items: raw.items as GrepResult["items"],
      totalMatched: raw.totalMatched as number,
      totalFilesSearched: raw.totalFilesSearched as number,
      totalFiles: raw.totalFiles as number,
      filteredFileCount: raw.filteredFileCount as number,
      nextCursor: nextFileOffset > 0 ? createGrepCursor(nextFileOffset) : null,
      regexFallbackError: raw.regexFallbackError as string | undefined,
    };

    return { ok: true, value: grepResult };
  }

  static scanFiles(): Result<void> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }
    return ffiScanFiles();
  }

  static isScanning(): boolean {
    if (!this.initialized) return false;
    return ffiIsScanning();
  }

  static getScanProgress(): Result<ScanProgress> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }
    return ffiGetScanProgress() as Result<ScanProgress>;
  }

  static waitForScan(timeoutMs = 5000): Result<boolean> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }
    return ffiWaitForScan(timeoutMs);
  }

  static reindex(newPath: string): Result<void> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }
    return ffiRestartIndex(newPath);
  }

  static trackAccess(filePath: string): Result<boolean> {
    if (!this.initialized) {
      return { ok: true, value: false };
    }
    return ffiTrackAccess(filePath);
  }

  static refreshGitStatus(): Result<number> {
    if (!this.initialized) {
      return err("FileFinder not initialized. Call FileFinder.init() first.");
    }
    return ffiRefreshGitStatus();
  }

  static trackQuery(query: string, selectedFilePath: string): Result<boolean> {
    if (!this.initialized) {
      return { ok: true, value: false };
    }
    return ffiTrackQuery(query, selectedFilePath);
  }

  static getHistoricalQuery(offset: number): Result<string | null> {
    if (!this.initialized) {
      return { ok: true, value: null };
    }
    return ffiGetHistoricalQuery(offset);
  }

  static healthCheck(testPath?: string): Result<HealthCheck> {
    return ffiHealthCheck(testPath || "") as Result<HealthCheck>;
  }

  static isAvailable(): boolean {
    return isAvailable();
  }

  static async ensureLoaded(): Promise<void> {
    return ensureLoaded();
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}
