const test = require('node:test');
const assert = require('node:assert/strict');
const { extractCleanText, analyzeSlopContent } = require('../backend/server.js');

test('extractCleanText - extracts title, description, and strips markup', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Revolutionary AI Paradigm</title>
        <meta name="description" content="Discover unprecedented synergies.">
        <style>body { color: red; }</style>
        <script>console.log("tracking");</script>
      </head>
      <body>
        <main>
          <h1>Welcome</h1>
          <p>This is a paragraph with &amp; &quot;entities&quot; and <a href="#">links</a>.</p>
        </main>
      </body>
    </html>
  `;

  const extracted = extractCleanText(html);
  assert.equal(extracted.title, 'Revolutionary AI Paradigm');
  assert.equal(extracted.description, 'Discover unprecedented synergies.');
  assert.ok(!extracted.text.includes('console.log'));
  assert.ok(!extracted.text.includes('body { color: red; }'));
  assert.ok(extracted.text.includes('Welcome'));
  assert.ok(extracted.text.includes('entities'));
  assert.ok(extracted.text.includes('links'));
});

test('analyzeSlopContent - flags classic high-density AI slop', () => {
  const aiSample = `
    In today's rapidly evolving digital landscape, it is crucial to leverage cutting-edge solutions to unlock unprecedented synergies.
    Furthermore, organizations must dive deep into holistic approaches to empower teams.
    This transformative game-changer will foster innovation and elevate our impact.
    In conclusion, it is important to note that thought leaders are revolutionizing how we navigate the complexities.
  `;

  const result = analyzeSlopContent(aiSample);
  assert.ok(result.score >= 50, `Expected score >= 50, got ${result.score}`);
  assert.ok(result.matchedPhrases.high.length >= 3, 'Expected multiple high-tier phrase matches');
  assert.equal(typeof result.verdict, 'string');
});

test('analyzeSlopContent - scores authentic personal writing low', () => {
  const humanSample = `
    I built a small wooden desk in my garage last weekend. It took twelve hours.
    The sanding took longer than I expected because the oak grain was tough, but I loved the smell of sawdust.
    My sister came over to help varnish the surface.
  `;

  const result = analyzeSlopContent(humanSample);
  assert.ok(result.score <= 35, `Expected score <= 35 for human writing, got ${result.score}`);
  assert.equal(result.hasFirstPersonVoice, true);
  assert.equal(result.verdict, 'Probably Human');
});

test('analyzeSlopContent - handles empty or whitespace input safely', () => {
  const result = analyzeSlopContent('   ');
  assert.equal(result.score, 0);
  assert.equal(result.wordCount, 0);
  assert.equal(result.sentenceCount, 0);
});

test('analyzeSlopContent - score is always clamped between 0 and 100', () => {
  const repeatedSlop = "In today's rapidly evolving digital landscape, it is crucial to leverage cutting-edge solutions. ".repeat(20);
  const result = analyzeSlopContent(repeatedSlop);
  assert.equal(result.score, 100);
});
