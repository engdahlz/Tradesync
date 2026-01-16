# Trade/Sync RAG Ingestion

This module handles ingestion of trading knowledge sources into Firestore for RAG-based retrieval.

## Setup

```bash
cd rag-ingestion
npm install
```

## Environment Variables

Create a `.env` file:

```env
GOOGLE_AI_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_PROJECT=your-firebase-project-id
```

## Usage

### Ingest All Sources
```bash
npm run ingest
```

### Ingest Specific Type
```bash
npm run ingest:books     # Trading books (PDFs)
npm run ingest:articles  # Web articles (text)
npm run ingest:pdfs      # Academic papers
```

### Check Statistics
```bash
npm run ingest -- --stats
```

## Source Structure

```
rag-sources/RAG Sources/downloads/
├── books/          # 12 trading books (305MB)
├── articles/       # 30 web articles
├── pdfs/           # 18 academic papers
└── github/         # Code examples, datasets
```

## Key Books Included

- The Intelligent Investor (Graham)
- Trading in the Zone (Mark Douglas)
- Security Analysis (Graham & Dodd)
- Market Wizards (Jack Schwager)
- Quantitative Trading (Chan)
- Advances in Financial ML (Lopez de Prado)
