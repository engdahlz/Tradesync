import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, MessageSquare, Settings } from 'lucide-react'
import AIChatPanel from './AIChatPanel'

export default function GoogleLayout({ children }: { children: React.ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const location = useLocation()
    const navigate = useNavigate()

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Market Trends', path: '/signals' },
        { label: 'Portfolio', path: '/portfolio' },
        { label: 'News', path: '/news' },
    ]

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement global search logic
        console.log('Searching for:', searchQuery)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Bar (Google Style) */}
            <header className="h-[64px] border-b border-border bg-card flex items-center px-4 md:px-6 sticky top-0 z-40">
                <div className="flex items-center gap-4 w-full max-w-[1440px] mx-auto">
                    {/* Brand */}
                    <div className="flex items-center gap-2 mr-8 cursor-pointer" onClick={() => navigate('/')}>
                        <span className="text-xl md:text-2xl font-normal text-muted-foreground">Google</span>
                        <span className="text-xl md:text-2xl font-medium text-foreground -ml-1">Finance</span>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4">
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for stocks, ETFs & more"
                                className="w-full bg-secondary hover:bg-white hover:shadow-md focus:bg-white focus:shadow-md border-transparent focus:border-border rounded-lg pl-11 pr-4 py-3 text-base transition-all outline-none"
                            />
                        </div>
                    </form>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 md:gap-4 ml-auto">
                        {/* Chat Toggle */}
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`p-2 rounded-full transition-colors relative ${isChatOpen ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'
                                }`}
                        >
                            <MessageSquare className="w-5 h-5" />
                            {!isChatOpen && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                            )}
                        </button>

                        <button className="p-2 hover:bg-secondary rounded-full text-muted-foreground">
                            <Settings className="w-5 h-5" />
                        </button>

                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium cursor-pointer">
                            A
                        </div>
                    </div>
                </div>
            </header>

            {/* Secondary Nav Bar (Tabs) */}
            <nav className="border-b border-border bg-card sticky top-[64px] z-30 overflow-x-auto hide-scrollbar">
                <div className="max-w-[1440px] mx-auto px-4 md:px-6 flex items-center gap-1 h-12">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 h-full flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex flex-1 max-w-[1440px] w-full mx-auto">
                <main className="flex-1 w-full p-4 md:p-6 pb-20">
                    {children}
                </main>

                {/* Intelligent Chat Panel */}
                <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            </div>
        </div>
    )
}
