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
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', injectHeader);
