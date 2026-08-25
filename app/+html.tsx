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

// Fill the dynamic viewport (100dvh) so the app's bottom edge sits above Safari's
// auto-hiding toolbar instead of under it, and paint the brand background (bone)
// behind everything to avoid a white flash on load.
const baseStyle = `
html, body { margin: 0; height: 100%; background-color: #FAF9F4; }
#root { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; }
`;
