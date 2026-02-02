import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
    console.error("Vue Error:", err);
    console.error("Info:", info);
};

window.onerror = function(message, source, lineno, colno, error) {
   console.error("Global Error:", message, error);
};

app.mount("#app");
