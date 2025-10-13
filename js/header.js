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

async function injectHeader() {
  const placeholder = document.querySelector('[data-include="site-header"]');
  if (!placeholder) {
    return;
  }

  const rootPath = document.body?.dataset?.rootPath || '.';
  const headerPath = resolvePath(rootPath, 'partials/header.html');

  try {
    const response = await fetch(headerPath);
    if (!response.ok) {
      throw new Error(`Failed to load header include: ${response.status}`);
    }
    const fragment = document.createElement('div');
    fragment.innerHTML = await response.text();

    rewriteHrefAttributes(rootPath, fragment);
    applyActiveState(document.body?.dataset?.page, fragment);

    placeholder.replaceWith(...fragment.childNodes);
    setupContactModal();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', injectHeader);
