# 🛡️ AI Slop Checker

A zero-dependency heuristic detector and live URL scraper designed to flag AI-generated boilerplate, synthetic corporate filler, and generic language model slop.

## Architecture

- **Frontend:** Responsive browser UI (`index.html`) featuring interactive sentence phrase highlighters, severity indicators, and scan history with `localStorage` persistence.
- **Backend (`backend/server.js`):** Lightweight Node.js HTTP microservice using native `fetch` and built-in regex parsers without third-party dependencies.
- **Formatters (`backend/exportFormatter.js`):** Structured Markdown and JSON inspection report exporters.

## Heuristic Scoring Engine

The scoring algorithm (0 to 100) evaluates:
1. **Tiered Lexicon Density:** High-confidence phrases (e.g. *"rapidly evolving digital landscape"*, *"unlock unprecedented synergies"*, *"paradigm shift"*) and mid-tier filler.
2. **Burstiness & Sentence Length Variance:** Natural writing varies in rhythm and sentence length; uniform sentence lengths trigger artificial structure penalties.
3. **Personal Voice Presence:** Checks for natural first-person pronouns (`I`, `we`, `our`, `my`); completely impersonal long text receives a penalty.
4. **Passive Voice Density:** High ratio of passive constructions per sentence indicates impersonal synthetic generation.
5. **Lexical Diversity (Type-Token Ratio):** Measures vocabulary variety across normalized tokens.

## API Endpoints

### 1. Scrape & Analyze URL
```http
POST /api/scrape-and-analyze
Content-Type: application/json

{
  "url": "https://example.com/blog-post"
}
```

### 2. Direct Text Analysis
```http
POST /api/analyze-text
Content-Type: application/json

{
  "text": "In today's rapidly evolving digital landscape, it is crucial to leverage cutting-edge solutions..."
}
```

### 3. Health Check
```http
GET /health
```

## Running the Server & Tests

Start the backend:
```bash
node backend/server.js
```

Run unit test suites:
```bash
node --test test/*.test.js
```

## License
MIT
