import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({path: '.env.local', override: true});

// Initialize Mistral Client using your environment variables
const apiKey = process.env.VITE_MISTRAL_API_KEY;
const librarianId = process.env.VITE_LIBRARIAN_AGENT_ID;

if (!apiKey || !librarianId) {
    console.error("❌ Missing environment variables. Check VITE_MISTRAL_API_KEY and VITE_LIBRARIAN_AGENT_ID.");
    process.exit(1);
}

const client = new Mistral({ apiKey });
const INDEX_FILE = 'codebase_index.json';
const STRUCTURE_FILE = 'project_structure.txt';

/**
 * Returns a flat list of relative file paths under dir, one per line.
 * Flat paths are unambiguous and can be used directly as read_file arguments.
 */
function generateProjectTree(dir: string, fileList: string[] = []): string {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (['node_modules', 'dist', '.git', '.vite'].includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            generateProjectTree(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList.join('\n');
}

/**
 * Recursively lists all files under public/assets as Phaser-ready paths
 * (relative to public/, since Vite serves public/ at the root).
 */
function getAssetPaths(dir: string, fileList: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAssetPaths(fullPath, fileList);
        } else {
            // Strip the leading "public/" so paths match what Phaser expects
            fileList.push(fullPath.replace(/^public[\\/]/, ''));
        }
    }
    return fileList;
}

/**
 * Recursively finds all TypeScript files in a directory
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            if (!['node_modules', 'dist', '.git'].includes(file)) {
                getAllTsFiles(name, fileList);
            }
        } else if (name.endsWith('.ts')) {
            fileList.push(name);
        }
    });
    return fileList;
}

/**
 * Main Indexer Logic
 */
async function runIndexer() {
    console.log("🚀 Starting Codebase Indexing...");

    // 1. Generate the folder structure map for the Coder
    const structure = generateProjectTree('src/game');
    const assetPaths = getAssetPaths('public/assets');
    const fullStructure =
        structure +
        '\n\nASSETS (paths are relative to public/ — use as-is in scene.load calls):\n' +
        assetPaths.join('\n');
    fs.writeFileSync(STRUCTURE_FILE, fullStructure);
    console.log(`✅ Project structure saved to ${STRUCTURE_FILE}`);

    // 2. Load existing index for incremental updates
    const index = fs.existsSync(INDEX_FILE)
        ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
        : {};

    const files = getAllTsFiles('src/game');

    for (const file of files) {
        // Skip the file the AI actually writes to
        if (file === 'src/game/feature.ts') continue;

        const content = fs.readFileSync(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');

        // Only index if file has changed
        if (index[file]?.hash === hash) {
            console.log(`- Skipping ${file} (unchanged)`);
            continue;
        }

        console.log(`🔍 Extracting contracts from ${file}...`);

        try {
            // Call the Librarian Agent to extract signatures/contracts
            const res = await client.agents.complete({
                agentId: librarianId!,
                messages: [{
                    role: "user",
                    content: `Analyze this TypeScript file. Extract all exported interfaces, types, class signatures, and function signatures. 
                    Exclude the implementation bodies. Focus purely on the 'Contract' of the file.
                    
                    File: ${file}
                    Content:
                    ${content}`
                }]
            });

            const contract = res.choices[0]?.message?.content;

            if (contract) {
                index[file] = {
                    contract: contract, // The extracted signatures
                    hash: hash,
                    path: file
                };
            }
        } catch (e: any) {
            // Safe logging to avoid Node.js inspector crashes
            console.error(`❌ Failed to index ${file}:`, e.message || "Unknown Error");
            if (e.status === 429) {
                console.error("🛑 Rate limit reached. Stopping indexing.");
                break;
            }
        }
    }

    // 3. Save the finalized index
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log(`✅ Codebase index saved to ${INDEX_FILE}`);
}

runIndexer().catch(err => {
    console.error("💥 Critical Indexer Failure:", err.message);
});