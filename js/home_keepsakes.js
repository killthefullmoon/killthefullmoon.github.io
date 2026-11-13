/* Home's letter box and photo album. No credentials belong in this file. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const guestbook = $('guestbookDialog');
  const album = $('photoAlbumDialog');
  const dialogs = { guestbook, photos: album };
  const repo = 'killthefullmoon/killthefullmoon.github.io';
  const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const pageSize = 12;
  const photoCategories = [
    { id: 'people', label: 'People' },
    { id: 'scenery', label: 'Scenery' },
    { id: 'food', label: 'Food' },
    { id: 'concerts', label: 'Concerts' },
  ];
  let photos = null;
  let photoRequest = null;
  let filter = photoCategories[0].id;
  let page = 0;
  let selected = -1;
  let guestbookState = 'idle';
  let guestbookTimer;
  let returnFocus = null;

  function open(kind) {
    const dialog = dialogs[kind];
    if (!dialog || dialog.open) return;
    for (const other of Object.values(dialogs)) if (other.open) other.close();
    returnFocus = document.activeElement;
    dialog.showModal();
    // focus the dialog itself, so the close button doesn't open with a focus ring
    dialog.focus({ preventScroll: true });
    // Keep OAuth returns and shared links attached to the correct keepsake.
    history.replaceState(null, '', location.pathname + location.search + '#' + kind);
    if (kind === 'guestbook') loadGuestbook();
    else loadPhotos();
  }
  for (const dialog of Object.values(dialogs)) {
    dialog.querySelector('[data-close-keepsake]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (Object.values(dialogs).some(d => d.open)) return;
      if (['#guestbook', '#photos'].includes(location.hash)) history.replaceState(null, '', location.pathname + location.search + '#home');
      const focus = returnFocus?.isConnected && returnFocus !== document.body ? returnFocus : $('world');
      focus.focus({ preventScroll: true });
    });
  }
  document.querySelectorAll('[data-keepsake]').forEach(button => {
    button.addEventListener('click', () => open(button.dataset.keepsake));
  });
  window.HuiHomeKeepsakes = { open, isOpen: () => guestbook.open || album.open };

  function guestbookMessage(message, retry = false) {
    $('guestbookStatus').textContent = message;
    $('guestbookRetry').hidden = !retry;
    guestbook.querySelector('.life-letterbox__signin').hidden = guestbookState !== 'ready';
    $('guestbookSetup').hidden = !localPreview || guestbookState !== 'pending';
  }
  function loadGuestbook() {
    if (guestbookState === 'loading' || guestbookState === 'ready') return;
    guestbookState = 'loading';
    $('guestbookComments').replaceChildren();
    $('guestbookComments').hidden = false;
    guestbookMessage('Opening the letter box…');
    try {
      // Public IDs verified against this repository's GitHub Discussions.
      // The official widget owns authentication and persistent comments.
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      const settings = {
        repo, 'repo-id': 'R_kgDOJedWYg', category: 'Announcements', 'category-id': 'DIC_kwDOJedWYs4DLCxe',
        mapping: 'specific', term: 'Letters to Hui · Home guestbook', strict: '1',
        'reactions-enabled': '1', 'emit-metadata': '1', 'input-position': 'top',
        theme: 'light', lang: 'en', loading: 'eager',
      };
      for (const [key, value] of Object.entries(settings)) script.setAttribute('data-' + key, value);
      const fail = () => {
        guestbookState = 'error';
        guestbookMessage('The letter box could not connect. Please try again, or visit GitHub below.', true);
      };
      script.onerror = fail;
      clearTimeout(guestbookTimer);
      guestbookTimer = setTimeout(fail, 20000);
      $('guestbookComments').append(script);
    } catch (error) {
      guestbookState = 'error';
      guestbookMessage('The letter box could not connect. Please try again, or visit GitHub below.', true);
    }
  }
  $('guestbookRetry').addEventListener('click', loadGuestbook);
  function reconnectGuestbook() {
    if (guestbook.open && document.visibilityState === 'visible'
      && (guestbookState === 'pending' || guestbookState === 'error')) loadGuestbook();
  }
  window.addEventListener('focus', reconnectGuestbook);
  document.addEventListener('visibilitychange', reconnectGuestbook);
  window.addEventListener('message', event => {
    const frame = $('guestbookComments').querySelector('iframe.giscus-frame');
    if (event.origin !== 'https://giscus.app' || !frame || event.source !== frame.contentWindow || !event.data?.giscus) return;
    const data = event.data.giscus;
    if (typeof data.error === 'string' && /not installed/i.test(data.error)) {
      clearTimeout(guestbookTimer);
      guestbookState = 'pending';
      $('guestbookComments').hidden = true;
      guestbookMessage(localPreview
        ? 'GitHub comments are not enabled: giscus has not been installed for this repository.'
        : 'The guestbook is not open yet. Please check back soon.', true);
      return;
    }
    if (guestbookState !== 'pending' && (data.resizeHeight || 'discussion' in data)) {
      clearTimeout(guestbookTimer);
      guestbookState = 'ready';
      guestbookMessage('');
    }
    const url = data.discussion?.url;
    if (typeof url === 'string' && url.startsWith('https://github.com/' + repo + '/discussions/')) $('guestbookGithub').href = url;
  });

  const filtered = () => (photos || []).filter(photo => photo.category === filter);
  function photoYearTag(photo) {
    const tag = document.createElement(photo.year === null ? 'span' : 'time');
    tag.className = 'life-album__year';
    tag.textContent = photo.year === null ? '—' : String(photo.year);
    if (photo.year === null) {
      tag.title = 'Year not recorded';
      tag.setAttribute('aria-label', 'Year not recorded');
    } else {
      tag.dateTime = String(photo.year);
      tag.setAttribute('aria-label', 'Year ' + photo.year);
    }
    return tag;
  }
  async function loadPhotos() {
    if (photos) return;
    if (photoRequest) return photoRequest;
    $('photoAlbumStatus').textContent = 'Opening the album…';
    $('photoAlbumRetry').hidden = true;
    photoRequest = (async () => {
      try {
        const manifestURL = new URL('../data/photo-album.json?v=20261113-photo-years', location.href);
        const response = await fetch(manifestURL, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error('Album unavailable');
        const manifest = await response.json();
        if (!Array.isArray(manifest.photos)) throw new Error('Invalid album');
        photos = manifest.photos.map(photo => {
          if (!photo.id || !photo.src || !photo.alt || !photo.place) throw new Error('Incomplete photo');
          if (!photoCategories.some(category => category.id === photo.category)) throw new Error('Invalid photo category');
          if (photo.year !== null && (!Number.isInteger(photo.year) || photo.year < 1000 || photo.year > 9999)) throw new Error('Invalid photo year');
          return { ...photo, src: new URL(photo.src, manifestURL).href, thumbnail: new URL(photo.thumbnail || photo.src, manifestURL).href };
        });
        const filters = $('photoAlbumFilters');
        filters.replaceChildren();
        for (const category of photoCategories) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = category.label;
          button.dataset.category = category.id;
          button.addEventListener('click', () => { filter = category.id; page = 0; renderIndex(); });
          filters.append(button);
        }
        renderIndex();
      } catch (error) {
        photos = null;
        $('photoAlbumStatus').textContent = 'The album could not load. Please try again.';
        $('photoAlbumRetry').hidden = false;
      } finally { photoRequest = null; }
    })();
    return photoRequest;
  }
  $('photoAlbumRetry').addEventListener('click', loadPhotos);
  function renderIndex() {
    const items = filtered();
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    page = Math.min(page, pages - 1);
    $('photoAlbumStatus').textContent = items.length ? '' : 'No photographs in this category yet.';
    $('photoAlbumCount').textContent = items.length + (items.length === 1 ? ' photograph' : ' photographs');
    for (const button of $('photoAlbumFilters').children) button.setAttribute('aria-pressed', String(button.dataset.category === filter));
    const grid = $('photoAlbumGrid');
    grid.replaceChildren();
    items.slice(page * pageSize, (page + 1) * pageSize).forEach((photo, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'life-album__photo';
      button.dataset.photo = photo.id;
      button.setAttribute('aria-label', 'Open photograph: ' + (photo.title || photo.alt));
      const img = new Image();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = photo.alt;
      img.src = photo.thumbnail;
      // A missing optional thumbnail should still reveal the original photo.
      img.addEventListener('error', () => { if (img.src !== photo.src) img.src = photo.src; });
      const caption = document.createElement('span');
      caption.className = 'life-album__caption';
      const place = document.createElement('span');
      place.className = 'life-album__place';
      place.textContent = photo.place;
      const number = document.createElement('small');
      number.textContent = String(page * pageSize + i + 1).padStart(2, '0');
      caption.append(place, photoYearTag(photo), number);
      button.append(img, caption);
      button.addEventListener('click', () => showPhoto(page * pageSize + i, true));
      grid.append(button);
    });
    $('photoAlbumPage').textContent = 'Page ' + (page + 1) + ' / ' + pages;
    $('photoAlbumPrevPage').disabled = page === 0;
    $('photoAlbumNextPage').disabled = page === pages - 1;
  }
  function turnPage(direction) {
    page += direction;
    renderIndex();
    album.scrollTop = 0;
    $('photoAlbumGrid').querySelector('button')?.focus({ preventScroll: true });
  }
  $('photoAlbumPrevPage').addEventListener('click', () => turnPage(-1));
  $('photoAlbumNextPage').addEventListener('click', () => turnPage(1));
  function showPhoto(index, focus = false) {
    const items = filtered();
    if (index < 0 || index >= items.length) return;
    selected = index;
    const photo = items[index];
    $('photoAlbumIndex').hidden = true;
    $('photoAlbumViewer').hidden = false;
    $('photoAlbumStatus').textContent = '';
    const img = $('photoAlbumImage');
    img.alt = photo.alt;
    img.src = photo.src;
    img.onerror = () => { $('photoAlbumStatus').textContent = 'This photograph could not load. You can try opening the original.'; };
    $('photoAlbumOriginal').href = photo.src;
    $('photoAlbumCaption').replaceChildren(document.createTextNode(photo.caption || photo.title || photo.place), photoYearTag(photo));
    $('photoAlbumPosition').textContent = (index + 1) + ' / ' + items.length;
    $('photoAlbumPrev').disabled = index === 0;
    $('photoAlbumNext').disabled = index === items.length - 1;
    album.scrollTop = 0;
    if (focus) $('photoAlbumBack').focus({ preventScroll: true });
  }
  function backToIndex() {
    const id = filtered()[selected]?.id;
    page = Math.max(0, Math.floor(selected / pageSize));
    $('photoAlbumViewer').hidden = true;
    $('photoAlbumIndex').hidden = false;
    renderIndex();
    Array.from($('photoAlbumGrid').children).find(button => button.dataset.photo === id)?.focus({ preventScroll: true });
  }
  $('photoAlbumBack').addEventListener('click', backToIndex);
  $('photoAlbumPrev').addEventListener('click', () => showPhoto(selected - 1));
  $('photoAlbumNext').addEventListener('click', () => showPhoto(selected + 1));
  album.addEventListener('keydown', event => {
    if ($('photoAlbumViewer').hidden || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(selected + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  album.addEventListener('cancel', event => {
    if (!$('photoAlbumViewer').hidden) { event.preventDefault(); backToIndex(); }
  });
})();
