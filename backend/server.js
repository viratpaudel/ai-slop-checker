/**
 * AI Slop Checker - Lightweight Live URL Extractor & Analysis API
 * Uses native Node.js HTTP and modern Fetch API without third-party dependencies.
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 4000;

// High-confidence AI buzzwords and corporate filler
const SLOP_LEXICON = {
  high: [
    "rapidly evolving", "digital landscape", "it is crucial to",
    "leverage cutting-edge", "unlock unprecedented", "dive deep into",
    "game-changer", "supercharge your", "paradigm shift", "thought leader",
    "in conclusion,", "it is important to note", "delve into",
    "as an ai language model", "certainly!", "revolutionize",
    "synergies", "holistic approach", "seamlessly integrate", "transformative"
  ],
  mid: [
    "best practices", "key takeaways", "actionable insights", "robust solution",
    "scalable", "pain points", "use case", "streamline", "in summary",
    "stay ahead of the curve", "cutting-edge", "state-of-the-art"
  ]
};

function extractCleanText(html) {
  // Remove script and style elements
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  // Extract meta description if present
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const metaDesc = metaMatch ? metaMatch[1] : '';

  // Extract title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : '';

  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  clean = clean
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: pageTitle, description: metaDesc, text: clean };
}

function analyzeSlopContent(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const hits = { high: [], mid: [] };

  for (const phrase of SLOP_LEXICON.high) {
    const matches = lower.split(phrase).length - 1;
    if (matches > 0) {
      hits.high.push({ phrase, count: matches });
      score += matches * 8;
    }
  }

  for (const phrase of SLOP_LEXICON.mid) {
    const matches = lower.split(phrase).length - 1;
    if (matches > 0) {
      hits.mid.push({ phrase, count: matches });
      score += matches * 4;
    }
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const words = text.trim().split(/\s+/).filter(Boolean);

  // Sentence length variance
  if (sentences.length > 3) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    if (variance < 20) score += 18;
  }

  // Personal voice absence
  const firstPerson = (text.match(/\b(I|I've|I'm|my|mine|we|our)\b/gi) || []).length;
  if (firstPerson === 0 && words.length > 50) score += 16;

  // Passive voice construction frequency (common in AI synthetic expository text)
  const passiveMatches = text.match(/\b(is|are|was|were|been|being)\s+([a-z]+ed|[a-z]+en|shown|known|given|seen|found|made)\b/gi) || [];
  const passiveCount = passiveMatches.length;
  if (sentences.length > 0 && (passiveCount / Math.max(1, sentences.length)) >= 0.5 && words.length > 40) {
    score += 10;
  }

  const finalScore = Math.min(100, Math.max(0, score));

  let verdict = 'Probably Human';
  if (finalScore >= 70) verdict = 'Pure AI Slop';
  else if (finalScore >= 40) verdict = 'Suspected Slop';

  return {
    score: finalScore,
    verdict,
    wordCount: words.length,
    sentenceCount: sentences.length,
    matchedPhrases: hits,
    hasFirstPersonVoice: firstPerson > 0,
    passiveVoiceCount: passiveCount
  };
}

const server = http.createServer(async (req, res) => {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'ai-slop-checker-backend', uptime: process.uptime() }));
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/analyze-text') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const text = payload.text || '';
        if (!text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Text field cannot be empty.' }));
        }

        const analysis = analyzeSlopContent(text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ textLength: text.length, analysis }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/scrape-and-analyze') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetUrl = payload.url;
        if (!targetUrl || !targetUrl.startsWith('http')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid HTTP/HTTPS target URL is required.' }));
        }

        const response = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AISlopChecker/1.0; +https://github.com/viratpaudel)' },
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Target URL returned HTTP status ${response.status}` }));
        }

        const rawHtml = await response.text();
        const extracted = extractCleanText(rawHtml);
        const analysis = analyzeSlopContent(extracted.text);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          url: targetUrl,
          title: extracted.title,
          description: extracted.description,
          analysis
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Internal processing error' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AI Slop Checker backend running on port ${PORT}`);
  });
}

module.exports = { server, extractCleanText, analyzeSlopContent };
