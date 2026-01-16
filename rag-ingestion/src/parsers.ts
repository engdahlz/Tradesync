/**
 * Document parsers for RAG ingestion
 * Supports: PDF, TXT, Markdown
 */

import { readFile } from 'fs/promises'
import { extname } from 'path'

// Dynamic import for pdf-parse (CommonJS module)
let pdfParse: typeof import('pdf-parse') | null = null

async function getPdfParser() {
    if (!pdfParse) {
        pdfParse = (await import('pdf-parse')).default
    }
    return pdfParse
}

export interface ParsedDocument {
    content: string
    title: string
    pageCount?: number
    metadata: Record<string, unknown>
}

/**
 * Parse a PDF file
 */
export async function parsePdf(filePath: string): Promise<ParsedDocument> {
    const parser = await getPdfParser()
    const buffer = await readFile(filePath)

    const data = await parser(buffer)

    return {
        content: data.text,
        title: extractTitleFromPath(filePath),
        pageCount: data.numpages,
        metadata: {
            author: data.info?.Author,
            creator: data.info?.Creator,
            producer: data.info?.Producer,
            creationDate: data.info?.CreationDate,
        }
    }
}

/**
 * Parse a text file
 */
export async function parseTextFile(filePath: string): Promise<ParsedDocument> {
    const content = await readFile(filePath, 'utf-8')

    // Try to extract title from first line if it looks like a header
    const lines = content.split('\n')
    let title = extractTitleFromPath(filePath)

    // Check for TITEL: prefix (from the scraper)
    const titleLine = lines.find(l => l.startsWith('TITEL:'))
    if (titleLine) {
        title = titleLine.replace('TITEL:', '').trim()
    }

    // Check for source URL
    const sourceLine = lines.find(l => l.startsWith('KÄLLA:') || l.startsWith('SOURCE:'))
    const sourceUrl = sourceLine?.replace(/^(KÄLLA|SOURCE):/, '').trim()

    return {
        content,
        title,
        metadata: {
            sourceUrl,
            fileType: extname(filePath).slice(1),
        }
    }
}

/**
 * Parse a markdown file
 */
export async function parseMarkdown(filePath: string): Promise<ParsedDocument> {
    const content = await readFile(filePath, 'utf-8')

    // Extract title from first H1
    const h1Match = content.match(/^#\s+(.+)$/m)
    const title = h1Match ? h1Match[1] : extractTitleFromPath(filePath)

    // Remove markdown formatting for cleaner text
    const cleanContent = content
        .replace(/^#{1,6}\s+/gm, '') // Remove headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
        .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
        .replace(/`(.+?)`/g, '$1') // Remove inline code

    return {
        content: cleanContent,
        title,
        metadata: {
            fileType: 'markdown',
        }
    }
}

/**
 * Extract a clean title from file path
 */
function extractTitleFromPath(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath

    return filename
        .replace(/^\d+_/, '') // Remove leading number prefix
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/_/g, ' ') // Replace underscores
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
}

/**
 * Auto-detect and parse document
 */
export async function parseDocument(filePath: string): Promise<ParsedDocument> {
    const ext = extname(filePath).toLowerCase()

    switch (ext) {
        case '.pdf':
            return parsePdf(filePath)
        case '.md':
            return parseMarkdown(filePath)
        case '.txt':
        case '.csv':
            return parseTextFile(filePath)
        default:
            // Try as text
            return parseTextFile(filePath)
    }
}
