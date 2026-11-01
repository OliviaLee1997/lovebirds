let cleanup = () => {};
export function clearMobileReader() { cleanup(); cleanup = () => {}; }

// Move the existing controls rather than duplicating them: speech and selections
// keep their state when the viewport changes between phone and desktop layouts.
export function mountMobileReader() {
  clearMobileReader();
  const main = document.querySelector('.reader-main');
  const heading = main?.querySelector('.reader-heading');
  if (!heading) return;
  const media = matchMedia('(max-width: 800px)');
  const tools = document.createElement('details');
  tools.className = 'mobile-reading-options';
  tools.innerHTML = '<summary>Reading tools <span>Contents · Audio · More</span></summary><div class="mobile-reading-options-body"></div>';
  const body = tools.lastElementChild;
  const selectors = ['.reader-tools', '.reader-toolbar > [data-bites="copy"]', '.reading-tools', '.reader-aside', '.reader-tags', '.reader-heading > .small-tag', '.source-details', '.section-controls'];
  let moved = [];
  function restore() {
    for (const { node, marker } of moved) marker.replaceWith(node);
    moved = [];
    tools.remove();
  }
  function sync() {
    if (!media.matches) { restore(); return; }
    if (tools.isConnected) return;
    for (const selector of selectors) {
      const node = main.querySelector(selector);
      if (!node) continue;
      const marker = document.createComment('reader control position');
      node.before(marker); moved.push({ node, marker }); body.append(node);
    }
    heading.after(tools);
  }
  tools.addEventListener('click', event => {
    if (event.target.closest('[data-section]')) tools.open = false;
  });
  media.addEventListener('change', sync);
  sync();
  cleanup = () => { media.removeEventListener('change', sync); restore(); };
}
