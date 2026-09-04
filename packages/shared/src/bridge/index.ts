/**
 * Typed postMessage protocol between the web app (packages/web, running inside
 * the shell's WebView) and the native shell (packages/shell).
 *
 * Filled in during Phase 3. Bumped whenever the wire format changes: the shell
 * ships to app stores and updates on Apple/Google's schedule, while the web app
 * updates instantly on every Vercel deploy -- so a newer web app is routinely
 * talking to an older shell, and the handshake asserts on this.
 */
export const PROTOCOL_VERSION = 1;
