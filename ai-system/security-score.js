'use strict';

/**
 * calculateSecurityScore
 * @param {object} result - supports result.high/medium/low or result.summary.high/medium/low
 * @returns {{ score: number, level: string, high: number, medium: number, low: number }}
 */
function calculateSecurityScore(result) {
  const src = (result && result.summary) ? result.summary : result;

  const high   = Number(src && src.high   != null ? src.high   : 0);
  const medium = Number(src && src.medium != null ? src.medium : 0);
  const low    = Number(src && src.low    != null ? src.low    : 0);

  const raw   = 100 - high * 20 - medium * 10 - low * 5;
  const score = Math.max(0, raw);

  let level;
  if (score >= 90)      level = 'A';
  else if (score >= 70) level = 'B';
  else if (score >= 50) level = 'C';
  else                  level = 'D';

  return { score, level, high, medium, low };
}

module.exports = { calculateSecurityScore };
