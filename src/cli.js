#!/usr/bin/env node
import { openDatabase, initSchema } from "./db.js";
import { loadConfig } from "./config.js";
import { answerFromDatabase, formatSearchResults, searchDatabase } from "./search.js";
import { seedDatabase } from "./seed.js";
import { getDefaultSiteSnapshotPath, writeSiteDataSnapshot } from "./site_data.js";
import { formatStats, getStats } from "./stats.js";
import { syncSource } from "./sync.js";
import { refreshAssetProfiles } from "./visual.js";

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || "help";
  const options = {};
  const rest = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      options.sourceRoot = args[index + 1];
      index += 1;
    } else if (arg === "--db") {
      options.databasePath = args[index + 1];
      index += 1;
    } else if (arg === "--out") {
      options.outPath = args[index + 1];
      index += 1;
    } else if (arg === "--api-base") {
      options.apiBaseUrl = args[index + 1];
      index += 1;
    } else if (arg === "--no-media-hash") {
      options.hashMediaFiles = false;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else {
      rest.push(arg);
    }
  }

  return { command, options, rest };
}

function printHelp() {
  console.log(`
当前项目 IP 数据库智能体

命令：
  init                         初始化数据库和种子设定
  sync [--source 路径]          增量同步资料库
  stats                        查看统计
  search <关键词>               检索实体、文档片段和素材
  ask <问题>                    查询资料库证据
  entities [type]              列出实体，可选 character/organization/event/term/project
  export-site [--out 路径]      导出展示站可直接读取的 JSON

示例：
  npm run init
  npm run sync
  npm run search -- 项目主角
  npm run ask -- 项目角色A在队内是什么定位
  npm run export-site
`);
}

function listEntities(db, type) {
  const rows = type
    ? db.prepare("SELECT type, name, summary FROM entities WHERE type = ? ORDER BY name").all(type)
    : db.prepare("SELECT type, name, summary FROM entities ORDER BY type, name").all();

  if (rows.length === 0) {
    console.log("没有找到实体。");
    return;
  }

  for (const row of rows) {
    console.log(`[${row.type}] ${row.name}`);
    if (row.summary) console.log(`  ${row.summary}`);
  }
}

async function main() {
  const { command, options, rest } = parseArgs(process.argv.slice(2));
  if (command === "help" || command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  const config = loadConfig(options);
  const db = openDatabase(config.databasePath);

  try {
    if (command === "init") {
      initSchema(db);
      seedDatabase(db);
      console.log(`数据库已初始化：${config.databasePath}`);
      console.log(`资料源：${config.sourceRoot}`);
      return;
    }

    initSchema(db);

    if (command === "sync" || command === "update") {
      seedDatabase(db);
      console.log(`开始同步：${config.sourceRoot}`);
      const { runId, stats } = await syncSource(db, config, options);
      console.log(`同步完成：#${runId}`);
      console.log(`扫描 ${stats.scanned}，新增 ${stats.inserted}，更新 ${stats.updated}，未变 ${stats.unchanged}，删除 ${stats.deleted}，抽取文档 ${stats.extractedDocuments}，错误 ${stats.errors}`);
      if (stats.notes.length > 0) {
        console.log("备注：");
        for (const note of stats.notes.slice(0, 20)) console.log(`- ${note}`);
        if (stats.notes.length > 20) console.log(`...还有 ${stats.notes.length - 20} 条`);
      }
      return;
    }

    if (command === "stats") {
      console.log(formatStats(getStats(db)));
      return;
    }

    if (command === "search") {
      console.log(formatSearchResults(searchDatabase(db, rest)));
      return;
    }

    if (command === "ask") {
      console.log(answerFromDatabase(db, rest));
      return;
    }

    if (command === "entities") {
      listEntities(db, rest[0]);
      return;
    }

    if (command === "export-site" || command === "site-data") {
      seedDatabase(db);
      refreshAssetProfiles(db);
      const outPath = options.outPath || getDefaultSiteSnapshotPath();
      const { data } = writeSiteDataSnapshot(db, outPath, {
        apiBaseUrl: options.apiBaseUrl || ""
      });
      console.log(`展示站数据已导出：${outPath}`);
      console.log(`角色 ${data.counts.characters}，组织 ${data.counts.organizations}，事件 ${data.counts.events}，术语 ${data.counts.terms}`);
      return;
    }

    console.error(`未知命令：${command}`);
    printHelp();
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
