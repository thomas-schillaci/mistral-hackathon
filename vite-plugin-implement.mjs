import {Mistral} from '@mistralai/mistralai';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

export function implementPlugin() {
    let env = {}; // Captures Vite's environment mapping

    return {
        name: 'mistral-implement',

        // Standard Vite hook to resolve environment variables
        configResolved(config) {
            env = config.env;
        },

        configureServer(server) {
            // 1. BOOTSTRAP: Ensure the Index and Structure exist before the server handles requests
            if (!fs.existsSync('codebase_index.json') || !fs.existsSync('project_structure.txt')) {
                console.log('⚠️ Required indexing files missing. Running indexer...');
                try {
                    // Passes the current env so the indexer has API keys
                    execSync('npm run index-code', {
                        stdio: 'inherit',
                        env: {...process.env, ...env}
                    });
                } catch (err) {
                    console.error('❌ Failed to auto-generate index:', err.message);
                }
            }

            server.middlewares.use('/api/implement', async (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end();
                    return;
                }

                try {
                    // 2. PARSE REQUEST: Get the card data from the game client
                    const body = await new Promise((resolve) => {
                        let data = '';
                        req.on('data', chunk => data += chunk);
                        req.on('end', () => resolve(data));
                    });

                    const card = JSON.parse(body);

                    // Load the technical assets prepared by the Librarian
                    const contracts = fs.readFileSync('codebase_index.json', 'utf8');
                    const structure = fs.readFileSync('project_structure.txt', 'utf8');
                    const currentFeature = fs.readFileSync('src/game/feature.ts', 'utf8');

                    const client = new Mistral({apiKey: env.VITE_MISTRAL_API_KEY});

                    // --- PHASE 1: THE ORCHESTRATOR ---
                    // The Orchestrator sees the "Contracts" (signatures) and the folder structure
                    let messages = [{
                        role: 'user',
                        content: `IMPLEMENTATION TASK: ${card.title}
                        Description: ${card.description}
                        Systems: ${card.game_systems_touched.join(', ')}
                        
                        PROJECT STRUCTURE:
                        ${structure}

                        CODEBASE CONTRACTS:
                        ${contracts}

                        CURRENT feature.ts:
                        ${currentFeature}`
                    }];

                    let technicalBrief = "";
                    let isOrchestrating = true;

                    console.log("🚀 Triggering Coder Agent");
                    while (isOrchestrating) {
                        const response = await client.agents.complete({
                            agentId: env.VITE_ORCHESTRATOR_AGENT_ID,
                            messages
                        });

                        const message = response.choices[0].message;
                        if (message.toolCalls) {
                            messages.push(message); // Maintain conversation history
                            for (const tool of message.toolCalls) {
                                const filePath = JSON.parse(tool.function.arguments).path;
                                console.log(`[ORCHESTRATOR] Using tool read_file(${filePath})`);

                                try {
                                    const fileContent = fs.readFileSync(filePath, 'utf8');
                                    messages.push({
                                        role: "tool",
                                        name: "read_file",
                                        content: fileContent,
                                        toolCallId: tool.id
                                    });
                                } catch (err) {
                                    messages.push({
                                        role: "tool",
                                        name: "read_file",
                                        content: `Error: File not found at ${filePath}`,
                                        toolCallId: tool.id
                                    });
                                }
                            }
                        } else {
                            // The orchestrator has finalized its Technical Brief
                            technicalBrief = message.content;
                            isOrchestrating = false;
                        }
                    }

                    // --- PHASE 2: CODER + VALIDATE CONVERSATION ---
                    const MAX_RETRIES = 3;
                    const featurePath = 'src/game/feature.ts';
                    const absoluteFeaturePath = path.resolve(featurePath);
                    const backup = fs.readFileSync(featurePath, 'utf8');

                    // Pause HMR so intermediate writes don't crash the game
                    server.watcher.unwatch(absoluteFeaturePath);

                    const coderMessages = [{
                        role: 'user',
                        content: `PROJECT STRUCTURE:\n${structure}\n\nTECHNICAL BRIEF:\n${technicalBrief}`
                    }];

                    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                        console.log(attempt === 0
                            ? `🚀 Triggering Coder Agent`
                            : `🔧 Sending errors back to Coder (attempt ${attempt}/${MAX_RETRIES})...`
                        );

                        const coderResponse = await client.agents.complete({
                            agentId: env.VITE_CODER_AGENT_ID,
                            messages: coderMessages
                        });

                        const currentCode = coderResponse.choices[0].message.content.trim();
                        coderMessages.push({role: 'assistant', content: currentCode});

                        // Write directly to feature.ts so tsc picks it up via tsconfig include
                        fs.writeFileSync(featurePath, currentCode);

                        try {
                            execSync('npx tsc --noEmit', {stdio: 'pipe'});
                        } catch (tscErr) {
                            const fullOutput = tscErr.stdout?.toString() || tscErr.stderr?.toString() || tscErr.message;

                            // Only care about errors originating in feature.ts
                            const featureErrors = fullOutput
                                .split('\n')
                                .filter(line => line.includes('feature.ts'))
                                .join('\n')
                                .trim();

                            if (!featureErrors) {
                                // Errors are in other files — not the coder's fault, pass through
                                console.warn('⚠️ tsc reported errors outside feature.ts, ignoring.');
                            } else {
                                console.error(`❌ TypeScript errors in feature.ts:\n${featureErrors}`);

                                // Restore working file while coder retries (or gives up)
                                fs.writeFileSync(featurePath, backup);

                                if (attempt === MAX_RETRIES) {
                                    server.watcher.add(absoluteFeaturePath);
                                    res.statusCode = 422;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({
                                        ok: false,
                                        error: 'TypeScript validation failed',
                                        details: featureErrors
                                    }));
                                    return;
                                }

                                coderMessages.push({
                                    role: 'user',
                                    content: `The code has TypeScript compiler errors. Fix them and return the corrected full file:\n\n${featureErrors}`
                                });
                                continue;
                            }
                        }

                        // Validation passed — resume watcher and manually trigger HMR
                        server.watcher.add(absoluteFeaturePath);
                        server.watcher.emit('change', absoluteFeaturePath);
                        console.log('✨ [SUCCESS] feature.ts updated via Sequential Agent Chain.');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ok: true}));
                        return;
                    }
                } catch (err) {
                    // Safe logging to avoid Node inspector crashes
                    console.error('❌ Plugin Error:', err.message || "Unknown error");
                    res.statusCode = 500;
                    res.end(JSON.stringify({ok: false, error: err.message}));
                }
            });
        }
    };
}