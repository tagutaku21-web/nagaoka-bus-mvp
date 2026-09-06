import { mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

const feedUrl = process.env.GTFS_URL || "https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed";
const rawZip = join(process.cwd(), "data", "raw", "nagaoka-gtfs.zip");
const gtfsDir = join(process.cwd(), "data", "gtfs", "nagaoka");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

await mkdir(dirname(rawZip), { recursive: true });
await rm(gtfsDir, { recursive: true, force: true });
await mkdir(gtfsDir, { recursive: true });

const response = await fetch(feedUrl);
if (!response.ok || !response.body) {
  throw new Error(`GTFSを取得できません: ${response.status} ${response.statusText}`);
}

await pipeline(response.body, createWriteStream(rawZip));
await run("unzip", ["-oq", rawZip, "-d", gtfsDir]);
await run(process.execPath, ["scripts/import-gtfs.mjs"], {
  env: { ...process.env, GTFS_DIR: gtfsDir }
});

