import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import GoogleLayout from './components/layout/GoogleLayout'
import Dashboard from './pages/Dashboard'
import MasterSignals from './pages/MasterSignals'
import FinancialAdvisor from './pages/FinancialAdvisor'
import MarketNews from './pages/MarketNews'
import Portfolio from './pages/Portfolio'
import LoginPage from './pages/LoginPage'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

// Zod schemas for application state/props
const UserSchema = z.object({
    uid: z.string(),
    email: z.string().email().nullable(),
    displayName: z.string().nullable(),
    photoURL: z.string().url().nullable(),
}).nullable()

type UserType = z.infer<typeof UserSchema>

function AppContent() {
    const { user, loading } = useAuth()
    
    // Validate user object if needed, though useAuth already types it
    const validatedUser: UserType = UserSchema.parse(user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
    } : null)

    // Show loading spinner while checking auth state
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

    // Show login page if not authenticated
    if (!validatedUser && !e2eAuthBypass) {
        return <LoginPage />
    }

    // Show main app if authenticated
    return (
        <GoogleLayout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/signals" element={<MasterSignals />} />
                <Route path="/advisor" element={<FinancialAdvisor />} />
                <Route path="/news" element={<MarketNews />} />
                <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
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
