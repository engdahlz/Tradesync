import { Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Zap,
    MessageSquare,
    Newspaper,
    Wallet,
    Settings,
    TrendingUp,
    LogOut,
    User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/signals', label: 'Master Signals', icon: Zap },
    { path: '/advisor', label: 'Financial Advisor', icon: MessageSquare },
    { path: '/news', label: 'Market News', icon: Newspaper },
    { path: '/portfolio', label: 'Portfolio', icon: Wallet },
]

export default function Sidebar() {
    const location = useLocation()
    const { user, signOut } = useAuth()

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Sign out failed:', error)
        }
    }

    return (
        <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-border">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">
                            Trade/Sync
                        </h1>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-3">
                    Main Menu
                </p>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 group ${isActive
                                ? 'bg-secondary text-secondary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Live Status */}
            <div className="p-4 m-4 border border-border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live Market Status</span>
                </div>
                <p className="text-sm font-medium text-foreground">Markets Open</p>
                <p className="text-xs text-muted-foreground mt-1">BTC/USDT streaming...</p>
            </div>

            {/* User Profile */}
            {user && (
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="Profile"
                                className="w-8 h-8 rounded-full border border-border"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user.displayName || 'Trader'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Link
                            to="/settings"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-all text-xs font-medium"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Settings
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-all text-xs font-medium"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </aside>
    )
}

