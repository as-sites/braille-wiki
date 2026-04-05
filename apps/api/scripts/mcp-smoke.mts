import * as appModule from "../src/app.ts";
import * as mcpModule from "../src/mcp/index.ts";

const app = (appModule as any).createApp();
(mcpModule as any).registerMcpRoutes(app as any);

const list = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

const run = async () => {
  const res = await app.request("http://localhost/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(list),
  });
  console.log("status", res.status);
  console.log("body", await res.text());
};
run().catch((e) => { console.error(e); process.exit(1); });
