# Binance API Setup Checklist

## Prerequisites
- Binance account (sign up at https://www.binance.com/)
- Email and phone verification completed
- 2FA (Two-Factor Authentication) enabled

## Step 1: Create API Key

1. **Login to Binance** → Go to https://www.binance.com/
2. **Navigate to API Management**:
   - Click your profile icon (top-right)
   - Select "API Management"
3. **Create New API Key**:
   - Label: "TradeSync Trading Bot"
   - Click "Create API"
   - **SAVE BOTH VALUES IMMEDIATELY:**
     - `API Key` (starts with a long alphanumeric string)
     - `Secret Key` (only shown once!)

## Step 2: Configure API Permissions

⚠️ **SECURITY**: Only enable the minimum required permissions.

**Required Permissions:**
- ✅ **Enable Spot & Margin Trading** (to place orders)
- ✅ **Enable Reading** (to fetch balances and order status)
- ❌ **Disable Withdrawals** (security best practice)
- ❌ **Disable Universal Transfer** (security best practice)

**IP Access Restriction (Recommended):**
- Option 1: **Unrestricted** (works from any IP, less secure)
- Option 2: **Restrict to specific IPs** (more secure, requires Firebase egress IP)

For Firebase Cloud Functions, use **Unrestricted** initially, then add Firebase egress IPs later if needed.

## Step 3: Add Keys to Environment

### Local Development (.env.local)

**Frontend** (`.env.local`):
```bash
# Not needed - keys stay in backend for security
```

**Backend** (`functions/.env`):
```bash
BINANCE_API_KEY=your_actual_api_key_here
BINANCE_SECRET=your_actual_secret_key_here
BINANCE_TESTNET=true  # Set to false for REAL trading
```

### Production (Firebase Environment Config)

```bash
cd functions
firebase functions:config:set \
  binance.api_key="YOUR_ACTUAL_API_KEY" \
  binance.secret="YOUR_ACTUAL_SECRET_KEY" \
  binance.testnet="true"

# Deploy to apply changes
firebase deploy --only functions
```

## Step 4: Test Binance Testnet (RECOMMENDED FIRST)

Before using real funds, test with Binance Testnet:

1. **Create Testnet Account**: https://testnet.binance.vision/
2. **Generate Testnet API Keys** (same process as above)
3. **Set** `BINANCE_TESTNET=true` in your `.env`
4. **Test trades with fake funds**

⚠️ **Testnet URLs differ from production:**
- Testnet: `https://testnet.binance.vision`
- Production: `https://api.binance.com`

## Step 5: Verify Integration

Run these smoke tests to verify setup:

```bash
# 1. Check account balance (should return balances)
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getAccountBalance

# 2. Place a small test order (Testnet only!)
# Use the TradeSync UI → Trade Modal → Execute Trade
```

## Security Best Practices

✅ **DO:**
- Keep API keys in environment variables (never commit to git)
- Use Testnet before live trading
- Enable 2FA on Binance account
- Monitor API key activity in Binance dashboard
- Disable withdrawal permissions
- Set low `MAX_TRADE_AMOUNT` in code initially

❌ **DON'T:**
- Share API keys publicly (GitHub, Discord, etc.)
- Enable withdrawal permissions unless absolutely necessary
- Test large orders without understanding the code
- Use production keys in development environment

## Troubleshooting

### Error: "API-key format invalid"
- Double-check you copied the full API Key (no spaces)
- Verify key is not expired

### Error: "Signature verification failed"
- Ensure `BINANCE_SECRET` matches exactly (case-sensitive)
- Check system time is synchronized (NTP)

### Error: "IP address does not match"
- Either disable IP restriction OR add Firebase egress IPs to whitelist

### Error: "Insufficient balance"
- Testnet: Request funds from Binance Testnet faucet
- Production: Deposit funds to Binance Spot Wallet

## Next Steps

After successful setup:
1. ✅ Verify `getAccountBalance()` returns data
2. ✅ Execute a small test trade on Testnet
3. ✅ Monitor trade execution in Firebase Function logs
4. ✅ Gradually increase trade sizes once confident
5. ⚠️ Switch to production (`BINANCE_TESTNET=false`) only when ready

---

**Status**: All steps documented. User can follow this checklist to complete Binance integration.
