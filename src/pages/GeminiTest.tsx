import { useState } from 'react';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai-preview';
import { app } from '../config/firebase';

export default function GeminiTest() {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const runTest = async () => {
        setLoading(true);
        setError('');
        try {
            const vertexAI = getVertexAI(app);
            const model = getGenerativeModel(vertexAI, { model: 'gemini-1.5-flash' });
            
            const res = await model.generateContent("Hello Gemini, represent!");
            const text = res.response.text();
            setResult(text);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl mb-4">Gemini Client SDK Test</h1>
            <button 
                onClick={runTest}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                {loading ? 'Running...' : 'Run Test'}
            </button>
            
            {error && (
                <div className="mt-4 text-red-500 bg-red-100 p-4 rounded">
                    Error: {error}
                </div>
            )}
            
            {result && (
                <div className="mt-4 bg-green-100 p-4 rounded whitespace-pre-wrap">
                    {result}
                </div>
            )}
        </div>
    );
}
