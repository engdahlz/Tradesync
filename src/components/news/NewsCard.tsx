/**
 * News Card Component
 * Displays a single news article with image, title, and AI analysis option
 */

import { useState } from 'react';
import { ExternalLink, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { NewsArticle } from '@/services/newsApi';

interface NewsCardProps {
    article: NewsArticle;
    analysis?: {
        sentiment: 'bullish' | 'bearish' | 'neutral';
        confidence: number;
        summary: string;
        tickers: string[];
    };
    onAnalyze: (article: NewsArticle) => Promise<void>;
}

export default function NewsCard({ article, analysis, onAnalyze }: NewsCardProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            await onAnalyze(article);
        } catch (err) {
            setError('Analysis failed');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getSentimentBadge = () => {
        // Use AI analysis result OR native Alpha Vantage sentiment
        const sentiment = analysis?.sentiment || article.sentiment || 'neutral';
        // Use analysis confidence OR map AV score (0.15 -> 15%)
        // AV score is -1 to 1. Abs value?
        // AV: <= -0.35 Bearish, >= 0.35 Bullish.
        // Let's use generic confidence if native.
        let confidence = analysis?.confidence;

        if (!confidence && article.sentimentScore !== undefined) {
            confidence = Math.abs(article.sentimentScore);
        }

        const config = {
            bullish: { icon: TrendingUp, color: 'text-ts-green bg-ts-green/20', label: 'Bullish' },
            bearish: { icon: TrendingDown, color: 'text-ts-red bg-ts-red/20', label: 'Bearish' },
            neutral: { icon: Minus, color: 'text-ts-yellow bg-ts-yellow/20', label: 'Neutral' },
        };

        const { icon: Icon, color, label } = config[sentiment] || config.neutral;

        return (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
                {confidence !== undefined && (
                    <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
                )}
            </div>
        );
    };

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden group shadow-sm">
            {/* Image */}
            <div className="relative h-40 bg-muted overflow-hidden">
                {article.imageUrl ? (
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ts-blue/20 to-ts-purple/20">
                        <span className="text-4xl font-bold text-white/20">{article.source.charAt(0)}</span>
                    </div>
                )}

                {/* Sentiment Badge */}
                {getSentimentBadge()}

                {/* Source Badge */}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white">
                    {article.source}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {article.description}
                </p>

                {/* Analysis Result */}
                {analysis && (
                    <div className="p-3 bg-muted/50 rounded-lg mb-3">
                        <p className="text-sm text-foreground">{analysis.summary}</p>
                        {analysis.tickers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {analysis.tickers.map(ticker => (
                                    <span key={ticker} className="px-2 py-0.5 rounded text-xs bg-ts-blue/20 text-ts-blue">
                                        {ticker}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-ts-red text-sm mb-3">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !!analysis}
                        className={`flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm flex items-center justify-center gap-2 font-medium transition-colors ${analysis ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : analysis ? (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Analyzed
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                AI Analysis
                            </>
                        )}
                    </button>

                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                {/* Meta */}
                <p className="text-xs text-slate-500 mt-3">
                    {article.relativeTime}
                </p>
            </div>
        </div>
    );
}
