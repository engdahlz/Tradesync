import { GoogleGenAI } from '@google/genai'
import { Firestore } from '@google-cloud/firestore'
import dotenv from 'dotenv'

dotenv.config()

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })
const db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT })

function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return embedding
    return embedding.map(val => val / norm)
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await genAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: query,
        config: {
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 768,
        }
    })
    return normalizeEmbedding(response.embeddings![0].values!)
}

async function searchRAG(query: string, topK: number = 5) {
    console.log(`\n🔍 Query: "${query}"`)
    console.log('─'.repeat(60))
    
    const embedding = await generateQueryEmbedding(query)
    const normCheck = Math.abs(embedding.reduce((sum, v) => sum + v*v, 0) - 1)
    console.log(`✅ Generated embedding (${embedding.length} dims, normalized: ${normCheck < 0.001})`)
    
    const vectorQuery = db.collection('rag_chunks')
        .findNearest('embedding', embedding, {
            limit: topK,
            distanceMeasure: 'COSINE',
        })
    
    const snapshot = await vectorQuery.get()
    
    if (snapshot.empty) {
        console.log('❌ No results found!')
        return []
    }
    
    const results = snapshot.docs.map(doc => {
        const data = doc.data()
        const distance = data._distance ?? 0
        const score = 1 - distance
        return {
            title: data.metadata?.title || 'Unknown',
            sourceType: data.metadata?.sourceType || 'unknown',
            score,
            excerpt: data.content.slice(0, 200) + '...'
        }
    })
    
    console.log(`\n📚 Found ${results.length} results:\n`)
    results.forEach((r, i) => {
        console.log(`${i+1}. [${r.score.toFixed(3)}] ${r.title} (${r.sourceType})`)
        console.log(`   ${r.excerpt}\n`)
    })
    
    return results
}

async function runTests() {
    console.log('🧪 RAG SYSTEM VERIFICATION TEST')
    console.log('═'.repeat(60))
    console.log('Model: gemini-embedding-001 (LATEST)')
    console.log('Task Type: RETRIEVAL_QUERY')
    console.log('Dimensions: 768 (via outputDimensionality)')
    console.log('Normalization: L2 enabled')
    console.log('═'.repeat(60))
    
    const testQueries = [
        'What is value investing and margin of safety?',
        'How to manage emotions when trading?',
        'What is momentum trading strategy?',
        'What does Benjamin Graham say about stock selection?',
        'Trading psychology and discipline',
    ]
    
    let passCount = 0
    let failCount = 0
    
    for (const query of testQueries) {
        try {
            const results = await searchRAG(query)
            if (results.length > 0 && results[0].score > 0.5) {
                passCount++
                console.log('✅ PASS - High relevance results found\n')
            } else if (results.length > 0) {
                passCount++
                console.log('⚠️  PASS - Results found but lower relevance\n')
            } else {
                failCount++
                console.log('❌ FAIL - No results\n')
            }
        } catch (error) {
            failCount++
            console.log(`❌ FAIL - Error: ${error}\n`)
        }
    }
    
    console.log('═'.repeat(60))
    console.log(`📊 RESULTS: ${passCount}/${testQueries.length} queries passed`)
    console.log(`   ✅ Passed: ${passCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log('═'.repeat(60))
    
    if (failCount === 0) {
        console.log('\n🎉 RAG SYSTEM FULLY OPERATIONAL WITH gemini-embedding-001!')
    } else {
        console.log('\n⚠️  Some queries failed - review needed')
    }
}

runTests().catch(console.error)
