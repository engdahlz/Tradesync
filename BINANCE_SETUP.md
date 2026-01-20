# Binance Testnet Setup (GRATIS - Inget KYC!)

Binance Testnet ger dig **fullständig trading-funktionalitet** med fake-pengar.
Perfekt för att testa AI-strategierna utan risk.

## Varfor Testnet?

| Feature | Testnet | Production |
|---------|---------|------------|
| KYC (ID-verifiering) | **NEJ** | Ja |
| Kostnad | **GRATIS** | Riktiga pengar |
| API-funktionalitet | **100% identisk** | 100% |
| Risk | **Ingen** | Riktig |

---

## Steg 1: Skapa Testnet-konto (2 minuter)

1. **Ga till** https://testnet.binance.vision/
2. **Klicka** "Log In with GitHub" (eller Google)
3. **Auktorisera** - KLART!

> **Tips:** Inget losenord, ingen email-verifiering, inga personuppgifter.

---

## Steg 2: Generera API-nycklar (1 minut)

1. Pa testnet.binance.vision, klicka **"Generate HMAC_SHA256 Key"**
2. Ge den ett namn: `TradeSync`
3. **KOPIERA BADA NYCKLAR DIREKT:**
   - `API Key` (lang alfanumerisk strang)
   - `Secret Key` (visas bara EN gang!)

> **VIKTIGT:** Spara Secret Key nu - du kan inte se den igen!

---

## Steg 3: Lagg till nycklar i projektet

Oppna filen `functions/.env` och lagg till:

```bash
# Binance Testnet (GRATIS trading)
BINANCE_API_KEY=din_testnet_api_key_har
BINANCE_SECRET=din_testnet_secret_key_har
BINANCE_TESTNET=true
```

**Exempel pa hur det ska se ut:**
```bash
MARKETAUX_API_TOKEN=FTPkxnYN2yG4X2C3hxsi1lGhP7OTSOQaFTRAPo5n
LIVE_TRADING_ENABLED=false

# Binance Testnet
BINANCE_API_KEY=abc123def456...
BINANCE_SECRET=xyz789ghi012...
BINANCE_TESTNET=true
```

---

## Steg 4: Fa gratis test-pengar

1. Ga till https://testnet.binance.vision/
2. Klicka **"Get USDT"** eller **"Get BTC"**
3. Skriv in din wallet-adress (fran testnet-kontot)
4. Du far gratis fake-krypto att handla med!

---

## Steg 5: Deploya och testa

```bash
cd functions
npm run build
firebase deploy --only functions
```

**Verifiera att det fungerar:**
```bash
# Testa att hamta balance
curl -X POST https://YOUR-REGION-tradesync-ai-prod.cloudfunctions.net/getAccountBalance
```

Du bor se dina testnet-saldon!

---

## Hur det fungerar tekniskt

Koden ar redan konfigurerad for testnet. Sa har fungerar det:

```typescript
// functions/src/services/binanceAdapter.ts
const isTestnet = process.env.BINANCE_TESTNET === 'true';

this.exchange = new ccxt.binance({ apiKey, secret });

if (isTestnet) {
    this.exchange.setSandboxMode(true);  // CCXT byter automatiskt till testnet-URL:er
}
```

**CCXT hanterar allt automatiskt:**
- Production: `https://api.binance.com`
- Testnet: `https://testnet.binance.vision`

---

## FAQ

### Kan jag byta till riktigt Binance senare?
Ja! Andra bara:
```bash
BINANCE_TESTNET=false  # Anvand production
```
Och byt ut API-nycklarna mot riktiga fran binance.com (kraver KYC).

### Fungerar alla features pa testnet?
Ja! Spot trading, balances, orders - allt fungerar identiskt.

### Hur lange ar testnet-kontot giltigt?
Evigt! Sa lange du har dina API-nycklar.

### Kan jag testa AI-strategierna?
JA! Det ar hela poangen. AI:n genererar riktiga kop/salj-signaler, och du kan se dem exekveras mot testnet utan risk.

---

## Snabbkommando-referens

```bash
# 1. Lagg till nycklar i .env
echo "BINANCE_API_KEY=your_key" >> functions/.env
echo "BINANCE_SECRET=your_secret" >> functions/.env
echo "BINANCE_TESTNET=true" >> functions/.env

# 2. Deploya
cd functions && npm run build && firebase deploy --only functions

# 3. Testa
curl -X POST https://YOUR-FUNCTION-URL/getAccountBalance
```

---

## Nasta steg

Efter setup:
1. ✅ Verifiera att `getAccountBalance` returnerar data
2. ✅ Testa en liten trade via TradeSync UI
3. ✅ Lat AI:n kora automated trading i bakgrunden
4. ✅ Se trades loggas i Firestore

**STATUS:** Redo for testnet-trading! 🚀
