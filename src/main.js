import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
    // Error handling silent in production for simplicity
    // To enable debugging, use window['console']['error']
};

window.onerror = function(message, source, lineno, colno, error) {
   // Global error handler
};

app.mount("#app");
