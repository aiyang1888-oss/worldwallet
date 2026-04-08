'use strict';

const fs   = require('fs');
const path = require('path');

const METRICS_DIR  = path.join(__dirname, 'metrics');
const TREND_FILE   = path.join(METRICS_DIR, 'security-trend.json');
const MAX_RECORDS  = 30;

function ensureFile() {
  try {
    if (!fs.existsSync(METRICS_DIR)) {
      fs.mkdirSync(METRICS_DIR, { recursive: true });
    }
    if (!fs.existsSync(TREND_FILE)) {
      fs.writeFileSync(TREND_FILE, '[]', 'utf8');
    }
  } catch (err) {
    // silent — caller handles missing data via readTrend fallback
  }
}

/**
 * appendTrend(record)
 * record: { date, score, high, medium, low }
 */
function appendTrend(record) {
  try {
    ensureFile();

    let data = [];
    try {
      const raw = fs.readFileSync(TREND_FILE, 'utf8');
      data = JSON.parse(raw);
      if (!Array.isArray(data)) data = [];
    } catch (_) {
      data = [];
    }

    const entry = {
      date:   record.date   != null ? record.date   : new Date().toISOString(),
      score:  record.score  != null ? record.score  : 0,
      high:   record.high   != null ? record.high   : 0,
      medium: record.medium != null ? record.medium : 0,
      low:    record.low    != null ? record.low    : 0,
    };

    data.push(entry);

    if (data.length > MAX_RECORDS) {
      data = data.slice(data.length - MAX_RECORDS);
    }

    fs.writeFileSync(TREND_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // do not throw — system must not crash
  }
}

/**
 * readTrend()
 * Returns full array, or [] on any error.
 */
function readTrend() {
  try {
    ensureFile();
    const raw = fs.readFileSync(TREND_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

module.exports = { appendTrend, readTrend };
