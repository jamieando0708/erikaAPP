import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { ClaudeFactChecker } from "./factcheck/claude.js";
import { DemoExtractor, DemoFactChecker } from "./factcheck/demo.js";
import { YtDlpExtractor } from "./video/extract.js";
import { DeepgramTranscriber } from "./video/transcribe.js";

const config = loadConfig();
if (!config.deepgramApiKey && !config.demoMode) {
  console.warn("DEEPGRAM_API_KEY not set - videos without captions can't be transcribed");
}
const transcriber = config.deepgramApiKey ? new DeepgramTranscriber(config.deepgramApiKey) : null;
const { app } = createApp({
  config,
  db: openDatabase(config.databasePath),
  extractor: config.demoMode ? new DemoExtractor() : new YtDlpExtractor(config.ytDlpPath, transcriber, config.maxTranscribeSeconds),
  factChecker: config.demoMode
    ? new DemoFactChecker()
    : new ClaudeFactChecker(new Anthropic(), config.claudeModel),
});

app.listen(config.port, () => {
  console.log(`Sift API listening on http://localhost:${config.port} (billing: ${config.billingMode}${config.demoMode ? ", DEMO MODE: AI results are fake" : ""})`);
});
