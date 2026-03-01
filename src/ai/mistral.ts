import {Mistral} from '@mistralai/mistralai';
import type {FeatureCard} from '../game/ui/CardPane';

export type {FeatureCard};

const client = new Mistral({apiKey: import.meta.env.VITE_MISTRAL_API_KEY as string});

export async function generateCards(profileJSON: object): Promise<FeatureCard[]> {
    // STEP 1 — ANALYST
    console.log("[ANALYST] Sending profile...");
    const analystRes = await client.agents.complete({
        agentId: import.meta.env.VITE_ANALYST_AGENT_ID as string,
        messages: [{role: "user", content: JSON.stringify(profileJSON)}],
    });
    const behavioralBrief = analystRes.choices![0].message.content as string;
    console.log("[ANALYST] Brief:", behavioralBrief);

    // STEP 2 — DESIGNER
    console.log("[DESIGNER] Sending brief...");
    const designerRes = await client.agents.complete({
        agentId: import.meta.env.VITE_DESIGNER_AGENT_ID as string,
        messages: [{role: "user", content: behavioralBrief}],
        responseFormat: {type: "json_object"},
    });
    const raw = designerRes.choices![0].message.content as string;
    const cards = JSON.parse(raw) as FeatureCard[];
    console.log("[DESIGNER] Cards:", cards);
    return cards;
}
