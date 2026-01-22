import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import GoogleLayout from './components/layout/GoogleLayout'
import Dashboard from './pages/Dashboard'
import MasterSignals from './pages/MasterSignals'
import FinancialAdvisor from './pages/FinancialAdvisor'
import MarketNews from './pages/MarketNews'
import Portfolio from './pages/Portfolio'
import GeminiTest from './pages/GeminiTest'
import LoginPage from './pages/LoginPage'
import PageTransition from './components/layout/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import { Loader2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

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
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                        <Route path="/signals" element={<PageTransition><MasterSignals /></PageTransition>} />
                        <Route path="/advisor" element={<PageTransition><FinancialAdvisor /></PageTransition>} />
                        <Route path="/news" element={<PageTransition><MarketNews /></PageTransition>} />
                        <Route path="/portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
                        <Route path="/gemini-test" element={<PageTransition><GeminiTest /></PageTransition>} />
                    </Routes>
                </AnimatePresence>
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
