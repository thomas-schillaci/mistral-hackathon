import Mistral from '@mistralai/mistralai';
import { QueryClient, MutationObserver } from '@tanstack/query-core';

export interface FeatureCard {
    title: string;
    flavor_text: string;
    description: string;
    game_systems_touched: string[];
}

const client = new Mistral({ apiKey: import.meta.env.VITE_MISTRAL_API_KEY as string });
const queryClient = new QueryClient();

async function runPipeline(profileJSON: object, achievementId: string): Promise<FeatureCard[]> {
    // STEP 1 — ANALYST
    console.log("[ANALYST] Sending profile...");
    const analystRes = await client.agents.complete({
        agentId: import.meta.env.VITE_ANALYST_AGENT_ID as string,
        messages: [{ role: "user", content: JSON.stringify(profileJSON) + "\nAchievement earned: " + achievementId }],
    });
    const behavioralBrief = analystRes.choices![0].message.content as string;
    console.log("[ANALYST] Brief:", behavioralBrief);

    // STEP 2 — DESIGNER
    console.log("[DESIGNER] Sending brief...");
    const designerRes = await client.agents.complete({
        agentId: import.meta.env.VITE_DESIGNER_AGENT_ID as string,
        messages: [{ role: "user", content: behavioralBrief }],
    });
    const raw = designerRes.choices![0].message.content as string;
    const cards = JSON.parse(raw) as FeatureCard[];
    console.log("[DESIGNER] Cards:", JSON.stringify(cards, null, 2));
    return cards;
}

const mutation = new MutationObserver(queryClient, {
    mutationFn: ({ profileJSON, achievementId }: { profileJSON: object; achievementId: string }) =>
        runPipeline(profileJSON, achievementId),
    onSuccess: (cards) => console.log("[GAME] Cards received:", cards),
    onError: (err) => console.error("[GAME] Pipeline failed:", err),
});

export function generateCards(profileJSON: object, achievementId: string): void {
    if (mutation.getCurrentResult().status === 'pending') return;
    mutation.mutate({ profileJSON, achievementId });
}
