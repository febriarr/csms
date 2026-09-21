import './app.css';
// UI5 Web Components
import '@ui5/webcomponents/dist/Assets.js';

import '@ui5/webcomponents/dist/Bar.js';
import '@ui5/webcomponents/dist/BusyIndicator.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/DatePicker.js';
import '@ui5/webcomponents/dist/Dialog.js';
import '@ui5/webcomponents/dist/Icon.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Label.js';
import '@ui5/webcomponents/dist/Link.js';
import '@ui5/webcomponents/dist/MessageStrip.js';
import '@ui5/webcomponents/dist/Option.js';
import '@ui5/webcomponents/dist/Select.js';
import '@ui5/webcomponents/dist/Switch.js';
import '@ui5/webcomponents/dist/Table.js';
import '@ui5/webcomponents/dist/TableCell.js';
import '@ui5/webcomponents/dist/TableHeaderCell.js';
import '@ui5/webcomponents/dist/TableHeaderRow.js';
import '@ui5/webcomponents/dist/TableRow.js';
import '@ui5/webcomponents/dist/Tag.js';
import '@ui5/webcomponents/dist/Text.js';
import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Toolbar.js';
import '@ui5/webcomponents/dist/ToolbarButton.js';
import '@ui5/webcomponents/dist/BusyIndicator.js';

// UI5 Icons
import '@ui5/webcomponents-icons/dist/AllIcons.js';

//Alpine
import Alpine from 'alpinejs';

window.Alpine = Alpine;

Alpine.start();

async function bootstrap() {
  await customElements.whenDefined('ui5-busy-indicator');

  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  document.getElementById('page-loading')?.classList.add('is-loaded');
}

bootstrap();

const documentationButton = document.getElementById('button-documentation');

documentationButton?.addEventListener('click', () => {
  window.location.href = '/dashboard/docs/user-guide';
});
