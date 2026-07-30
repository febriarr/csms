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
