const test = require('node:test');
const assert = require('node:assert/strict');
const { formatMarkdownReport, formatJsonReport } = require('../backend/exportFormatter.js');

test('formatMarkdownReport generates valid markdown with badge and metrics', () => {
  const analysis = {
    score: 85,
    verdict: 'Pure AI Slop',
    wordCount: 120,
    sentenceCount: 6,
    lexicalDiversity: 0.62,
    hasFirstPersonVoice: false,
    passiveVoiceCount: 4,
    matchedPhrases: {
      high: [{ phrase: 'rapidly evolving', count: 2 }],
      mid: [{ phrase: 'best practices', count: 1 }]
    }
  };

  const md = formatMarkdownReport('https://example.com/blog', analysis);
  assert.ok(md.includes('# AI Slop Inspection Report'));
  assert.ok(md.includes('Slop_Score-85%25-red'));
  assert.ok(md.includes('Pure AI Slop'));
  assert.ok(md.includes('rapidly evolving'));
  assert.ok(md.includes('best practices'));
  assert.ok(md.includes('Lexical Diversity (TTR)'));
});

test('formatJsonReport produces valid parseable JSON', () => {
  const analysis = {
    score: 10,
    verdict: 'Probably Human',
    wordCount: 50,
    sentenceCount: 3,
    lexicalDiversity: 0.85,
    hasFirstPersonVoice: true,
    passiveVoiceCount: 0,
    matchedPhrases: { high: [], mid: [] }
  };

  const json = formatJsonReport('Direct Input', analysis);
  const parsed = JSON.parse(json);
  assert.equal(parsed.target, 'Direct Input');
  assert.equal(parsed.analysis.score, 10);
  assert.equal(parsed.analysis.verdict, 'Probably Human');
  assert.ok(parsed.timestamp);
});
