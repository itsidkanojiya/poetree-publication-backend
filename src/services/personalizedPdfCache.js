const personalizationConfig = require('../config/worksheetPersonalization');

const cache = new Map(); // key -> { buffer, expiresAt }

const TTL_MS = (personalizationConfig.cacheTtlSeconds || 0) * 1000;

function cacheKey(worksheetId, userId) {
  return `worksheet_personalized:${worksheetId}:${userId}`;
}

function get(worksheetId, userId) {
  if (TTL_MS <= 0) return null;
  const key = cacheKey(worksheetId, userId);
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.buffer;
}

function set(worksheetId, userId, buffer) {
  if (TTL_MS <= 0) return;
  const key = cacheKey(worksheetId, userId);
  cache.set(key, {
    buffer,
    expiresAt: Date.now() + TTL_MS,
  });
}

function invalidateByWorksheet(worksheetId) {
  const prefix = `worksheet_personalized:${worksheetId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function invalidateByUser(userId) {
  const suffix = `:${userId}`;
  for (const key of cache.keys()) {
    if (key.endsWith(suffix)) cache.delete(key);
  }
}

module.exports = {
  get,
  set,
  invalidateByWorksheet,
  invalidateByUser,
};
