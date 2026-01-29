import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, Mic, MicOff, Radio, Send, Sparkles } from 'lucide-react'
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import { createLiveApiToken } from '../../services/api'

type VoiceStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'speaking' | 'error'

type TranscriptEntry = {
    id: string
    role: 'user' | 'assistant'
    text: string
    timestamp: string
}

const INPUT_SAMPLE_RATE = 16000
const OUTPUT_SAMPLE_RATE = 24000
const INPUT_CHUNK_SIZE = 4096
const MAX_LOG_ENTRIES = 6

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (outputRate >= inputRate) return buffer
    const ratio = inputRate / outputRate
    const newLength = Math.round(buffer.length / ratio)
    const result = new Float32Array(newLength)
    let offset = 0
    for (let i = 0; i < newLength; i++) {
        const nextOffset = Math.round((i + 1) * ratio)
        let sum = 0
        let count = 0
        for (let j = offset; j < nextOffset && j < buffer.length; j++) {
            sum += buffer[j]
            count += 1
        }
        result[i] = count ? sum / count : 0
        offset = nextOffset
    }
    return result
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < input.length; i++) {
        const clamped = Math.max(-1, Math.min(1, input[i]))
        view.setInt16(i * 2, clamped * 0x7fff, true)
    }
    return buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return btoa(binary)
}

function base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64)
    const buffer = new ArrayBuffer(binary.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    const view = new DataView(buffer)
    const samples = new Float32Array(buffer.byteLength / 2)
    for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getInt16(i * 2, true) / 32768
    }
    return samples
}

function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

export default function LiveVoiceAssistant() {
    const [status, setStatus] = useState<VoiceStatus>('idle')
    const [error, setError] = useState<string | null>(null)
    const [log, setLog] = useState<TranscriptEntry[]>([])
    const [draftUserText, setDraftUserText] = useState('')
    const [draftAssistantText, setDraftAssistantText] = useState('')
    const [draftUserTranscript, setDraftUserTranscript] = useState('')
    const [inputLevel, setInputLevel] = useState(0)
    const [outputLevel, setOutputLevel] = useState(0)

    const sessionRef = useRef<Session | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const playbackContextRef = useRef<AudioContext | null>(null)
    const playbackTimeRef = useRef(0)
    const assistantBufferRef = useRef('')
    const userTranscriptRef = useRef('')
    const inputLevelRef = useRef(0)
    const outputLevelRef = useRef(0)
    const statusRef = useRef<VoiceStatus>('idle')

    useEffect(() => {
        statusRef.current = status
    }, [status])

    useEffect(() => {
        const timer = window.setInterval(() => {
            setInputLevel(inputLevelRef.current)
            setOutputLevel(outputLevelRef.current)
            outputLevelRef.current = Math.max(0, outputLevelRef.current - 0.08)
        }, 120)
        return () => window.clearInterval(timer)
    }, [])

    const statusMeta = useMemo(() => {
        switch (status) {
            case 'connecting':
                return { label: 'Ansluter', color: 'text-ts-blue', dot: 'bg-ts-blue', hint: 'Skapar Live‑session.' }
            case 'ready':
                return { label: 'Redo', color: 'text-ts-green', dot: 'bg-ts-green', hint: 'Tryck för att lyssna.' }
            case 'listening':
                return { label: 'Lyssnar', color: 'text-ts-yellow', dot: 'bg-ts-yellow', hint: 'Streamar mikrofon.' }
            case 'speaking':
                return { label: 'Svarar', color: 'text-ai', dot: 'bg-primary', hint: 'Syntetiserar röst.' }
            case 'error':
                return { label: 'Fel', color: 'text-ts-red', dot: 'bg-ts-red', hint: 'Kontrollera API‑nyckel.' }
            default:
                return { label: 'Avstängd', color: 'text-muted-foreground', dot: 'bg-muted-foreground', hint: 'Starta session.' }
        }
    }, [status])

    const appendLog = useCallback((entry: TranscriptEntry) => {
        setLog((prev) => {
            const next = [...prev, entry]
            return next.slice(-MAX_LOG_ENTRIES)
        })
    }, [])

    const ensurePlaybackContext = useCallback(() => {
        if (!playbackContextRef.current) {
            playbackContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
            playbackTimeRef.current = playbackContextRef.current.currentTime
        }
        return playbackContextRef.current
    }, [])

    const playAudioChunk = useCallback((base64: string) => {
        if (!base64) return
        const context = ensurePlaybackContext()
        if (context.state === 'suspended') {
            void context.resume()
        }
        const samples = base64ToFloat32(base64)
        const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE)
        buffer.copyToChannel(samples, 0)
        const source = context.createBufferSource()
        source.buffer = buffer
        source.connect(context.destination)
        const startAt = Math.max(playbackTimeRef.current, context.currentTime + 0.02)
        source.start(startAt)
        playbackTimeRef.current = startAt + buffer.duration
        outputLevelRef.current = Math.min(1, outputLevelRef.current + 0.18)
    }, [ensurePlaybackContext])

    const handleLiveMessage = useCallback((message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription?.text) {
            userTranscriptRef.current = message.serverContent.inputTranscription.text
            setDraftUserTranscript(userTranscriptRef.current)
        }
        if (message.serverContent?.inputTranscription?.finished) {
            const finalUser = userTranscriptRef.current.trim()
            if (finalUser) {
                appendLog({
                    id: crypto.randomUUID(),
                    role: 'user',
                    text: finalUser,
                    timestamp: new Date().toISOString(),
                })
            }
            userTranscriptRef.current = ''
            setDraftUserTranscript('')
        }

        if (message.text) {
            assistantBufferRef.current += message.text
            setDraftAssistantText(assistantBufferRef.current)
        }

        if (message.data) {
            playAudioChunk(message.data)
            if (statusRef.current !== 'listening') {
                setStatus('speaking')
            }
        }

        if (message.serverContent?.turnComplete) {
            const finalAssistant = assistantBufferRef.current.trim()
            if (finalAssistant) {
                appendLog({
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    text: finalAssistant,
                    timestamp: new Date().toISOString(),
                })
            }
            assistantBufferRef.current = ''
            setDraftAssistantText('')
            if (statusRef.current === 'speaking') {
                setStatus('ready')
            }
        }
    }, [appendLog, playAudioChunk])

    const cleanupAudio = useCallback(() => {
        processorRef.current?.disconnect()
        processorRef.current = null
        audioContextRef.current?.close()
        audioContextRef.current = null
        micStreamRef.current?.getTracks().forEach((track) => track.stop())
        micStreamRef.current = null
    }, [])

    const disconnectSession = useCallback(() => {
        cleanupAudio()
        sessionRef.current?.close()
        sessionRef.current = null
        if (playbackContextRef.current) {
            playbackContextRef.current.close()
            playbackContextRef.current = null
        }
        assistantBufferRef.current = ''
        userTranscriptRef.current = ''
        setDraftAssistantText('')
        setStatus('idle')
    }, [cleanupAudio])

    const connectSession = useCallback(async () => {
        if (status !== 'idle' && status !== 'error') return
        setStatus('connecting')
        setError(null)
        try {
            const token = await createLiveApiToken({
                responseModalities: ['AUDIO', 'TEXT'],
                systemInstruction: [
                    'Du är TradeSyncs röstanalytiker.',
                    'Ge korta, actionabla svar och ställ en följdfråga när det behövs.',
                ].join(' '),
            })

            const ai = new GoogleGenAI({
                apiKey: token.token,
                apiVersion: token.apiVersion,
                vertexai: false,
            })

            const session = await ai.live.connect({
                model: token.model,
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    proactivity: { proactiveAudio: true },
                },
                callbacks: {
                    onmessage: handleLiveMessage,
                    onerror: (event) => {
                        console.error('[LiveVoice] WebSocket error:', event)
                        setError('Live‑sessionen tappade anslutning.')
                        setStatus('error')
                    },
                    onclose: () => {
                        if (statusRef.current !== 'idle') {
                            setStatus('idle')
                        }
                    },
                },
            })

            sessionRef.current = session
            setStatus('ready')
        } catch (err) {
            console.error('[LiveVoice] Failed to connect', err)
            setError('Kunde inte starta Live‑session.')
            setStatus('error')
        }
    }, [handleLiveMessage, status])

    const startListening = useCallback(async () => {
        if (!sessionRef.current) return
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Media devices unavailable.')
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            micStreamRef.current = stream
            const context = new AudioContext()
            audioContextRef.current = context
            if (context.state === 'suspended') {
                await context.resume()
            }
            const source = context.createMediaStreamSource(stream)
            const processor = context.createScriptProcessor(INPUT_CHUNK_SIZE, 1, 1)
            const silentGain = context.createGain()
            silentGain.gain.value = 0

            processor.onaudioprocess = (event) => {
                if (!sessionRef.current || statusRef.current !== 'listening') return
                const input = event.inputBuffer.getChannelData(0)
                const downsampled = downsampleBuffer(input, context.sampleRate, INPUT_SAMPLE_RATE)
                const pcmBuffer = floatTo16BitPCM(downsampled)
                const base64 = arrayBufferToBase64(pcmBuffer)
                const rms = Math.sqrt(downsampled.reduce((sum, sample) => sum + sample * sample, 0) / downsampled.length)
                inputLevelRef.current = Math.min(1, rms * 3.5)
                sessionRef.current.sendRealtimeInput({
                    audio: {
                        data: base64,
                        mimeType: 'audio/pcm',
                    },
                })
            }

            source.connect(processor)
            processor.connect(silentGain)
            silentGain.connect(context.destination)
            processorRef.current = processor
            setStatus('listening')
        } catch (err) {
            console.error('[LiveVoice] Microphone error', err)
            setError('Mikrofonen kunde inte aktiveras.')
            setStatus('error')
        }
    }, [])

    const stopListening = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ audioStreamEnd: true })
        }
        cleanupAudio()
        if (statusRef.current !== 'error') {
            setStatus('ready')
        }
    }, [cleanupAudio])

    const sendText = useCallback(async () => {
        const text = draftUserText.trim()
        if (!text || !sessionRef.current) return
        appendLog({
            id: crypto.randomUUID(),
            role: 'user',
            text,
            timestamp: new Date().toISOString(),
        })
        sessionRef.current.sendClientContent({
            turns: [{ role: 'user', parts: [{ text }] }],
            turnComplete: true,
        })
        setDraftUserText('')
    }, [appendLog, draftUserText])

    useEffect(() => () => disconnectSession(), [disconnectSession])

    return (
        <section className="ai-panel p-6 space-y-4 reveal-up" style={{ animationDelay: '0.12s' }}>
            <div className="flex items-center gap-3">
                <div className="ai-orb w-10 h-10">
                    <Radio className="w-5 h-5 text-ai" />
                </div>
                <div>
                    <h3 className="text-base font-medium text-foreground">Live Voice Assist</h3>
                    <p className="text-xs text-muted-foreground">Multimodal Live API • realtime audio</p>
                </div>
                <span className={`ml-auto text-[10px] uppercase tracking-wide ${statusMeta.color}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${statusMeta.dot}`} />
                    {statusMeta.label}
                </span>
            </div>

            <div className="border border-border rounded-2xl bg-white/70 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl border border-border bg-surface-2 flex items-center justify-center">
                            {status === 'listening' ? (
                                <Mic className="w-5 h-5 text-ts-yellow animate-pulse" />
                            ) : status === 'speaking' ? (
                                <Sparkles className="w-5 h-5 text-ai animate-pulse" />
                            ) : (
                                <MicOff className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">{statusMeta.hint}</p>
                            <p className="text-xs text-muted-foreground">
                                {status === 'listening' ? 'Lyssnar på röstinput.' : 'Följ upp med text vid behov.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'idle' || status === 'error' ? (
                            <button
                                onClick={connectSession}
                                className="px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                            >
                                Starta
                            </button>
                        ) : (
                            <button
                                onClick={disconnectSession}
                                className="px-3 py-2 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                            >
                                Avsluta
                            </button>
                        )}
                        <button
                            onClick={status === 'listening' ? stopListening : startListening}
                            disabled={status !== 'ready' && status !== 'listening'}
                            className="px-3 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                            {status === 'listening' ? 'Stopp' : 'Lyssna'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-end gap-1 h-8">
                        {Array.from({ length: 14 }).map((_, index) => {
                            const level = status === 'listening' ? inputLevel : outputLevel
                            const intensity = Math.max(0.1, level - index * 0.05)
                            const height = Math.min(1, intensity + 0.15) * 100
                            return (
                                <span
                                    key={`bar-${index}`}
                                    className="flex-1 rounded-full bg-primary/40"
                                    style={{ height: `${height}%` }}
                                />
                            )
                        })}
                    </div>
                    <div className="text-[11px] text-muted-foreground w-20 text-right">
                        {status === 'listening' ? 'Input' : 'Output'}
                    </div>
                </div>
            </div>

            <div className="border border-border rounded-2xl bg-white/70 px-4 py-3 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-ts-green" />
                    Live transcript
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-sm">
                    {log.length === 0 && (
                        <p className="text-xs text-muted-foreground">Ingen dialog än. Starta session och lyssna.</p>
                    )}
                    {log.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2">
                            <span className={`text-[10px] uppercase tracking-wide ${entry.role === 'user' ? 'text-ts-blue' : 'text-ai'}`}>
                                {entry.role === 'user' ? 'Du' : 'AI'}
                            </span>
                            <div className="flex-1">
                                <p className="text-foreground leading-snug">{entry.text}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{formatTime(entry.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                    {draftAssistantText && (
                        <div className="flex items-start gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-ai">AI</span>
                            <div className="flex-1">
                                <p className="text-muted-foreground italic">{draftAssistantText}</p>
                            </div>
                        </div>
                    )}
                    {draftUserTranscript && (
                        <div className="flex items-start gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-ts-blue">Du</span>
                            <div className="flex-1">
                                <p className="text-muted-foreground italic">{draftUserTranscript}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    value={draftUserText}
                    onChange={(event) => setDraftUserText(event.target.value)}
                    placeholder="Skicka text till Live‑assistenten…"
                    className="flex-1 bg-surface-2 border border-transparent rounded-full px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/30"
                    disabled={status === 'idle' || status === 'connecting'}
                />
                <button
                    onClick={sendText}
                    disabled={!draftUserText.trim() || status === 'idle' || status === 'connecting'}
                    className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <p className="text-xs text-ts-red">{error}</p>
            )}

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Headphones className="w-3.5 h-3.5" />
                Rekommenderat: headset för att undvika eko i röstläge.
            </div>
        </section>
    )
}
