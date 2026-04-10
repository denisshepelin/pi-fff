import { binaryExists, findBinary } from "@ff-labs/fff-node";
export { binaryExists, findBinary };
export async function ensureBinary() {
    const binaryPath = findBinary();
    if (binaryPath) {
        return binaryPath;
    }
    throw new Error("fff native library not found. Install dependencies with optional dependencies enabled.");
}
