import { useState, useEffect } from 'react'
import { Newspaper, Loader2, AlertCircle, Search } from 'lucide-react'
import VideoCard from '../components/news/VideoCard'
import NewsCard from '../components/news/NewsCard'
import { fetchCryptoNews, fetchTopHeadlines, NewsArticle } from '@/services/newsApi'
import { analyzeNews, NewsAnalysisResponse } from '@/services/api'
import { searchVideos, Video } from '@/services/youtubeApi'

export default function MarketNews() {
    const [activeTab, setActiveTab] = useState<'headlines' | 'crypto' | 'videos'>('crypto')
    const [news, setNews] = useState<NewsArticle[]>([])
    const [videos, setVideos] = useState<Video[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [analyzedNews, setAnalyzedNews] = useState<Record<string, NewsAnalysisResponse>>({})

    // Video Search State
    const [videoQuery, setVideoQuery] = useState('')
    const [isSearchingVideos, setIsSearchingVideos] = useState(false)

    const loadNews = async () => {
        setIsLoading(true)
        setError(null)
        try {
            let response;
            if (activeTab === 'headlines') {
                response = await fetchTopHeadlines();
            } else {
                response = await fetchCryptoNews({ query: 'bitcoin OR ethereum OR trading OR stocks' });
            }
            setNews(response.articles);
        } catch (err) {
            console.error('Failed to load news:', err);
            setError('Failed to fetch latest news. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVideoSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!videoQuery.trim()) return

        setIsSearchingVideos(true)
        try {
            const results = await searchVideos(videoQuery)
            setVideos(results)
        } catch (err) {
            console.error('Video search failed:', err)
        } finally {
            setIsSearchingVideos(false)
        }
    }

    useEffect(() => {
        if (activeTab !== 'videos') {
            loadNews();
        } else if (videos.length === 0 && !isSearchingVideos) {
            // Auto-load crypto videos on first tab visit
            const initialSearch = async () => {
                setIsSearchingVideos(true);
                try {
                    // Use a generic but relevant query
                    const results = await searchVideos('Crypto Trading Analysis');
                    setVideos(results);
                } catch (err) {
                    console.error('Initial video load failed:', err);
                } finally {
                    setIsSearchingVideos(false);
                }
            };
            initialSearch();
        }
    }, [activeTab]);

    const handleVideoAnalysisComplete = (videoId: string, analysis: Video['analysis']) => {
        setVideos(prev =>
            prev.map(v => v.id === videoId ? { ...v, analysis } : v)
        )
    }

    const handleNewsAnalysis = async (article: NewsArticle) => {
        try {
            const analysis = await analyzeNews({
                title: article.title,
                description: article.description,
                content: article.summary,
                source: article.source
            });
            setAnalyzedNews(prev => ({
                ...prev,
                [article.id]: analysis
            }));
        } catch (error) {
            console.error('Analysis failed:', error);
            throw error;
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Newspaper className="w-7 h-7 text-primary" />
                        Market News
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        AI-powered financial news & video analysis
                    </p>
                </div>

                <div className="flex bg-muted p-1 rounded-xl">
                    {(['crypto', 'headlines', 'videos'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Video Search Bar */}
            {activeTab === 'videos' && (
                <form onSubmit={handleVideoSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={videoQuery}
                            onChange={(e) => setVideoQuery(e.target.value)}
                            placeholder="Search ticker (e.g. BTC, NVDA)..."
                            className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearchingVideos}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
                    >
                        {isSearchingVideos ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Search
                    </button>
                </form>
            )}

            {/* Content */}
            {activeTab === 'videos' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            onAnalysisComplete={handleVideoAnalysisComplete}
                        />
                    ))}
                    {videos.length === 0 && !isSearchingVideos && (
                        <div className="col-span-2 text-center py-20 text-slate-400">
                            No videos found. Try searching for a ticker.
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* News Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-ts-blue animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-center">
                            <div>
                                <AlertCircle className="w-8 h-8 text-ts-red mx-auto mb-2" />
                                <p className="text-slate-400 mb-4">{error}</p>
                                <button onClick={loadNews} className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium">Retry</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {news.map((article) => (
                                <NewsCard
                                    key={article.id}
                                    article={article}
                                    analysis={analyzedNews[article.id]}
                                    onAnalyze={handleNewsAnalysis}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
