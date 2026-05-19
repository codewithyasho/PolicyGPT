// content.js

function createUI() {
  // Check if already injected
  if (document.getElementById('ps-trigger-btn')) return;

  // Create Button
  const btn = document.createElement('button');
  btn.id = 'ps-trigger-btn';
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
    <span>Summarize Policies</span>
  `;
  document.body.appendChild(btn);

  // Create Panel
  const panel = document.createElement('div');
  panel.id = 'ps-summary-panel';
  panel.innerHTML = `
    <div id="ps-panel-header">
      <h2 id="ps-panel-title">Policy Summary</h2>
      <button id="ps-close-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div id="ps-panel-content"></div>
  `;
  document.body.appendChild(panel);

  // Event Listeners
  btn.addEventListener('click', handleSummarizeClick);
  document.getElementById('ps-close-btn').addEventListener('click', () => {
    panel.classList.remove('ps-show');
  });
}

async function handleSummarizeClick() {
  const btn = document.getElementById('ps-trigger-btn');
  const panel = document.getElementById('ps-summary-panel');
  const content = document.getElementById('ps-panel-content');

  // Update UI state
  btn.classList.add('ps-loading');
  btn.querySelector('span').innerText = 'Scanning...';
  
  panel.classList.add('ps-show');
  content.innerHTML = `
    <div class="ps-loader">
      <div class="ps-spinner"></div>
      <div>Finding and reading policies...</div>
      <div style="font-size: 12px; opacity: 0.7;">This may take a few seconds</div>
    </div>
  `;

  // 1. Find Policy Links
  const policyLinks = findPolicyLinks();
  
  if (policyLinks.length === 0) {
    showError("Could not find any policy links (Terms, Privacy, Refund, etc.) on this page.");
    resetBtn();
    return;
  }

  content.innerHTML = `
    <div class="ps-loader">
      <div class="ps-spinner"></div>
      <div>Found ${policyLinks.length} policies. Summarizing with AI...</div>
      <div style="font-size: 12px; opacity: 0.7;">Analyzing ${policyLinks.map(l => l.text).join(', ')}</div>
    </div>
  `;

  // 2. Send to Background Script
  chrome.runtime.sendMessage({ type: 'SUMMARIZE_POLICIES', links: policyLinks }, (response) => {
    resetBtn();
    
    if (chrome.runtime.lastError) {
      showError("Extension connection error: " + chrome.runtime.lastError.message);
      return;
    }

    if (!response.success) {
      showError(response.error);
      return;
    }

    // 3. Display Summary
    content.innerHTML = parseMarkdown(response.summary);
  });
}

function resetBtn() {
  const btn = document.getElementById('ps-trigger-btn');
  btn.classList.remove('ps-loading');
  btn.querySelector('span').innerText = 'Summarize Policies';
}

function showError(msg) {
  const content = document.getElementById('ps-panel-content');
  content.innerHTML = `<div class="ps-error-msg">${msg}</div>`;
}

function findPolicyLinks() {
  const keywords = ['terms', 'condition', 'privacy', 'refund', 'policy', 'legal'];
  const links = Array.from(document.querySelectorAll('a'));
  const found = [];
  const seenUrls = new Set();

  links.forEach(link => {
    const text = (link.innerText || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    if (!href || href.startsWith('javascript:')) return;

    // Check if link text or url contains keywords
    const isPolicy = keywords.some(keyword => text.includes(keyword) || href.includes(keyword));
    
    // Check if it's a valid link and not already seen
    // Ensure we are staying somewhat within the same domain or it's an absolute path
    if (isPolicy && !seenUrls.has(link.href)) {
      // Small filter to avoid false positives like "return policy" products etc.
      // Usually legal links are short text.
      if (text.length < 40) {
        found.push({ text: link.innerText.trim() || 'Policy', url: link.href });
        seenUrls.add(link.href);
      }
    }
  });

  return found.slice(0, 5); // Limit to top 5 to avoid overloading
}

// Very basic markdown parser for the summary
function parseMarkdown(md) {
  let html = md;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  
  // Bullets
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');
  
  // Paragraphs (basic)
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<li')) return p;
    return `<p>${p}</p>`;
  }).join('');
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createUI);
} else {
  createUI();
}
