# Deploying Python Backend to Firebase

Firebase Cloud Functions requires **Python 3.11** or **3.12**.

## ✅ Python 3.11 Status: INSTALLED

Your system now has **Python 3.11.14** installed. You're ready to deploy!

## Quick Deploy

```bash
cd functions-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
npx firebase deploy --only functions:python-backend
```

---

## Alternative: Install Python 3.11 (if needed on another machine)

### Mac (Homebrew)
```bash
brew install python@3.11
```

### Windows
Download Python 3.11 installer from python.org.

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv
```

## Deployment Steps

1. **Recreate Virtual Environment with Python 3.11**
   ```bash
   cd functions-python
   rm -rf venv
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Deploy**
   ```bash
   npx firebase deploy --only functions:python-backend
   ```

3. **Verify**
   Check the output for the Function URL.
   Update `VITE_AVANZA_BACKEND_URL` in your frontend `.env.local` if needed.

## Python ADK Endpoints

The Python ADK pilot exposes:

- `advisorChatPy`
- `advisorChatStreamPy`

To switch the UI to Python ADK, set:

```
VITE_ADK_BACKEND=python
```

If the Python service needs to call TypeScript functions (market news, trade execution),
ensure `TS_FUNCTIONS_BASE_URL` is set in the Functions env (or rely on default region + project).

## GenAI Auth Configuration

Python ADK uses `google-genai`, which reads auth from environment variables.

Use **one** of the following:

- Vertex AI (recommended in Firebase if access is enabled):
  - `GOOGLE_GENAI_USE_VERTEXAI=true`
  - `GOOGLE_CLOUD_PROJECT=tradesync-ai-prod`
  - `GOOGLE_CLOUD_LOCATION=global` (or your region)
- Gemini Developer API (if Vertex access is blocked for the Python runtime):
  - `GOOGLE_API_KEY=...` (or set `GOOGLE_AI_API_KEY` and the runtime will map it)
  - `GOOGLE_GENAI_USE_VERTEXAI=false`

## Optional: Keep-Alive Scheduler

If you want the Avanza session to stay warm for faster first quotes, set
`AVANZA_KEEP_ALIVE_URL` in `functions/.env` (or rely on auto‑build using
`AVANZA_KEEP_ALIVE_REGION` + `AVANZA_KEEP_ALIVE_FUNCTION`). The TypeScript
functions include a scheduled ping (`avanzaKeepAlive`) every ~8 minutes with
jitter. This is optional and only helps when the function instance stays warm.

## Troubleshooting

### Error: Error generating the service identity for eventarc.googleapis.com

If you see this error during deployment:
1. Wait a few minutes and try again (APIs take time to propagate).
2. If it persists, run this command in your terminal (requires gcloud CLI):
   ```bash
   gcloud beta services identity create --service=eventarc.googleapis.com
   ```
3. Or check the [Google Cloud Console](https://console.cloud.google.com/) for permission issues.
