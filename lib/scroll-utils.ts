/**
 * Utility helper to trigger smooth scroll-to-top across Zeinity Creator Studio.
 * Dispatches a custom event that the root <main> scroll container in page.tsx listens to.
 */
export function scrollToStudioTop(smooth: boolean = true): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('zeinity:scroll-to-top', {
        detail: { smooth },
      })
    );
  }
}
