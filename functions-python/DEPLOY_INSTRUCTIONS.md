# Deploying Python Backend to Firebase

Firebase Cloud Functions requires **Python 3.11** or **3.12**.
Your system currently has Python 3.13, which causes deployment to fail.

## Solution: Install Python 3.11

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
