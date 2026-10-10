/**
 * Ambient typings for browser globals used by the client bundle.
 * ApexCharts is still delivered as a vendor script (see `pageVendor` in the
 * diagnostics controller), so it is only available on `window`.
 */
export {};

declare global {
  interface ApexChartInstance {
    render(): Promise<void>;
  }

  interface Window {
    ApexCharts?: new (element: HTMLElement, options: Record<string, unknown>) => ApexChartInstance;
  }
}
