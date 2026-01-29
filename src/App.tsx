import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import GoogleLayout from './components/layout/GoogleLayout'
import LoginPage from './pages/LoginPage'
import PageTransition from './components/layout/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import { Loader2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const MasterSignals = lazy(() => import('./pages/MasterSignals'))
const FinancialAdvisor = lazy(() => import('./pages/FinancialAdvisor'))
const MarketNews = lazy(() => import('./pages/MarketNews'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const AICenter = lazy(() => import('./pages/AICenter'))
const AutoPilot = lazy(() => import('./pages/AutoPilot'))

function AppContent() {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex h-screen w-screen bg-background items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground">Loading Finance...</p>
                </div>
            </div>
        )
    }

    const e2eAuthBypass = import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === '1'

    if (!user && !e2eAuthBypass) {
        return <LoginPage />
    }

    return (
        <GoogleLayout>
            <ErrorBoundary>
                <Suspense
                    fallback={
                        <div className="flex h-[60vh] items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    }
                >
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                            <Route path="/ai" element={<PageTransition><AICenter /></PageTransition>} />
                            <Route path="/autopilot" element={<PageTransition><AutoPilot /></PageTransition>} />
                            <Route path="/signals" element={<PageTransition><MasterSignals /></PageTransition>} />
                            <Route path="/advisor" element={<PageTransition><FinancialAdvisor /></PageTransition>} />
                            <Route path="/news" element={<PageTransition><MarketNews /></PageTransition>} />
                            <Route path="/portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
                        </Routes>
                    </AnimatePresence>
                </Suspense>
            </ErrorBoundary>
        </GoogleLayout>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
