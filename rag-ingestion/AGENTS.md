# DATA PIPELINE KNOWLEDGE BASE

**Context:** rag-ingestion/ (RAG CLI Tools)
**Generated:** Wed Jan 21 2026

## OVERVIEW
CLI toolset for ingesting trading knowledge (Books, Articles, PDFs) into Firestore Vector Store.

## STRUCTURE
```
rag-ingestion/src/
├── ingest.ts         # Main CLI entry point
├── parsers.ts        # Document parsing logic
├── chunker.ts        # Text chunking strategies
├── embeddings.ts     # Vector generation (Vertex AI)
└── vectorStore.ts    # Firestore vector operations
```

## CONVENTIONS
- **Vector Search**: Uses Firestore `findNearest`.
- **Batching**: Firestore writes limited to 450 ops/batch.
- **Embeddings**: `gemini-embedding-001` (768 dimensions).

## COMMANDS
```bash
npm run ingest           # Ingest all
npm run ingest:books     # Ingest books only
npm run ingest -- --stats # View statistics
```
