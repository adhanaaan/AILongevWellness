/**
 * Typed postMessage protocol between the web app (packages/web, running inside
 * the shell's WebView) and the native shell (packages/shell).
 */
export { BridgeCore, bridgeError, DEFAULT_TIMEOUT_MS, type Envelope, type BridgeCoreOptions } from "./protocol";
export {
  PROTOCOL_VERSION,
  type BootConfig,
  type BridgeError,
  type BridgeErrorCode,
  type NativePlatform,
  type NativeToWebEvent,
  type NativeToWebEvents,
  type NativeToWebMethod,
  type NativeToWebRequests,
  type SafeAreaInsets,
  type WebToNativeMethod,
  type WebToNativeRequests,
} from "./types";

/**
 * Global the shell injects via `injectedJavaScriptBeforeContentLoaded`, which
 * react-native-webview guarantees runs before any page script.
 *
 * The web app keys native-mode detection off this rather than off
 * `window.ReactNativeWebView` directly: that global is injected by the library
 * itself and is normally present first, but not reliably so on a cold load or
 * reload. Losing that race means booting in web mode, never wiring the bridge,
 * and then failing every native call.
 */
export const NATIVE_HOST_FLAG = "__AIW_NATIVE_HOST__";

/** Global the shell writes the current safe-area insets into. */
export const NATIVE_INSETS_GLOBAL = "__AIW_NATIVE_INSETS__";

/** Global the web app exposes for the shell to push messages into. */
export const WEB_RECEIVER_GLOBAL = "__AIW_BRIDGE_RECEIVE__";
