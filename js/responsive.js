/**
 * responsive.js — Real-time adaptive layout engine
 *
 * Uses ResizeObserver on <html> to toggle CSS classes on
 * #dashboard-screen as the viewport changes pixel-by-pixel.
 * CSS transitions then animate layout changes live.
 *
 * Breakpoints:
 *   lg  ≥ 900px  — full sidebar with text labels
 *   md  600–899px — icon-only sidebar
 *   sm  < 600px   — bottom navigation bar
 *
 * Section sub-breakpoints (applied to .dash-content sections):
 *   content-lg  ≥ 820px  — two-column layouts active
 *   content-md  560–819px — single-column layouts
 *   content-sm  < 560px  — compact/stacked layouts
 */
(() => {
  'use strict';

  const dash = document.getElementById('dashboard-screen');
  if (!dash) return;

  let currentMode    = '';
  let currentContent = '';

  // ── Sidebar / nav breakpoints ──────────────────────────────
  function applyViewport(w) {
    const mode = w < 600 ? 'sm' : w < 900 ? 'md' : 'lg';
    if (mode !== currentMode) {
      const wasBlank = currentMode === '';
      currentMode = mode;

      dash.classList.toggle('viewport-md', mode === 'md');
      dash.classList.toggle('viewport-sm', mode === 'sm');

      if (!wasBlank) {
        const sidebar = dash.querySelector('.dash-sidebar');
        if (sidebar) {
          sidebar.classList.add('sidebar-snap');
          setTimeout(() => sidebar.classList.remove('sidebar-snap'), 420);
        }
      }

      if (mode === 'md') {
        dash.querySelectorAll('.dash-nav-item[aria-label]').forEach(el => {
          el.setAttribute('title', el.getAttribute('aria-label'));
        });
      } else {
        dash.querySelectorAll('.dash-nav-item[title]').forEach(el => {
          el.removeAttribute('title');
        });
      }
    }

    // ── Content width breakpoints ────────────────────────────
    // Measure the actual content area, not the whole viewport
    const content = dash.querySelector('.dash-content');
    const cw = content ? content.offsetWidth : w;
    const cMode = cw < 560 ? 'sm' : cw < 820 ? 'md' : 'lg';

    if (cMode !== currentContent) {
      currentContent = cMode;
      dash.classList.toggle('content-lg', cMode === 'lg');
      dash.classList.toggle('content-md', cMode === 'md');
      dash.classList.toggle('content-sm', cMode === 'sm');
    }
  }

  // ── Messages: mobile conv/chat toggle ──────────────────────
  // Add back-button to chat header when in single-pane mobile mode
  function _patchMessagesBackBtn() {
    const header = document.getElementById('msg-chat-header');
    if (!header || header.querySelector('.msg-back-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'msg-back-btn';
    btn.setAttribute('aria-label', 'Back to conversations');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>';
    btn.addEventListener('click', () => {
      const layout = document.querySelector('.messages-layout');
      if (layout) layout.classList.remove('conv-open');
    });
    header.prepend(btn);
    // Patch _openConversation to add class
    const origOpen = window.__msgOpenConv;
    if (!origOpen) {
      document.addEventListener('messages:conv-opened', () => {
        const layout = document.querySelector('.messages-layout');
        if (layout) layout.classList.add('conv-open');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', _patchMessagesBackBtn);
  // Also patch when messages section is first opened
  document.addEventListener('click', e => {
    if (e.target?.closest('.dash-nav-item[data-section="messages"]')) {
      setTimeout(_patchMessagesBackBtn, 100);
    }
  });

  const ro = new ResizeObserver(entries => {
    applyViewport(Math.round(entries[0].contentRect.width));
  });
  ro.observe(document.documentElement);

  applyViewport(document.documentElement.clientWidth);
})();
