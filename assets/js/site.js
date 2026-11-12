// Fills release facts from the data attributes on <body>, and wires the SHA-256 copy button.
(() => {
  const r = document.body.dataset;
  document.querySelectorAll('[data-r]').forEach(el => { if (r[el.dataset.r]) el.textContent = r[el.dataset.r]; });
  document.querySelectorAll('[data-r-href]').forEach(el => { if (r[el.dataset.rHref]) el.href = r[el.dataset.rHref]; });

  const btn = document.querySelector('[data-copy=sha]');
  if (!btn || !navigator.clipboard) return;
  const status = btn.nextElementSibling;
  btn.hidden = false;
  btn.setAttribute('aria-label', 'Copy SHA-256 checksum');
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(r.sha); status.textContent = 'Copied'; }
    catch { status.textContent = 'Select the text to copy'; }
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
})();
