import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Current routes are force-dynamic; no paid cache services are provisioned.
const config = defineCloudflareConfig();
config.buildCommand = "PORTFOLIO_CLOUDFLARE_BUILD=1 npm run build -- --webpack";
export default config;
