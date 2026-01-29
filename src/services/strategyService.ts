import { API_BASE, CREATE_STRATEGY_PATH, GET_STRATEGIES_PATH, UPDATE_STRATEGY_PATH, DELETE_STRATEGY_PATH, GET_STRATEGY_LOGS_PATH } from './apiBase';
import { auth } from '@/config/firebase';

export interface Strategy {
    id: string;
    userId: string;
    name: string;
    assets: string[];
    interval: string;
    status: 'ACTIVE' | 'PAUSED';
    riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    maxPositionSize: number;
    mode: 'PAPER' | 'LIVE';
    lastRun?: any;
}

export interface StrategyLog {
    id: string;
    strategyId: string;
    timestamp: string;
    output: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
        throw new Error('Not authenticated');
    }
    return { Authorization: `Bearer ${token}` };
}

export async function createStrategy(strategy: Omit<Strategy, 'id' | 'userId' | 'lastRun'> & { userId: string }): Promise<Strategy> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_BASE}/${CREATE_STRATEGY_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(strategy),
    });
    if (!response.ok) throw new Error('Failed to create strategy');
    return response.json();
}

export async function getStrategies(userId: string): Promise<Strategy[]> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_BASE}/${GET_STRATEGIES_PATH}?userId=${userId}`, {
        headers: { ...authHeader },
    });
    if (!response.ok) throw new Error('Failed to fetch strategies');
    const data = await response.json();
    return data.strategies;
}

export async function updateStrategy(id: string, updates: Partial<Strategy>): Promise<void> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_BASE}/${UPDATE_STRATEGY_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ id, ...updates }),
    });
    if (!response.ok) throw new Error('Failed to update strategy');
}

export async function deleteStrategy(id: string): Promise<void> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_BASE}/${DELETE_STRATEGY_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Failed to delete strategy');
}

export async function getStrategyLogs(userId: string, limit = 20, strategyId?: string): Promise<StrategyLog[]> {
    const authHeader = await getAuthHeader();
    const params = new URLSearchParams({
        userId,
        limit: String(limit),
    });
    if (strategyId) params.set('strategyId', strategyId);
    const response = await fetch(`${API_BASE}/${GET_STRATEGY_LOGS_PATH}?${params.toString()}`, {
        headers: { ...authHeader },
    });
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    return data.logs;
}
