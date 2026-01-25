import { GoogleGenAI } from '@google/genai'
import { Firestore } from '@google-cloud/firestore'
import dotenv from 'dotenv'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

dotenv.config()

type EvalCase = {
    query: string
    expect?: string[]
}

type EvalResult = {
    query: string
    topScore: number
    matched?: string
    passed: boolean
}

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001'
const EMBEDDING_DIMENSION = Number.isFinite(Number(process.env.EMBEDDING_DIMENSION))
    ? Number(process.env.EMBEDDING_DIMENSION)
    : 768
const TOP_K = Number.isFinite(Number(process.env.RAG_EVAL_TOP_K))
    ? Number(process.env.RAG_EVAL_TOP_K)
    : 5
const SCORE_THRESHOLD = Number.isFinite(Number(process.env.RAG_EVAL_SCORE_THRESHOLD))
    ? Number(process.env.RAG_EVAL_SCORE_THRESHOLD)
    : 0.75

function getGenAIClient(): GoogleGenAI {
    const useVertex = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || '').toLowerCase() === 'true'
    const apiKey = process.env.GOOGLE_AI_API_KEY

    if (useVertex) {
        const project = process.env.GOOGLE_CLOUD_PROJECT
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
        if (!project) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI')
        }
        return new GoogleGenAI({ vertexai: true, project, location })
    }

    if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY environment variable is required')
    }

    return new GoogleGenAI({ apiKey, vertexai: false })
}

const genAI = getGenAIClient()
const db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT })

function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return embedding
    return embedding.map(val => val / norm)
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
    const outputDimensionality = EMBEDDING_DIMENSION > 0 ? EMBEDDING_DIMENSION : undefined
    const response = await genAI.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: query,
        config: {
            taskType: 'RETRIEVAL_QUERY',
            ...(outputDimensionality ? { outputDimensionality } : {}),
        }
    })
    return normalizeEmbedding(response.embeddings![0].values!)
}

async function searchRAG(query: string, topK: number) {
    const embedding = await generateQueryEmbedding(query)
    const vectorQuery = db.collection('rag_chunks')
        .findNearest('embedding', embedding, {
            limit: topK,
            distanceMeasure: 'COSINE',
        })

    const snapshot = await vectorQuery.get()
    if (snapshot.empty) return []

    return snapshot.docs.map(doc => {
        const data = doc.data()
        const distance = data._distance ?? data.distance ?? 0
        const score = 1 - distance
        return {
            title: data.metadata?.title || 'Unknown',
            sourceType: data.metadata?.sourceType || 'unknown',
            score,
            excerpt: data.content?.slice(0, 240) || ''
        }
    })
}

function evaluateMatch(results: Array<{ title: string; excerpt: string }>, expected: string[]): string | null {
    const haystack = results
        .map(r => `${r.title} ${r.excerpt}`.toLowerCase())
        .join(' ')

    for (const needle of expected) {
        if (haystack.includes(needle.toLowerCase())) {
            return needle
        }
    }
    return null
}

async function runEvaluation() {
    const evalPath = process.env.RAG_EVAL_DATA
        ? resolve(process.env.RAG_EVAL_DATA)
        : resolve('eval/benchmark.json')

    const raw = await readFile(evalPath, 'utf-8')
    const cases: EvalCase[] = JSON.parse(raw)

    console.log('🧪 RAG EVALUATION RUN')
    console.log('═'.repeat(60))
    console.log(`Model: ${EMBEDDING_MODEL}`)
    console.log(`TopK: ${TOP_K}`)
    console.log(`Score threshold: ${SCORE_THRESHOLD}`)
    console.log(`Cases: ${cases.length}`)
    console.log('═'.repeat(60))

    const results: EvalResult[] = []

    for (const item of cases) {
        const hits = await searchRAG(item.query, TOP_K)
        const topScore = hits[0]?.score ?? 0
        const expected = item.expect || []
        let passed = false
        let matched: string | undefined

        if (expected.length > 0) {
            const match = evaluateMatch(hits, expected)
            if (match) {
                passed = true
                matched = match
            }
        } else {
            passed = topScore >= SCORE_THRESHOLD
        }

        results.push({
            query: item.query,
            topScore,
            matched,
            passed,
        })

        const status = passed ? '✅ PASS' : '❌ FAIL'
        console.log(`${status} | ${item.query} (topScore: ${topScore.toFixed(3)})`)
        if (matched) {
            console.log(`   matched: ${matched}`)
        }
    }

    const passCount = results.filter(r => r.passed).length
    const avgScore = results.reduce((sum, r) => sum + r.topScore, 0) / Math.max(results.length, 1)

    console.log('═'.repeat(60))
    console.log(`Pass rate: ${passCount}/${results.length}`)
    console.log(`Avg top score: ${avgScore.toFixed(3)}`)
    console.log('═'.repeat(60))

    const outputPath = process.env.RAG_EVAL_OUTPUT
    if (outputPath) {
        await writeFile(outputPath, JSON.stringify({ results, passCount, avgScore }, null, 2), 'utf-8')
        console.log(`Saved results to ${outputPath}`)
    }
}

runEvaluation().catch(error => {
    console.error('Evaluation failed:', error)
    process.exit(1)
})
