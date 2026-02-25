import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { CombinedAutocompleteProvider, type AutocompleteItem } from "@mariozechner/pi-tui";
import { FileFinder } from "./fff/index.js";

type FuzzyOptions = { isQuotedPrefix?: boolean };

type FuzzyGet = (query: string, options: FuzzyOptions) => AutocompleteItem[];

type CombinedAutocompleteProviderPatched = {
  getFuzzyFileSuggestions: FuzzyGet;
  __fffPatched?: boolean;
  __fffOriginalGetFuzzyFileSuggestions?: FuzzyGet;
};

type FffState = {
  initialized: boolean;
  basePath: string;
};

type RankedSuggestion = {
  path: string;
  score: number;
  item: AutocompleteItem;
};

const fffState: FffState = {
  initialized: false,
  basePath: "",
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function extractPathFromValue(value: string): string {
  let path = value.startsWith("@") ? value.slice(1) : value;
  if (path.startsWith('"') && path.endsWith('"')) {
    path = path.slice(1, -1);
  }
  return normalizePath(path);
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

function searchFff(query: string, isQuotedPrefix: boolean, limit: number): RankedSuggestion[] {
  if (!fffState.initialized) return [];

  const result = FileFinder.search(query, { pageSize: Math.max(limit, 20) });
  if (!result.ok) return [];

  return result.value.items.slice(0, limit).map((item, index) => {
    const path = normalizePath(item.relativePath || item.path);
    const score = Math.max(1, Math.round(result.value.scores[index]?.total ?? result.value.items.length - index));

    return {
      path,
      score,
      item: {
        value: buildCompletionValue(path, isQuotedPrefix),
        label: item.fileName,
        description: path,
      },
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
      return suggestions.map((entry) => entry.item);
    }

    return originalGet(query, options);
  };

  prototype.__fffOriginalGetFuzzyFileSuggestions = originalGet;
  prototype.__fffPatched = true;
}

function formatRanked(title: string, rows: RankedSuggestion[]): string {
  const lines = rows.map((row, index) => `${index + 1}. ${row.score.toString().padStart(3, " ")}  ${row.path}`);
  return [title, ...lines].join("\n");
}

function formatList(title: string, rows: string[]): string {
  const lines = rows.map((row, index) => `${index + 1}. ${row}`);
  return [title, ...lines].join("\n");
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

  pi.registerCommand("fff-score-debug", {
    description: "Compare original vs fff file-picker ranking: /fff-score-debug <query>",
    handler: async (args, ctx) => {
      const query = (args || "").trim();
      if (!query) {
        ctx.ui.notify("Usage: /fff-score-debug <query>", "warning");
        return;
      }

      const prototype = CombinedAutocompleteProvider.prototype as unknown as CombinedAutocompleteProviderPatched;
      const originalGet = prototype.__fffOriginalGetFuzzyFileSuggestions;
      if (!originalGet) {
        ctx.ui.notify("Original picker not available", "error");
        return;
      }

      const oldTop = originalGet(query, { isQuotedPrefix: false })
        .slice(0, 8)
        .map((entry) => extractPathFromValue(entry.value));

      const newTop = searchFff(query, false, 8);

      const content = [
        `Query: ${query}`,
        `Original candidates: ${oldTop.length}`,
        `fff candidates: ${newTop.length}`,
        "",
        formatList("Original picker top:", oldTop),
        "",
        formatRanked("fff top (single search call):", newTop),
      ].join("\n");

      pi.sendMessage({
        customType: "fff-score-debug",
        content,
        display: true,
      });
    },
  });
}
