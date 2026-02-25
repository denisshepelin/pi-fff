import koffi from "koffi";
import { ensureBinary, findBinary } from "./download.js";
import type { Result } from "./types.js";
import { err } from "./types.js";

interface FffResultRaw {
  success: boolean;
  data: string | null;
  error: string | null;
}

type FffResultPointer = object;

interface FFFSymbols {
  fff_init: (optsJson: string) => FffResultPointer | null;
  fff_destroy: () => FffResultPointer | null;
  fff_search: (query: string, optsJson: string) => FffResultPointer | null;
  fff_live_grep?: (query: string, optsJson: string) => FffResultPointer | null;
  fff_scan_files: () => FffResultPointer | null;
  fff_is_scanning: () => boolean;
  fff_get_scan_progress: () => FffResultPointer | null;
  fff_wait_for_scan: (timeoutMs: bigint) => FffResultPointer | null;
  fff_restart_index: (newPath: string) => FffResultPointer | null;
  fff_track_access: (filePath: string) => FffResultPointer | null;
  fff_refresh_git_status: () => FffResultPointer | null;
  fff_track_query: (query: string, filePath: string) => FffResultPointer | null;
  fff_get_historical_query: (offset: bigint) => FffResultPointer | null;
  fff_health_check: (testPath: string) => FffResultPointer | null;
  fff_free_result: (resultPtr: FffResultPointer | null) => void;
}

interface FFFLibrary {
  handle: ReturnType<typeof koffi.load>;
  symbols: FFFSymbols;
}

const FFF_RESULT = koffi.struct("FffResultNode", {
  success: "bool",
  data: "char *",
  error: "char *",
});

const FFF_RESULT_PTR = koffi.pointer(FFF_RESULT);

let lib: FFFLibrary | null = null;

function loadLibrary(): FFFLibrary {
  if (lib) return lib;

  const binaryPath = findBinary();
  if (!binaryPath) {
    throw new Error("fff native library not found in optional @ff-labs/fff-bun-* package");
  }

  const handle = koffi.load(binaryPath);
  const symbols: FFFSymbols = {
    fff_init: handle.func("fff_init", FFF_RESULT_PTR, ["char *"]) as FFFSymbols["fff_init"],
    fff_destroy: handle.func("fff_destroy", FFF_RESULT_PTR, []) as FFFSymbols["fff_destroy"],
    fff_search: handle.func("fff_search", FFF_RESULT_PTR, ["char *", "char *"]) as FFFSymbols["fff_search"],
    fff_scan_files: handle.func("fff_scan_files", FFF_RESULT_PTR, []) as FFFSymbols["fff_scan_files"],
    fff_is_scanning: handle.func("fff_is_scanning", "bool", []) as FFFSymbols["fff_is_scanning"],
    fff_get_scan_progress: handle.func("fff_get_scan_progress", FFF_RESULT_PTR, []) as FFFSymbols["fff_get_scan_progress"],
    fff_wait_for_scan: handle.func("fff_wait_for_scan", FFF_RESULT_PTR, ["uint64_t"]) as FFFSymbols["fff_wait_for_scan"],
    fff_restart_index: handle.func("fff_restart_index", FFF_RESULT_PTR, ["char *"]) as FFFSymbols["fff_restart_index"],
    fff_track_access: handle.func("fff_track_access", FFF_RESULT_PTR, ["char *"]) as FFFSymbols["fff_track_access"],
    fff_refresh_git_status: handle.func("fff_refresh_git_status", FFF_RESULT_PTR, []) as FFFSymbols["fff_refresh_git_status"],
    fff_track_query: handle.func("fff_track_query", FFF_RESULT_PTR, ["char *", "char *"]) as FFFSymbols["fff_track_query"],
    fff_get_historical_query: handle.func("fff_get_historical_query", FFF_RESULT_PTR, ["uint64_t"]) as FFFSymbols["fff_get_historical_query"],
    fff_health_check: handle.func("fff_health_check", FFF_RESULT_PTR, ["char *"]) as FFFSymbols["fff_health_check"],
    fff_free_result: handle.func("fff_free_result", "void", [FFF_RESULT_PTR]) as FFFSymbols["fff_free_result"],
  };

  try {
    symbols.fff_live_grep = handle.func("fff_live_grep", FFF_RESULT_PTR, ["char *", "char *"]) as FFFSymbols["fff_live_grep"];
  } catch {
    symbols.fff_live_grep = undefined;
  }

  lib = { handle, symbols };
  return lib;
}

function snakeToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result;
}

function parseResult<T>(resultPtr: FffResultPointer | null): Result<T> {
  if (resultPtr === null) {
    return err("FFI returned null pointer");
  }

  const library = loadLibrary();
  let raw: FffResultRaw;
  try {
    raw = koffi.decode(resultPtr, FFF_RESULT) as FffResultRaw;
  } catch (decodeError) {
    return err(
      decodeError instanceof Error
        ? `Failed to decode FFI result: ${decodeError.message}`
        : "Failed to decode FFI result"
    );
  } finally {
    library.symbols.fff_free_result(resultPtr);
  }

  if (raw.success) {
    const data = raw.data;
    if (data === null || data === "") {
      return { ok: true, value: undefined as T };
    }

    try {
      const parsed = JSON.parse(data);
      return { ok: true, value: snakeToCamel(parsed) as T };
    } catch {
      return { ok: true, value: data as T };
    }
  }

  return err(raw.error || "Unknown error");
}

export function ffiInit(optsJson: string): Result<void> {
  const library = loadLibrary();
  return parseResult<void>(library.symbols.fff_init(optsJson));
}

export function ffiDestroy(): Result<void> {
  const library = loadLibrary();
  return parseResult<void>(library.symbols.fff_destroy());
}

export function ffiSearch(query: string, optsJson: string): Result<unknown> {
  const library = loadLibrary();
  return parseResult<unknown>(library.symbols.fff_search(query, optsJson));
}

export function ffiLiveGrep(query: string, optsJson: string): Result<unknown> {
  const library = loadLibrary();
  if (!library.symbols.fff_live_grep) {
    return err("liveGrep is not supported by this native library.");
  }
  return parseResult<unknown>(library.symbols.fff_live_grep(query, optsJson));
}

export function ffiScanFiles(): Result<void> {
  const library = loadLibrary();
  return parseResult<void>(library.symbols.fff_scan_files());
}

export function ffiIsScanning(): boolean {
  const library = loadLibrary();
  return library.symbols.fff_is_scanning();
}

export function ffiGetScanProgress(): Result<unknown> {
  const library = loadLibrary();
  return parseResult<unknown>(library.symbols.fff_get_scan_progress());
}

export function ffiWaitForScan(timeoutMs: number): Result<boolean> {
  const library = loadLibrary();
  const result = parseResult<string>(library.symbols.fff_wait_for_scan(BigInt(timeoutMs)));
  if (!result.ok) return result;
  return { ok: true, value: result.value === "true" };
}

export function ffiRestartIndex(newPath: string): Result<void> {
  const library = loadLibrary();
  return parseResult<void>(library.symbols.fff_restart_index(newPath));
}

export function ffiTrackAccess(filePath: string): Result<boolean> {
  const library = loadLibrary();
  const result = parseResult<string>(library.symbols.fff_track_access(filePath));
  if (!result.ok) return result;
  return { ok: true, value: result.value === "true" };
}

export function ffiRefreshGitStatus(): Result<number> {
  const library = loadLibrary();
  const result = parseResult<string>(library.symbols.fff_refresh_git_status());
  if (!result.ok) return result;
  return { ok: true, value: parseInt(result.value, 10) };
}

export function ffiTrackQuery(query: string, filePath: string): Result<boolean> {
  const library = loadLibrary();
  const result = parseResult<string>(library.symbols.fff_track_query(query, filePath));
  if (!result.ok) return result;
  return { ok: true, value: result.value === "true" };
}

export function ffiGetHistoricalQuery(offset: number): Result<string | null> {
  const library = loadLibrary();
  const result = parseResult<string>(library.symbols.fff_get_historical_query(BigInt(offset)));
  if (!result.ok) return result;
  if (result.value === "null") return { ok: true, value: null };
  return result;
}

export function ffiHealthCheck(testPath: string): Result<unknown> {
  const library = loadLibrary();
  return parseResult<unknown>(library.symbols.fff_health_check(testPath));
}

export async function ensureLoaded(): Promise<void> {
  await ensureBinary();
  loadLibrary();
}

export function isAvailable(): boolean {
  try {
    loadLibrary();
    return true;
  } catch {
    return false;
  }
}
