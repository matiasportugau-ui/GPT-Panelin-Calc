'use strict';

function parseJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch (_err) {
      // continue fallback
    }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

module.exports = {
  parseJsonBlock,
};
