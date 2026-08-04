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

console.log('Trial version of Cold Storage Monitoring System (CSMS) is running.');
console.log('if you see bugs or issues, please report to https://github.com/febriarr/csms/issues');
console.log('Or contact the developer at hello.febriar@gmail.com');
console.log('%cCI-CMS%', 'color:#3b82f6;font-weight:bold;font-size:14px;');
