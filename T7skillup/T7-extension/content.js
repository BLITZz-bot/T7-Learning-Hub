// T7 Content Script — Injects AI ratings on YouTube search results

(function () {
  'use strict';

  let settings = { goal: null, geminiKey: null, autoRate: true };
  let rated = new Set();
  let ratingCache = {};

  // Load settings
  chrome.storage.local.get(['goal', 'geminiKey', 'autoRate'], (data) => {
    settings = { ...settings, ...data };
    if (settings.autoRate !== false) init();
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.goal) settings.goal = changes.goal.newValue;
    if (changes.geminiKey) settings.geminiKey = changes.geminiKey.newValue;
    if (changes.autoRate) settings.autoRate = changes.autoRate.newValue;
    // Re-rate all visible cards
    rated.clear();
    ratingCache = {};
    injectRatings();
  });

  function init() {
    injectRatings();
    // Observe DOM for new video cards (infinite scroll)
    const observer = new MutationObserver(debounce(injectRatings, 400));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function injectRatings() {
    if (!settings.autoRate) return;

    // YouTube search result cards
    const selectors = [
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-rich-item-renderer'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(card => {
        if (rated.has(card)) return;
        rated.add(card);
        processCard(card);
      });
    });
  }

  function processCard(card) {
    // Extract video metadata from card
    const titleEl = card.querySelector('#video-title, h3 a, a#video-title');
    const metaEl = card.querySelector('#metadata-line, ytd-video-meta-block');
    const channelEl = card.querySelector('#channel-name, .ytd-channel-name');

    if (!titleEl) return;

    const title = titleEl.textContent?.trim() || '';
    const href = titleEl.href || '';
    const videoId = extractVideoId(href);
    const metaText = metaEl?.textContent || '';
    const channelName = channelEl?.textContent?.trim() || '';

    // Parse views & time from meta
    const views = parseViews(metaText);
    const published = parsePublished(metaText);

    // Avoid re-injecting
    if (card.querySelector('.vm-badge')) return;

    // Create placeholder badge immediately
    const badge = createBadgePlaceholder(title);
    injectBadgeIntoCard(card, badge);

    // Compute relevance instantly (no API needed)
    const relevance = calcRelevance(title, settings.goal);
    const baseRating = estimateRating(views, published);

    updateBadge(badge, baseRating, relevance, null);

    // If we have an API key, get AI summary
    if (settings.geminiKey && videoId) {
      const cacheKey = videoId + '_' + (settings.goal || 'none');
      if (ratingCache[cacheKey]) {
        updateBadge(badge, ratingCache[cacheKey].rating, ratingCache[cacheKey].relevance, ratingCache[cacheKey].summary);
        return;
      }
      generateAIInsight(title, channelName, views, settings.goal, settings.geminiKey)
        .then(result => {
          ratingCache[cacheKey] = result;
          updateBadge(badge, result.rating, result.relevance, result.summary);
        })
        .catch(() => {});
    }
  }

  function createBadgePlaceholder(title) {
    const el = document.createElement('div');
    el.className = 'vm-badge';
    el.innerHTML = `
      <div class="vm-badge-inner">
        <div class="vm-header">
          <span class="vm-logo">⚡ T7</span>
          <span class="vm-loading-dot"></span>
        </div>
        <div class="vm-stars" data-rating="0"></div>
        <div class="vm-score-row">
          <span class="vm-score">–</span>
          <span class="vm-score-label">/ 5.0</span>
        </div>
        <div class="vm-rel-section">
          <div class="vm-rel-label">Goal Match</div>
          <div class="vm-rel-track">
            <div class="vm-rel-fill" style="width:0%"></div>
          </div>
          <div class="vm-rel-pct">–%</div>
        </div>
        <div class="vm-summary-box">
          <div class="vm-summary-text vm-shimmer">Analyzing…</div>
        </div>
        <div class="vm-actions">
          <button class="vm-btn vm-btn-primary" data-action="open-panel">Full Analysis ↗</button>
        </div>
      </div>
    `;

    el.querySelector('[data-action="open-panel"]').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Post message to popup or open side panel
      chrome.runtime.sendMessage({ type: 'OPEN_PANEL', title });
    });

    return el;
  }

  function updateBadge(badge, rating, relevance, summary) {
    const starsEl = badge.querySelector('.vm-stars');
    const scoreEl = badge.querySelector('.vm-score');
    const fillEl = badge.querySelector('.vm-rel-fill');
    const pctEl = badge.querySelector('.vm-rel-pct');
    const summaryEl = badge.querySelector('.vm-summary-text');
    const loadingDot = badge.querySelector('.vm-loading-dot');

    if (starsEl) starsEl.innerHTML = renderStars(rating);
    if (scoreEl) scoreEl.textContent = rating.toFixed(1);

    const rel = Math.round(relevance);
    const relColor = rel >= 70 ? '#22c55e' : rel >= 40 ? '#f59e0b' : '#ef4444';

    if (fillEl) {
      fillEl.style.width = rel + '%';
      fillEl.style.background = relColor;
    }
    if (pctEl) {
      pctEl.textContent = rel + '%';
      pctEl.style.color = relColor;
    }
    if (summary && summaryEl) {
      summaryEl.classList.remove('vm-shimmer');
      summaryEl.textContent = summary;
    }
    if (loadingDot) loadingDot.style.display = 'none';
  }

  function injectBadgeIntoCard(card, badge) {
    // Find the thumbnail or main content to inject next to
    const dismissible = card.querySelector('#dismissible') || card.querySelector('.style-scope.ytd-video-renderer');
    const thumbnail = card.querySelector('ytd-thumbnail, #thumbnail');

    if (dismissible) {
      dismissible.style.position = 'relative';
      // Insert after the main content block
      const meta = dismissible.querySelector('#meta, #details');
      if (meta) {
        meta.style.display = 'flex';
        meta.style.gap = '0';
        meta.appendChild(badge);
      } else {
        dismissible.appendChild(badge);
      }
    } else if (thumbnail) {
      thumbnail.parentNode?.insertBefore(badge, thumbnail.nextSibling);
    } else {
      card.appendChild(badge);
    }
  }

  // ── AI Insight Generation ──
  async function generateAIInsight(title, channel, views, goal, key) {
    const goalLabel = GOALS[goal]?.label || 'General Learning';
    const prompt = `Analyze this YouTube video for a learner focused on "${goalLabel}":

Title: "${title}"
Channel: ${channel || 'Unknown'}
Views: ${views ? fmtNum(views) : 'Unknown'}

Return ONLY valid JSON (no markdown):
{
  "rating": 4.2,
  "relevance": 85,
  "summary": "One sentence describing what this video teaches and who it's for."
}

Rating (1-5): quality based on channel credibility and title clarity.
Relevance (0-100): how relevant is this for someone learning ${goalLabel}.`;

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'GEMINI_REQUEST', payload: { prompt, key } },
        (res) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (res?.error) return reject(new Error(res.error));
          try {
            const clean = res.text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(clean);
            resolve({
              rating: Math.min(5, Math.max(1, parseFloat(data.rating) || 3.5)),
              relevance: Math.min(100, Math.max(0, parseInt(data.relevance) || 50)),
              summary: data.summary || ''
            });
          } catch (e) {
            resolve({ rating: 3.5, relevance: 50, summary: '' });
          }
        }
      );
    });
  }

  // ── Helpers ──
  function calcRelevance(title, goal) {
    if (!goal || goal === 'general') return 55 + Math.random() * 30;
    const topics = GOALS[goal]?.topics || [];
    const titleLower = title.toLowerCase();
    let score = 20;
    for (const t of topics) {
      if (titleLower.includes(t)) score += 15;
    }
    return Math.min(97, score + Math.random() * 10);
  }

  function estimateRating(views, published) {
    let r = 3.0;
    if (views > 5000000) r += 1.0;
    else if (views > 1000000) r += 0.7;
    else if (views > 200000) r += 0.4;
    else if (views > 50000) r += 0.2;
    if (published) {
      if (published.includes('day') || published.includes('week')) r += 0.1;
    }
    return Math.min(5, Math.max(1, r + (Math.random() * 0.6 - 0.3)));
  }

  function parseViews(metaText) {
    const m = metaText.match(/([\d,.]+[KMB]?)\s*view/i);
    if (!m) return 0;
    const s = m[1].replace(/,/g, '');
    if (s.includes('B')) return parseFloat(s) * 1e9;
    if (s.includes('M')) return parseFloat(s) * 1e6;
    if (s.includes('K')) return parseFloat(s) * 1e3;
    return parseInt(s) || 0;
  }

  function parsePublished(metaText) {
    const m = metaText.match(/(\d+\s+(?:day|week|month|year)s?\s+ago)/i);
    return m ? m[1] : '';
  }

  function extractVideoId(url) {
    if (!url) return null;
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  }

  function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) html += '<span class="vm-star full">★</span>';
      else if (rating >= i - 0.5) html += '<span class="vm-star half">★</span>';
      else html += '<span class="vm-star empty">★</span>';
    }
    return html;
  }

  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return n.toString();
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  const GOALS = {
    frontend: { label: 'Frontend Development', topics: ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'typescript', 'tailwind', 'responsive', 'web', 'frontend', 'ui', 'dom', 'browser', 'next', 'svelte'] },
    backend: { label: 'Backend Development', topics: ['node', 'python', 'java', 'api', 'server', 'database', 'sql', 'mongodb', 'express', 'django', 'rest', 'graphql', 'backend', 'microservice', 'spring', 'flask'] },
    data: { label: 'Data Science', topics: ['python', 'pandas', 'numpy', 'ml', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'data', 'statistics', 'visualization', 'jupyter', 'sklearn', 'nlp'] },
    design: { label: 'UI/UX Design', topics: ['figma', 'design', 'ux', 'ui', 'prototype', 'wireframe', 'user experience', 'typography', 'color', 'adobe', 'interface', 'sketch', 'usability'] },
    devops: { label: 'DevOps / Cloud', topics: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'jenkins', 'terraform', 'linux', 'nginx', 'deploy', 'cloud', 'devops', 'ansible', 'helm'] },
    general: { label: 'General Learning', topics: [] }
  };

})();
