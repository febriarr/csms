document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('dashboard-toggle');
  const sidebar = document.getElementById('dashboard-sidebar');
  const backdrop = document.getElementById('dashboard-backdrop');

  if (!toggleButton || !sidebar || !backdrop) {
    return;
  }

  const openSidebar = () => {
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('dashboard-open');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('dashboard-open');
  };

  toggleButton.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) {
      closeSidebar();
      return;
    }
    openSidebar();
  });

  backdrop.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 900) {
        closeSidebar();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) {
      closeSidebar();
    }
  });
});

const logoutButton = document.getElementById('logout-button');

logoutButton?.addEventListener('click', async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    window.location.href = '/';
  } catch (error) {
    console.error(error);

    logoutButton.disabled = false;
    alert('Gagal melakukan logout');
  }
});

function initStickyHeader(container) {
  const table = container.querySelector('table');
  const thead = table && table.querySelector('thead');
  if (!table || !thead) return;

  const clone = document.createElement('div');
  clone.className = 'table-header-clone';
  clone.setAttribute('aria-hidden', 'true');

  const cloneTable = document.createElement('table');
  cloneTable.className = table.className;
  const colgroup = document.createElement('colgroup');
  const theadClone = thead.cloneNode(true);

  cloneTable.appendChild(colgroup);
  cloneTable.appendChild(theadClone);
  clone.appendChild(cloneTable);
  document.body.appendChild(clone);

  const getHeaderHeight = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
    if (raw.endsWith('rem')) {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return parseFloat(raw) * rootFontSize;
    }
    return parseFloat(raw) || 0;
  };

  function sync() {
    const headerHeight = getHeaderHeight();
    const containerRect = container.getBoundingClientRect();
    const theadRect = thead.getBoundingClientRect();
    const isScrolledPast = theadRect.top <= headerHeight;

    clone.style.top = headerHeight + 'px';
    clone.style.left = containerRect.left + 'px';
    clone.style.width = containerRect.width + 'px';
    cloneTable.style.width = table.offsetWidth + 'px';

    const ths = Array.from(thead.querySelectorAll('th'));
    while (colgroup.children.length < ths.length) {
      colgroup.appendChild(document.createElement('col'));
    }
    while (colgroup.children.length > ths.length) {
      colgroup.removeChild(colgroup.lastChild);
    }
    ths.forEach((th, i) => {
      colgroup.children[i].style.width = th.getBoundingClientRect().width + 'px';
    });

    cloneTable.style.transform = 'translateX(-' + container.scrollLeft + 'px)';

    clone.style.visibility = isScrolledPast ? 'visible' : 'hidden';
    thead.style.visibility = isScrolledPast ? 'hidden' : 'visible';
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      sync();
      ticking = false;
    });
  }

  const resizeObserver = new ResizeObserver(onScroll);
  resizeObserver.observe(container);
  resizeObserver.observe(table);

  window.addEventListener('scroll', onScroll);
  container.addEventListener('scroll', sync);
  window.addEventListener('resize', onScroll);

  sync();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-sticky-header]').forEach(initStickyHeader);
});

console.log('Trial version of Cold Storage Monitoring System (CSMS) is running.');
console.log('if you see bugs or issues, please report to https://github.com/febriarr/csms/issues');
console.log('Or contact the developer at hello.febriar@gmail.com');
console.log('%cCI-CMS%', 'color:#3b82f6;font-weight:bold;font-size:14px;');
