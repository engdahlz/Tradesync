import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * ErrorBoundary - Catches React rendering errors and shows a fallback UI
 * Without this, ANY error in a child component crashes the entire app to white screen
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error)
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-card border border-border rounded-lg">
                    <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
