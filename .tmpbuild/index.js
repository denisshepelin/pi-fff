import { CombinedAutocompleteProvider } from "@mariozechner/pi-tui";
import { FileFinder, closeLibrary } from "@ff-labs/fff-node";
let currentBasePath = "";
let finder = null;
function normalizePath(path) {
    return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}
function buildCompletionValue(path, isQuotedPrefix) {
    if (!isQuotedPrefix && !path.includes(" ")) {
        return `@${path}`;
    }
    return `@"${path}"`;
}
function startFinder(basePath) {
    if (finder && currentBasePath === basePath) {
        return;
    }
    destroyFinder();
    const created = FileFinder.create({ basePath, aiMode: true });
    if (!created.ok) {
        return;
    }
    finder = created.value;
    currentBasePath = basePath;
    void finder.waitForScan(10_000).catch(() => undefined);
}
function searchFff(query, isQuotedPrefix, limit) {
    if (!finder) {
        return [];
    }
    const result = finder.fileSearch(query, { pageSize: Math.max(limit, 20) });
    if (!result.ok) {
        return [];
    }
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
    const prototype = CombinedAutocompleteProvider.prototype;
    if (prototype.__fffPatched)
        return;
    const originalGet = prototype.getFuzzyFileSuggestions.bind(prototype);
    prototype.getFuzzyFileSuggestions = (query, options) => {
        const suggestions = searchFff(query, Boolean(options?.isQuotedPrefix), 20);
        if (suggestions.length > 0) {
            return suggestions;
        }
        return originalGet(query, options);
    };
    prototype.__fffPatched = true;
}
function destroyFinder() {
    currentBasePath = "";
    if (!finder) {
        return;
    }
    finder.destroy();
    finder = null;
    closeLibrary();
}
export default function (pi) {
    patchFilePicker();
    pi.on("session_start", (_event, ctx) => {
        startFinder(ctx.cwd);
    });
    pi.on("session_shutdown", () => {
        destroyFinder();
    });
}
