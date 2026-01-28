export const enableGoogleSearch = process.env.ENABLE_GOOGLE_SEARCH !== 'false';
export const enableVertexSearch = !!process.env.VERTEX_AI_SEARCH_DATASTORE_ID;
export const enableVertexRag = !!process.env.VERTEX_RAG_CORPUS_ID;
