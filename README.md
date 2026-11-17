# MR RailCheck AI

Automated seat & route compatibility checker for **Myanmar Railways ORTP** (`https://ortp.railways.gov.mm`).

## Running Locally in Myanmar (Without VPN)

Because `ortp.railways.gov.mm` restricts external cloud IPs, pushing this repository to Git and running it locally on a Myanmar internet connection (with VPN turned off) allows the backend to automate the official website directly via headless Chromium.

### 1. Prerequisites
- **Node.js 22+**
- A **Gemini API key** (`GEMINI_API_KEY`)

### 2. Setup
```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
npx playwright install chromium
```

### 3. Configure Environment
Copy `.env.example` to `.env` and set your Gemini API key:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 4. Start the App
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### How Automated Checking Works
1. Enter your route, date, time window, and number of seats (or ask in English/Burmese).
2. The server checks `https://ortp.railways.gov.mm`.
3. When reachable (on a Myanmar IP without VPN), Playwright launches headless Chromium, fills Origin/Destination/Date/Passengers, clicks `ရှာဖွေမည်`, opens `ထိုင်ခုံအတန်းစားရွေးချယ်ရန်` on matching trains, and extracts **real remaining seat numbers** automatically.
