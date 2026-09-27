import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { ClaudeFactChecker } from "./factcheck/claude.js";
import { DemoExtractor, DemoFactChecker } from "./factcheck/demo.js";
import { YtDlpExtractor } from "./video/extract.js";

const config = loadConfig();
const { app } = createApp({
  config,
  db: openDatabase(config.databasePath),
  extractor: config.demoMode ? new DemoExtractor() : new YtDlpExtractor(config.ytDlpPath),
  factChecker: config.demoMode
    ? new DemoFactChecker()
    : new ClaudeFactChecker(new Anthropic(), config.claudeModel),
});

app.listen(config.port, () => {
  console.log(`FactFit API listening on http://localhost:${config.port} (billing: ${config.billingMode}${config.demoMode ? ", DEMO MODE: AI results are fake" : ""})`);
});
