const HEADER_TEMPLATE = /* html */ `
<nav class="navbar navbar-expand-lg header">
  <div class="container-fluid">
    <a class="navbar-brand" href="#" data-path="index.html" data-nav="brand">Cloud Driver 雲端司機</a>
    <button id="headerThemeToggle" class="header-theme-toggle" aria-label="Toggle dark/light mode">
      <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarText"
      aria-controls="navbarText"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarText">
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <a class="nav-link" data-path="index.html" data-nav="home">Home🧐</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" data-path="publications.html" data-nav="publications">Publications📕</a>
        </li>
        <li class="nav-item">
          <a href="#" class="nav-link" data-nav="contact" data-contact-trigger>Contact Me🌻</a>
        </li>
        <li class="nav-item dropdown">
          <a
            class="nav-link dropdown-toggle"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            data-nav="misc-root"
          >
            When I'm Not Doing Research🌊
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" data-path="misc/travel_map.html" data-nav="travel_map">Travel Map</a></li>
            <li><a class="dropdown-item" data-path="misc/music.html" data-nav="music">Music</a></li>
            <li><a class="dropdown-item" data-path="misc/transfer_guide.html" data-nav="transfer_guide">Transfer Guide</a></li>
            <li><a class="dropdown-item" data-path="misc/game.html" data-nav="game">Game</a></li>
            <li><a class="dropdown-item" data-path="misc/ink_light.html" data-nav="ink_light">Ink & Light</a></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</nav>

<div class="contact-modal" id="contactModal" aria-hidden="true">
  <div class="contact-modal__overlay" data-contact-close></div>
  <div class="contact-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle" tabindex="-1">
    <button type="button" class="contact-modal__close" aria-label="Close" data-contact-close>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 6l12 12m0-12L6 18" />
      </svg>
    </button>
    <h2 class="contact-modal__title" id="contactModalTitle">Contact Me</h2>
    <p class="contact-modal__subtitle">Let's connect - I'm always excited to talk about research, collaborations, or anything fun.</p>
    <ul class="contact-modal__list">
      <li>
        <span class="contact-modal__label">WeChat</span>
        <span class="contact-modal__value">DiudiuandMoon</span>
      </li>
      <li>
        <span class="contact-modal__label">RedNote/小红书</span>
        <span class="contact-modal__value">9428710724</span>
      </li>
      <li>
        <span class="contact-modal__label">Email</span>
        <a class="contact-modal__value" href="mailto:huishen011227@gmail.com">huishen011227@gmail.com</a>
      </li>
      <li>
        <span class="contact-modal__label">School Email</span>
        <a class="contact-modal__value" href="mailto:huishen@umich.edu">huishen@umich.edu</a>
      </li>
    </ul>
  </div>
</div>
`;

function resolvePath(base, target) {
  if (!base || base === '.' || base === './') {
    return target;
  }
  const sanitizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${sanitizedBase}/${target}`;
}

function applyActiveState(currentPage, headerRoot) {
  if (!currentPage) {
    return;
  }
  const activeLink = headerRoot.querySelector(`[data-nav="${currentPage}"]`);
  if (!activeLink) {
    return;
  }

  if (activeLink.classList.contains('dropdown-item')) {
    activeLink.classList.add('active');
    const dropdownToggle = activeLink
      .closest('.dropdown')
      ?.querySelector('.dropdown-toggle');
    if (dropdownToggle) {
      dropdownToggle.classList.add('active');
    }
  } else {
    activeLink.classList.add('active');
  }
}

function rewriteHrefAttributes(rootPath, headerRoot) {
  headerRoot.querySelectorAll('[data-path]').forEach((link) => {
    const targetPath = link.getAttribute('data-path');
    if (!targetPath) {
      return;
    }
    link.setAttribute('href', resolvePath(rootPath, targetPath));
  });
}

function setupHeaderFrosting() {
  const header = document.querySelector('.header');
  if (!header) {
    return;
  }

  const toggleFrost = () => {
    const shouldFrost = window.scrollY > 24;
    header.classList.toggle('header--frosted', shouldFrost);
  };

  toggleFrost();
  window.addEventListener('scroll', toggleFrost, { passive: true });
}

function setupContactModal() {
  const modal = document.getElementById('contactModal');
  const trigger = document.querySelector('[data-contact-trigger]');

  if (!modal || !trigger) {
    return;
  }

  const dialog = modal.querySelector('.contact-modal__dialog');
  const closeElements = modal.querySelectorAll('[data-contact-close]');
  const focusableSelectors =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocusedElement = null;
  let focusableElements = [];

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab' || focusableElements.length === 0) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openModal(event) {
    event.preventDefault();

    if (modal.classList.contains('contact-modal--open')) {
      return;
    }

    lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modal.classList.add('contact-modal--open');
    document.body.classList.add('contact-modal-open');
    modal.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');

    focusableElements = Array.from(dialog.querySelectorAll(focusableSelectors));

    requestAnimationFrame(() => {
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialog.focus();
      }
    });

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeModal() {
    if (!modal.classList.contains('contact-modal--open')) {
      return;
    }

    modal.classList.remove('contact-modal--open');
    document.body.classList.remove('contact-modal-open');
    modal.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', handleKeyDown);

    focusableElements = [];

    requestAnimationFrame(() => {
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      } else {
        trigger.focus();
      }
    });
  }

  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'contactModal');

  trigger.addEventListener('click', openModal);
  trigger.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      openModal(event);
    }
  });
  closeElements.forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      closeModal();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

let headerInitialized = false;

function injectHeader() {
  if (headerInitialized) {
    return true;
  }

  const placeholder = document.querySelector('[data-include="site-header"]');
  if (!placeholder) {
    return false;
  }

  headerInitialized = true;

  const rootPath = document.body?.dataset?.rootPath || '.';
  const fragmentHost = document.createElement('div');
  fragmentHost.innerHTML = HEADER_TEMPLATE.trim();

  rewriteHrefAttributes(rootPath, fragmentHost);
  applyActiveState(document.body?.dataset?.page, fragmentHost);

  const nodes = Array.from(fragmentHost.childNodes);
  placeholder.replaceWith(...nodes);
  setupContactModal();
  setupHeaderFrosting();
  return true;
}

if (!injectHeader() && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectHeader, { once: true });
}

// Theme Toggle Logic
(function () {
  const html = document.documentElement;

  function getPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }

  // Initialize theme immediately
  setTheme(getPreferredTheme());

  function toggleTheme() {
    const currentTheme = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Listen for header theme toggle button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#headerThemeToggle')) {
      toggleTheme();
    }
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
