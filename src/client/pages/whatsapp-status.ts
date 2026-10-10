/** The QR code / connection state is rendered server-side; poll by reloading. */
export default function init(): void {
  setTimeout(() => window.location.reload(), 3000);
}
