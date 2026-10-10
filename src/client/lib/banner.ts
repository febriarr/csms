export function logBanner(): void {
  const version = document.querySelector<HTMLElement>('[data-app-version]')?.dataset.appVersion;

  console.log('Trial version of Cold Storage Monitoring System (CSMS) is running.');
  console.log('if you see bugs or issues, please report to https://github.com/febriarr/csms/issues');
  console.log('Or contact the developer at hello.febriar@gmail.com');
  console.log(
    `%cCI-CMS%c${version ? ` v${version}` : ''}`,
    'color:#3b82f6;font-weight:bold;font-size:14px;',
    'color:#888;font-size:12px;'
  );
}
