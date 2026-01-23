
import { VertexAI } from '@google-cloud/vertexai';
import { Runner, InMemoryArtifactService, InMemoryMemoryService } from '@google/adk';
import { advisorAgent } from '../adk/agents/AdvisorAgent.js';
import { TradeSyncPlugin } from '../adk/plugins/TradeSyncPlugin.js';
import { FirestoreSessionService } from '../services/FirestoreSessionService.js';
import { db, MODEL_PRO } from '../config.js';

async function testWithADK() {
    console.log('\n--- Testing via ADK (AdvisorAgent) ---');
    const userId = 'test-user';
    const sessionId = 'test-session-adk-' + Date.now();
    
    const sessionService = new FirestoreSessionService(db);
    const runner = new Runner({
        agent: advisorAgent,
        appName: 'TradeSyncTest',
        plugins: [new TradeSyncPlugin()],
        sessionService,
        artifactService: new InMemoryArtifactService(),
        memoryService: new InMemoryMemoryService(),
    });

    await sessionService.createSession({ appName: 'TradeSyncTest', userId, sessionId });

    const message = 'Hello. Respond with "ADK-SUCCESS" and your model version.';
    try {
        for await (const event of runner.runAsync({
            userId,
            sessionId,
            newMessage: { role: 'user', parts: [{ text: message }] },
        })) {
            if (event.content?.parts?.[0] && 'text' in event.content.parts[0]) {
                const text = event.content.parts[0].text;
                if (text) process.stdout.write(text);
            }
        }
    } catch (error: any) {
        console.error('ADK Test Failed:', error.message);
    }
}

async function testWithVertex() {
    console.log('\n--- Testing via Direct Vertex AI SDK ---');
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'tradesync-ai-prod';
    const location = 'us-central1';
    const modelId = MODEL_PRO;

    console.log(`Project: ${project}, Location: ${location}, Model: ${modelId}`);

    const vertexAI = new VertexAI({ project, location });
    const generativeModel = vertexAI.getGenerativeModel({ model: modelId });

    try {
        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Respond with "VERTEX-SUCCESS" and your model version.' }] }],
        });
        console.log('Response:', result.response.candidates?.[0].content.parts[0].text);
    } catch (error: any) {
        console.error('Vertex AI Test Failed:', error.message);
    }
}

async function main() {
    console.log(`VERIFICATION SCRIPT: ${MODEL_PRO}`);
    
    if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.GCLOUD_PROJECT) {
        process.env.GOOGLE_CLOUD_PROJECT = process.env.GCLOUD_PROJECT;
    }

    await testWithVertex();
    await testWithADK();
    
    console.log('\nVerification complete.');
}

main().catch(console.error);
