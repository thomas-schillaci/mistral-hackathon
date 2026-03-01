import {Mistral} from '@mistralai/mistralai';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

export function implementPlugin() {
    let env = {};
    let client = null;

    async function mistralWithRetry(params) {
        const delays = [2000, 15000, 62000];
        for (let i = 0; ; i++) {
            try {
                return await client.agents.complete(params)
            } catch (err) {
                const is429 = err.statusCode === 429 || err.message?.includes('429');
                if (!is429 || i >= delays.length) throw err;
                console.warn(`⏳ Rate limited. Retrying in ${delays[i] / 1000}s...`);
                await new Promise(r => setTimeout(r, delays[i]));
            }
        }
    }

    return {
        name: 'mistral-implement',

        configResolved(config) {
            env = config.env;
        },

        configureServer(server) {
            client = new Mistral({apiKey: env.VITE_MISTRAL_API_KEY});

            // console.log('Indexing the codebase...');
            // try {
            //     execSync('npm run index-code', {
            //         stdio: 'inherit',
            //         env: {...process.env, ...env}
            //     });
            //     console.log('Indexing done.');
            // } catch (err) {
            //     console.error('❌ Failed to index the codebase:', err.message);
            // }

            server.middlewares.use('/api/implement', async (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end();
                    return;
                }

                try {
                    const body = await new Promise((resolve) => {
                        let data = '';
                        req.on('data', chunk => data += chunk);
                        req.on('end', () => resolve(data));
                    });

                    const card = JSON.parse(body);
                    const contracts = fs.readFileSync('codebase_index.json', 'utf8');
                    const structure = fs.readFileSync('project_structure.txt', 'utf8');
                    const currentFeature = fs.readFileSync('src/game/feature.ts', 'utf8');


                    // Runs the agent, handling read_file tool calls, until it produces a text response.
                    async function runUntilCode(messages) {
                        const fileCache = new Map();
                        const MAX_ROUNDS = 15;

                        for (let i = 0; i < MAX_ROUNDS; i++) {
                            const response = await mistralWithRetry({
                                agentId: env.VITE_CODER_AGENT_ID,
                                messages
                            });
                            const message = response.choices[0].message;
                            messages.push(message);

                            if (!message.toolCalls?.length) {
                                return message.content.trim();
                            }

                            for (const tool of message.toolCalls) {
                                const filePath = JSON.parse(tool.function.arguments).path;
                                let content;
                                if (fileCache.has(filePath)) {
                                    console.log(`[CODER] read_file(${filePath}) — cache hit`);
                                    content = `You already received this file:\n\n${fileCache.get(filePath)}`;
                                } else {
                                    console.log(`[CODER] read_file(${filePath})`);
                                    try {
                                        content = fs.readFileSync(filePath, 'utf8');
                                        fileCache.set(filePath, content);
                                    } catch {
                                        content = `Error: file not found at ${filePath}`;
                                    }
                                }
                                messages.push({role: 'tool', name: 'read_file', content, toolCallId: tool.id});
                            }
                        }

                        throw new Error(`Agent did not produce code after ${MAX_ROUNDS} tool-call rounds.`);
                    }

                    const messages = [{
                        role: 'user',
                        content:
                            `FEATURE CARD\n` +
                            `Title: ${card.title}\n` +
                            `Flavor text: ${card.flavor_text}\n` +
                            `Description: ${card.description}\n` +
                            `Systems: ${card.game_systems_touched.join(', ')}\n\n` +
                            `PROJECT STRUCTURE:\n${structure}\n\n` +
                            `CODEBASE CONTRACTS:\n${contracts}\n\n` +
                            `CURRENT feature.ts:\n${currentFeature}`
                    }];

                    let code = await runUntilCode(messages);

                    // --- VALIDATE + RETRY ---
                    const featurePath = 'src/game/feature.ts';
                    const absoluteFeaturePath = path.resolve(featurePath);
                    const backup = fs.readFileSync(featurePath, 'utf8');
                    const MAX_RETRIES = 5;

                    server.watcher.unwatch(absoluteFeaturePath);
                    try {
                        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                            fs.writeFileSync(featurePath, code);

                            try {
                                execSync('npx tsc --noEmit', {stdio: 'pipe'});
                            } catch (tscErr) {
                                const fullOutput = tscErr.stdout?.toString() || tscErr.stderr?.toString() || tscErr.message;
                                const featureErrors = fullOutput
                                    .split('\n')
                                    .filter(line => line.includes('feature.ts'))
                                    .join('\n')
                                    .trim();

                                if (featureErrors) {
                                    fs.writeFileSync(featurePath, backup);

                                    if (attempt === MAX_RETRIES) {
                                        res.statusCode = 422;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify({
                                            ok: false,
                                            error: 'TypeScript validation failed',
                                            details: featureErrors
                                        }));
                                        console.error(`Could not make the feature work in ${MAX_RETRIES + 1} attempts.`);
                                        return;
                                    }

                                    console.log(`🔧 Sending errors back to Coder (attempt ${attempt + 1}/${MAX_RETRIES})...`);
                                    messages.push({
                                        role: 'user',
                                        content: `TypeScript compiler errors in feature.ts. Fix them and return the corrected full file:\n\n${featureErrors}`
                                    });
                                    code = await runUntilCode(messages);
                                    continue;
                                }
                            }

                            server.watcher.emit('change', absoluteFeaturePath);
                            console.log('✅ feature.ts updated.');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ok: true}));
                            return;
                        }
                    } finally {
                        server.watcher.add(absoluteFeaturePath);
                    }
                } catch (err) {
                    console.error('❌ Plugin error:', err.message || 'Unknown error');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ok: false, error: err.message}));
                }
            });

            server.middlewares.use('/api/analyze', async (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end();
                    return;
                }

                try {
                    const body = await new Promise((resolve) => {
                        let data = '';
                        req.on('data', chunk => data += chunk);
                        req.on('end', () => resolve(data));
                    });

                    console.log("[ANALYZE] Sending profile...");
                    const messages = [{
                        role: 'user',
                        content: body
                    }];
                    const analyzeRes = await mistralWithRetry({
                        agentId: env.VITE_AD_AGENT_ID,
                        messages,
                        responseFormat: {type: "json_object"},
                    });

                    const raw = analyzeRes.choices[0].message.content;
                    const cards = JSON.parse(raw);
                    console.log("[ANALYZE] Done.");

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({"cards": cards}));
                } catch (err) {
                    console.error('❌ Plugin error:', err.message || 'Unknown error');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ok: false, error: err.message}));
                }
            });
        }
    };
}
