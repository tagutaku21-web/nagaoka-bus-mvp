import { mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

const feeds = [
  {
    id: "nagaoka",
    url: process.env.NAGAOKA_GTFS_URL || "https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed"
  },
  {
    id: "tsubame",
    url: process.env.TSUBAME_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/tsubamecity/feeds/tsubame_bus/files/feed.zip?rid=current"
  }
];

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

for (const feed of feeds) {
  const rawZip = join(process.cwd(), "data", "raw", `${feed.id}-gtfs.zip`);
  const gtfsDir = join(process.cwd(), "data", "gtfs", feed.id);
  const outFile = join(process.cwd(), "public", "data", "feeds", `${feed.id}.json`);

  await mkdir(dirname(rawZip), { recursive: true });
  await mkdir(dirname(outFile), { recursive: true });
  await rm(gtfsDir, { recursive: true, force: true });
  await mkdir(gtfsDir, { recursive: true });

  const response = await fetch(feed.url);
  if (!response.ok || !response.body) {
    throw new Error(`${feed.id} のGTFSを取得できません: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(rawZip));
  await run("unzip", ["-oq", rawZip, "-d", gtfsDir]);
  await run(process.execPath, ["scripts/import-gtfs.mjs"], {
    env: { ...process.env, GTFS_DIR: gtfsDir, GTFS_OUTFILE: outFile }
  });
}