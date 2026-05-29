import { importSourceRegistry } from "./registry";
import { uptimeKumaSource } from "./sources/uptime-kuma/source";

importSourceRegistry.register(uptimeKumaSource);

export { importSourceRegistry } from "./registry";
export * from "./types";
