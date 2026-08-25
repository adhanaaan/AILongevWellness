import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// Custom HTML shell for the web build (Expo Router). The one thing we can't set
// any other way is `viewport-fit=cover` — without it, iOS Safari reports
// env(safe-area-inset-*) as 0, so react-native-safe-area-context can't tell the
// app how tall the home indicator / notch are, and fixed bars clip. With it (+
// the SafeAreaProvider in _layout.tsx), the bottom tab bar gets the real inset.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Make the app exactly the DYNAMIC viewport tall (100dvh), not 100% — on iOS
// Safari `height: 100%` resolves to the *large* viewport (incl. the bottom
// toolbar area), so the app extends under Safari's chrome and the bottom tab
// labels clip. `height: 100dvh` keeps the app's bottom edge above the toolbar.
// This must be `height` (not `min-height`) and must override Expo's
// ScrollViewStyleReset `#root{height:100%}` — hence it's placed after it in the
// <head>. Also paints the brand background (bone) to avoid a white flash.
const baseStyle = `
html, body { margin: 0; height: 100%; background-color: #FAF9F4; }
#root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}
`;
