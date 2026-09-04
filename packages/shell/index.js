import { registerRootComponent } from "expo";

import App from "./src/App";

// No expo-router here -- the shell is a single screen. All routing happens
// inside the WebView, in packages/web's expo-router tree.
registerRootComponent(App);
