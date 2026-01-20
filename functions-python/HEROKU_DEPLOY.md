# Deploying Avanza Backend to Heroku

Since Firebase Cloud Functions requires Python 3.11 (and we have 3.13), we deploy this Python service to **Heroku**.

## Prerequisites
1. [Heroku Account](https://signup.heroku.com/) (Free Student Tier recommended)
2. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create the App
```bash
heroku create tradesync-avanza
```

### 3. Configure Secrets
Set your Avanza credentials as environment variables on Heroku:

```bash
heroku config:set AVANZA_USERNAME=your_username
heroku config:set AVANZA_PASSWORD=your_password
heroku config:set AVANZA_TOTP_SECRET=your_totp_secret
```

### 4. Deploy
Push **only** the `functions-python` directory to Heroku:

```bash
git subtree push --prefix functions-python heroku master
```

### 5. Verify
Check logs if something goes wrong:
```bash
heroku logs --tail
```

### 6. Update Frontend
Once deployed, get your Heroku URL (e.g., `https://tradesync-avanza.herokuapp.com`) and update your frontend `.env.local`:

```
VITE_AVANZA_BACKEND_URL=https://tradesync-avanza.herokuapp.com
```
