# Product Requirements Document (PRD): TradeSync

## 1. Executive Summary
**Vision:** Att demokratisera institutionell finansiell intelligens. TradeSync överbryggar gapet mellan småsparare och hedgefonder genom en AI-driven plattform som filtrerar marknadsbrus och levererar exekverbar, automatiserad handel.
**Målgrupp:** Nybörjare och intresserade sparare som saknar djup teknisk kunskap men vill nyttja AI för att optimera sitt sparande.
**North Star Metric:** Exekveringsgrad – andelen genererade AI-insikter som resulterar i faktiska, lyckade affärer (automatiskt eller godkänt).

## 2. Tekniska Principer & Stack
### Core Stack
*   **Frontend:** React (Vite), TypeScript, Material Design 3 (Google Finance-estetik).
*   **Backend:** Firebase Cloud Functions (Gen 2), Stateless arkitektur.
*   **AI Engine:** Google Genkit med Gemini 3.0.

### Model Allocation Policy (Strict)
*   **Gemini 3.0 Flash:** Används för uppgifter som kräver låg latens och hög volym.
    *   *Exempel:* Transkribering av YouTube-klipp, nyhetssammanfattningar, extrahering av tickers/symboler från chatt.
*   **Gemini 3.0 Pro:** Används för komplexa resonemang och strategiska beslut.
    *   *Exempel:* "Master Strategy"-beslutslogik, RAG-baserad rådgivning (Financial Advisor), generering av djuplodande PDF-rapporter.

## 3. Funktionella Krav

### 3.1. Användarupplevelse (Frontend)
*   **Estetik:** Premium-gränssnitt som speglar Google Finance (GoogleLayout.tsx). Ren, datatung men lättläst design.
*   **Dashboard:**
    *   Realtidsgrafer och finansiell data.
    *   **AI Sentiment Tags:** Nyheter ska automatiskt taggas (t.ex. "Bullish", "High Risk") av Flash-modellen.
    *   **Transparent Osäkerhet:** Om marknadssignalerna är blandade (t.ex. teknisk data säger sälj, nyheter säger köp), ska UI:t visa en tydlig "Neutral/Avvakta"-status med förklaring, istället för att tvinga fram en gissning.
*   **AI Chat Panel:** Alltid tillgänglig sidopanel för direkt interaktion med RAG-rådgivaren.

### 3.2. AI-Motorer (Backend Flows)
*   **Master Strategy Engine (`suggestStrategy`):**
    *   Analys av prishistorik och marknadsdata.
    *   Körs på Gemini 3.0 Pro.
    *   **Autopilot-logik:** Ska kunna exekvera köp/sälj-order automatiskt inom användarens definierade budgetramar.
*   **Advisor Chat (`advisorChat`):**
    *   Kontextmedveten chatt som kan svara på frågor om portföljen och marknadsläget.
    *   Drivs av Gemini 3.0 Pro.
*   **Market Scanner & Sentiment (`analyzeVideo`, `searchVideos`, `scheduledScanner`):**
    *   Timvis scanning av marknader och media (YouTube/Nyheter).
    *   Drivs av Gemini 3.0 Flash för snabb bearbetning.

## 4. Audit & Quality Assurance (Prioriterade Åtgärder)

### 4.1. Strict Type Safety ("Zero any Policy")
*   **Krav:** Inga `any`-typer tillåts i produktionskod.
*   **Åtgärd:** Ersätt alla förekomster med strikta Zod-scheman för validering vid runtime och TypeScript-interface för compile-time säkerhet.

### 4.2. Robusthet & Felhantering (Fail Gracefully)
*   **API-gränser:** All extern data (YouTube API, CoinCap, nyhetsflöden) måste valideras genom Zod innan den används.
*   **UI-Feedback:** Vid dataavbrott eller API-fel ska komponenten visa "Data Unavailable" eller "Market Offline" med en snygg placeholder, aldrig krascha till en vit skärm.

### 4.3. Idempotens & Transaktionssäkerhet
*   **Risk:** Dubbla köp/sälj-order vid nätverksfel eller återförsök.
*   **Krav:** Implementera idempotens-nycklar (idempotency keys) för `tradeExecution` och `scheduledSells`. En order får aldrig behandlas mer än en gång, oavsett hur många gånger funktionen triggas.

### 4.4. UI Konsistens
*   **Design System:** Säkerställ att alla komponenter strikt använder definierade MD3-variabler (färger, typografi, spacing) i `index.css`. Inga hårdkodade hex-koder eller magiska pixlar.

## 5. Implementation Roadmap
1.  **Codebase Audit:** Genomsökning och refaktorisering av typer (`functions/src/index.ts` & `src/App.tsx` som startpunkter).
2.  **Safety Layer:** Implementering av Zod-validering och idempotens-logik i backend.
3.  **Model Verification:** Dubbelkolla att `Pro` och `Flash` används enligt allokeringsreglerna.
4.  **UI Polish:** Slutgiltig genomgång av dashboard och chatpanel för att säkra Google Finance-känslan.