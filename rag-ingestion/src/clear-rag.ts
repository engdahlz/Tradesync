import { Firestore } from '@google-cloud/firestore'
import dotenv from 'dotenv'

dotenv.config()

const db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT })

async function deleteCollection(collectionPath: string): Promise<number> {
    const collectionRef = db.collection(collectionPath)
    const batchSize = 450
    let totalDeleted = 0

    while (true) {
        const snapshot = await collectionRef.limit(batchSize).get()
        
        if (snapshot.empty) {
            break
        }

        const batch = db.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        
        totalDeleted += snapshot.size
        console.log(`  Deleted ${totalDeleted} documents from ${collectionPath}...`)
    }

    return totalDeleted
}

async function clearRAGData() {
    console.log('🗑️  CLEARING RAG DATA FOR RE-INGESTION')
    console.log('═'.repeat(60))
    console.log('This will delete all existing chunks and sources')
    console.log('to allow fresh ingestion with gemini-embedding-001')
    console.log('═'.repeat(60))
    
    console.log('\n📦 Deleting rag_chunks...')
    const chunksDeleted = await deleteCollection('rag_chunks')
    console.log(`   ✅ Deleted ${chunksDeleted} chunks`)
    
    console.log('\n📦 Deleting rag_sources...')
    const sourcesDeleted = await deleteCollection('rag_sources')
    console.log(`   ✅ Deleted ${sourcesDeleted} sources`)
    
    console.log('\n═'.repeat(60))
    console.log('🎉 RAG data cleared! Ready for re-ingestion.')
    console.log('   Run: npm run ingest')
    console.log('═'.repeat(60))
}

clearRAGData().catch(console.error)
