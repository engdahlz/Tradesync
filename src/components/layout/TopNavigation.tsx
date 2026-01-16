
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radio, Newspaper, Briefcase, Bot, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TopNavigation = () => {
    const { signOut, user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const navItems = [
        { path: '/', label: 'Översikt', icon: LayoutDashboard }, // Overview
        { path: '/signals', label: 'Signaler', icon: Radio },      // Signals
        { path: '/news', label: 'Nyheter', icon: Newspaper },    // News
        { path: '/portfolio', label: 'Min Ekonomi', icon: Briefcase }, // Portfolio
        { path: '/advisor', label: 'Rådgivare', icon: Bot },     // Advisor
    ];

    return (
        <nav className="bg-white border-b border-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo & Brand */}
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
                            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-lg">A</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-primary">AvanzaSync</span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                        }`
                                    }
                                >
                                    <item.icon className="w-4 h-4 mr-2" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: User & Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        <div className="text-sm text-right hidden lg:block">
                            <p className="font-medium text-foreground">{user?.displayName || 'Anonym'}</p>
                            <p className="text-xs text-muted-foreground">Private Banking</p>
                        </div>
                        <button
                            onClick={signOut}
                            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Logga ut"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border bg-white absolute w-full shadow-lg">
                    <div className="pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={({ isActive }) =>
                                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-muted-foreground hover:bg-muted hover:border-gray-300 hover:text-foreground'
                                    }`
                                }
                            >
                                <div className="flex items-center">
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </div>
                            </NavLink>
                        ))}
                        <button
                            onClick={signOut}
                            className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-destructive hover:bg-destructive/10 hover:border-destructive"
                        >
                            <div className="flex items-center">
                                <LogOut className="w-5 h-5 mr-3" />
                                Logga ut
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default TopNavigation;
