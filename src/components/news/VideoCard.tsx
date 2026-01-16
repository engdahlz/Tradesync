import { useState } from 'react'
import { Loader2, TrendingUp, TrendingDown, Sparkles, AlertCircle, ExternalLink } from 'lucide-react'
import { analyzeVideo } from '@/services/api'

interface Video {
    id: string
    title: string
    channel: string
    description?: string // Added standard field
    youtubeId: string
    publishedAt: string
    analysis?: {
        sentiment: 'bullish' | 'bearish' | 'neutral'
        tickers: string[]
        targets: number[]
        supports: number[]
        summary: string
        keyPoints: string[]
        confidence: number
    }
}

interface VideoCardProps {
    video: Video
    onAnalysisComplete: (videoId: string, analysis: Video['analysis']) => void
}

export default function VideoCard({ video, onAnalysisComplete }: VideoCardProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPlayer, setShowPlayer] = useState(false)

    const handleAnalyze = async () => {
        setIsAnalyzing(true)
        setError(null)

        try {
            // Pass metadata for fallback if transcript fails
            const result = await analyzeVideo(
                `https://youtube.com/watch?v=${video.youtubeId}`,
                video.title,
                video.description
            )

            onAnalysisComplete(video.id, {
                sentiment: result.sentiment,
                tickers: result.tickers,
                targets: result.priceLevels.targets,
                supports: result.priceLevels.supports,
                summary: result.summary,
                keyPoints: result.keyPoints,
                confidence: result.confidence,
            })
        } catch (err) {
            console.error('Analysis failed:', err)
            setError('Analysis failed. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            {/* Video Player / Thumbnail */}
            <div className="relative aspect-video bg-muted">
                {showPlayer ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                        title={video.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <>
                        <img
                            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowPlayer(true)}
                        />
                        <button
                            onClick={() => setShowPlayer(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </button>
                    </>
                )}

                {/* Analysis Badge */}
                {video.analysis && (
                    <div className="absolute top-3 right-3">
                        <span
                            className={`badge ${video.analysis.sentiment === 'bullish'
                                ? 'badge-green'
                                : video.analysis.sentiment === 'bearish'
                                    ? 'badge-red'
                                    : 'badge-yellow'
                                }`}
                        >
                            {video.analysis.sentiment === 'bullish' ? (
                                <>
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Bullish ({Math.round(video.analysis.confidence * 100)}%)
                                </>
                            ) : video.analysis.sentiment === 'bearish' ? (
                                <>
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                    Bearish ({Math.round(video.analysis.confidence * 100)}%)
                                </>
                            ) : (
                                'Neutral'
                            )}
                        </span>
                    </div>
                )}

                {/* Channel / Time */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="text-xs text-white bg-black/70 px-2 py-1 rounded">
                        {video.channel}
                    </span>
                    <span className="text-xs text-white bg-black/70 px-2 py-1 rounded">
                        {video.publishedAt}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h4 className="font-medium text-white mb-3 line-clamp-2">{video.title}</h4>

                {/* Analysis Result */}
                {video.analysis && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs text-primary font-semibold uppercase mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Analysis Complete
                        </p>
                        <p className="text-sm text-slate-300 mb-2">{video.analysis.summary}</p>

                        {video.analysis.tickers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {video.analysis.tickers.map((ticker, i) => (
                                    <span key={i} className="text-xs font-mono bg-ts-blue/20 text-ts-blue px-2 py-1 rounded">
                                        ${ticker}
                                    </span>
                                ))}
                            </div>
                        )}

                        {video.analysis.keyPoints.length > 0 && (
                            <ul className="mt-2 text-xs text-slate-400 space-y-1">
                                {video.analysis.keyPoints.slice(0, 3).map((point, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                        <span className="text-ts-green">•</span>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="mb-3 p-2 bg-ts-red/10 border border-ts-red/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-ts-red flex-shrink-0" />
                        <p className="text-xs text-ts-red">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {!video.analysis && (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex-1 flex items-center justify-center gap-2 text-sm relative overflow-hidden font-medium transition-colors"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Analyzing with Gemini...</span>
                                    <div className="absolute bottom-0 left-0 h-1 bg-ts-green/50 animate-pulse" style={{ width: '60%' }} />
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    PROCESS NLP
                                </>
                            )}
                        </button>
                    )}

                    <a
                        href={`https://youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        YouTube
                    </a>
                </div>
            </div>
        </div>
    )
}
