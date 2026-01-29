import type { Request, Response } from 'express';
import { db, StrategySchema, FieldValue } from '../config.js';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';

const CreateStrategySchema = StrategySchema.omit({ id: true, lastRun: true });
const UpdateStrategySchema = StrategySchema.partial().omit({ id: true, userId: true });

async function requireUser(req: Request, res: Response): Promise<string | null> {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) {
        res.status(401).json({ error: 'Missing auth token' });
        return null;
    }

    try {
        const decoded = await getAuth().verifyIdToken(match[1]);
        return decoded.uid;
    } catch (error) {
        console.error('Auth token verification failed:', error);
        res.status(401).json({ error: 'Invalid auth token' });
        return null;
    }
}

export async function handleCreateStrategy(req: Request, res: Response) {
    try {
        const userId = await requireUser(req, res);
        if (!userId) return;

        const parsed = CreateStrategySchema.safeParse({ ...req.body, userId });
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid strategy data', details: parsed.error.format() });
            return;
        }

        const strategyData = parsed.data;
        const docRef = await db.collection('strategies').add({
            ...strategyData,
            createdAt: FieldValue.serverTimestamp(),
            lastRun: null
        });

        res.json({ success: true, id: docRef.id, ...strategyData });
    } catch (error) {
        console.error('Create strategy failed:', error);
        res.status(500).json({ error: String(error) });
    }
}

export async function handleGetStrategies(req: Request, res: Response) {
    try {
        const userId = await requireUser(req, res);
        if (!userId) return;

        const snapshot = await db.collection('strategies')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const strategies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, strategies });
    } catch (error) {
        console.error('Get strategies failed:', error);
        res.status(500).json({ error: String(error) });
    }
}

export async function handleUpdateStrategy(req: Request, res: Response) {
    try {
        const userId = await requireUser(req, res);
        if (!userId) return;

        const { id } = req.params;
        const strategyId = (req.body.id || req.query.id) as string;
        
        if (!strategyId) {
            res.status(400).json({ error: 'Missing strategy ID' });
            return;
        }

        const parsed = UpdateStrategySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid update data', details: parsed.error.format() });
            return;
        }

        const strategyRef = db.collection('strategies').doc(strategyId);
        const snapshot = await strategyRef.get();
        if (!snapshot.exists) {
            res.status(404).json({ error: 'Strategy not found' });
            return;
        }

        if (snapshot.data()?.userId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        await db.collection('strategies').doc(strategyId).update({
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true, id: strategyId });
    } catch (error) {
        console.error('Update strategy failed:', error);
        res.status(500).json({ error: String(error) });
    }
}

export async function handleDeleteStrategy(req: Request, res: Response) {
    try {
        const userId = await requireUser(req, res);
        if (!userId) return;

        const strategyId = (req.body.id || req.query.id) as string;
        if (!strategyId) {
            res.status(400).json({ error: 'Missing strategy ID' });
            return;
        }

        const strategyRef = db.collection('strategies').doc(strategyId);
        const snapshot = await strategyRef.get();
        if (!snapshot.exists) {
            res.status(404).json({ error: 'Strategy not found' });
            return;
        }

        if (snapshot.data()?.userId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        await db.collection('strategies').doc(strategyId).delete();
        res.json({ success: true, id: strategyId });
    } catch (error) {
        console.error('Delete strategy failed:', error);
        res.status(500).json({ error: String(error) });
    }
}

export async function handleGetStrategyLogs(req: Request, res: Response) {
    try {
        const userId = await requireUser(req, res);
        if (!userId) return;

        const limit = Number(req.query.limit) || 20;
        const strategyId = (req.query.strategyId as string | undefined) || undefined;

        let query = db.collection('strategy_logs')
            .where('userId', '==', userId);

        if (strategyId) {
            query = query.where('strategyId', '==', strategyId);
        }

        const snapshot = await query
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const logs = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() 
        }));
        
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get logs failed:', error);
        res.status(500).json({ error: String(error) });
    }
}
