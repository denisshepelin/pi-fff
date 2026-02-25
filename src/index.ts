import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { CombinedAutocompleteProvider, type AutocompleteItem } from "@mariozechner/pi-tui";
import { FileFinder } from "./fff/index.js";

type FuzzyOptions = { isQuotedPrefix?: boolean };

type FuzzyGet = (query: string, options: FuzzyOptions) => AutocompleteItem[];

type CombinedAutocompleteProviderPatched = {
  getFuzzyFileSuggestions: FuzzyGet;
  __fffPatched?: boolean;
};

type FffState = {
  initialized: boolean;
  basePath: string;
};


const fffState: FffState = {
  initialized: false,
  basePath: "",
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function buildCompletionValue(path: string, isQuotedPrefix: boolean): string {
  if (!isQuotedPrefix && !path.includes(" ")) {
    return `@${path}`;
  }
  return `@"${path}"`;
}

function initializeFinder(basePath: string): boolean {
  if (fffState.initialized) return fffState.basePath === basePath;

  const init = FileFinder.init({ basePath });
  if (!init.ok) return false;

  const scan = FileFinder.waitForScan(500);
  if (!scan.ok) {
    FileFinder.destroy();
    return false;
  }

  fffState.initialized = true;
  fffState.basePath = basePath;
  return true;
}

function searchFff(query: string, isQuotedPrefix: boolean, limit: number): AutocompleteItem[] {
  if (!fffState.initialized) return [];

  const result = FileFinder.search(query, { pageSize: Math.max(limit, 20) });
  if (!result.ok) return [];

  return result.value.items.slice(0, limit).map((item) => {
    const path = normalizePath(item.relativePath || item.path);
    return {
      value: buildCompletionValue(path, isQuotedPrefix),
      label: item.fileName,
      description: path,
    };
  });
}

function patchFilePicker() {
  const prototype = CombinedAutocompleteProvider.prototype as unknown as CombinedAutocompleteProviderPatched;
  if (prototype.__fffPatched) return;

  const originalGet = prototype.getFuzzyFileSuggestions.bind(prototype);

  prototype.getFuzzyFileSuggestions = (query: string, options: FuzzyOptions): AutocompleteItem[] => {
    const suggestions = searchFff(query, Boolean(options?.isQuotedPrefix), 20);
    if (suggestions.length > 0) {
      return suggestions;
    }

    return originalGet(query, options);
  };

  prototype.__fffPatched = true;
}

function destroyFinder() {
  if (!fffState.initialized) return;

  FileFinder.destroy();
  fffState.initialized = false;
  fffState.basePath = "";
}

export default function (pi: ExtensionAPI) {
  patchFilePicker();
  initializeFinder(process.cwd());

  pi.on("session_shutdown", () => {
    destroyFinder();
  });

}
