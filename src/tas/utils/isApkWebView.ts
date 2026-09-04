/** True in the Open edX APK WebView. False in desktop and phone Chrome. */
export function isApkWebView(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof (window as Window & { AndroidBridge?: unknown }).AndroidBridge !== 'undefined') {
    return true;
  }
  return /; wv\)/.test(window.navigator.userAgent);
}
