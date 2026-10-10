import './ui5';
import './app.css';

// UI5 Web Components
import '@ui5/webcomponents/dist/Assets.js';

import '@ui5/webcomponents/dist/Bar.js';
import '@ui5/webcomponents/dist/BusyIndicator.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/DatePicker.js';
import '@ui5/webcomponents/dist/Dialog.js';
import '@ui5/webcomponents/dist/Icon.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Label.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/ListItemStandard.js';
import '@ui5/webcomponents/dist/Link.js';
import '@ui5/webcomponents/dist/MessageStrip.js';
import '@ui5/webcomponents/dist/Option.js';
import '@ui5/webcomponents/dist/Panel.js';
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

import '@ui5/webcomponents-fiori/dist/NavigationLayout.js';
import '@ui5/webcomponents-fiori/dist/SideNavigation.js';
import '@ui5/webcomponents-fiori/dist/SideNavigationItem.js';


// UI5 Icons
import '@ui5/webcomponents-icons/dist/AllIcons.js';

// Alpine
import Alpine from 'alpinejs';

import { logBanner } from './lib/banner';
import { loadPageScripts } from './lib/pages';
import { hidePageLoading, initShell } from './lib/shell';

window.Alpine = Alpine;

Alpine.start();

initShell();
logBanner();

void loadPageScripts().catch(error => console.error('Failed to load page script', error));
void hidePageLoading();
