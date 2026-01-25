import { GoogleAuth } from 'google-auth-library';

type VertexSearchResult = {
    title: string;
    uri?: string;
    snippet?: string;
    score?: number;
    source?: string;
};

type VertexRagChunk = {
    content: string;
    source?: string;
    score?: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token;
    }

    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
    if (!token) {
        throw new Error('Failed to obtain GCP access token.');
    }
    cachedToken = {
        token,
        expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return token;
}

function getVertexSearchEndpoint(): string {
    const explicit = process.env.VERTEX_AI_SEARCH_ENDPOINT;
    if (explicit) return explicit;

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_SEARCH_LOCATION || 'global';
    const dataStoreId = process.env.VERTEX_AI_SEARCH_DATASTORE_ID;
    const servingConfig = process.env.VERTEX_AI_SEARCH_SERVING_CONFIG || 'default_search';
    if (!project || !dataStoreId) {
        throw new Error('Vertex AI Search requires GOOGLE_CLOUD_PROJECT and VERTEX_AI_SEARCH_DATASTORE_ID.');
    }
    return `https://discoveryengine.googleapis.com/v1/projects/${project}/locations/${location}/dataStores/${dataStoreId}/servingConfigs/${servingConfig}:search`;
}

function getVertexRagEndpoint(): string {
    const explicit = process.env.VERTEX_RAG_RETRIEVAL_ENDPOINT;
    if (explicit) return explicit;

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_RAG_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const corpusId = process.env.VERTEX_RAG_CORPUS_ID;
    if (!project || !corpusId) {
        throw new Error('Vertex AI RAG requires GOOGLE_CLOUD_PROJECT and VERTEX_RAG_CORPUS_ID.');
    }
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/ragCorpora/${corpusId}:retrieve`;
}

export async function vertexSearch(query: string, pageSize: number = 5): Promise<VertexSearchResult[]> {
    const endpoint = getVertexSearchEndpoint();
    const token = await getAccessToken();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            query,
            pageSize,
            contentSearchSpec: {
                snippetSpec: { maxSnippetCount: 1 },
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Vertex AI Search error: ${response.status}`);
    }

    const data = await response.json() as any;
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((item: any) => {
        const doc = item.document || {};
        const derived = doc.derivedStructData || {};
        return {
            title: derived.title || doc.title || doc.name || 'Vertex AI Search Result',
            uri: derived.link || derived.url || doc.uri,
            snippet: derived.snippet || (derived.extractive_answers?.[0]?.content ?? ''),
            score: item.relevanceScore ?? item.score,
            source: derived.source || derived.publisher,
        };
    });
}

export async function vertexRagRetrieve(query: string, topK: number = 5): Promise<VertexRagChunk[]> {
    const endpoint = getVertexRagEndpoint();
    const token = await getAccessToken();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            query: { text: query },
            topK,
        }),
    });

    if (!response.ok) {
        throw new Error(`Vertex AI RAG error: ${response.status}`);
    }

    const data = await response.json() as any;
    const chunks = data?.retrievedContexts || data?.contexts || data?.results || [];
    return chunks.map((chunk: any) => ({
        content: chunk.text || chunk.content || chunk?.chunk?.text || '',
        source: chunk.source || chunk.uri || chunk.document?.title || 'Vertex AI RAG',
        score: chunk.score ?? chunk.similarity ?? chunk.distance,
    })).filter((item: VertexRagChunk) => item.content);
}
