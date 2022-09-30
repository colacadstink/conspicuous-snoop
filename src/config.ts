import * as fs from "fs";
import * as path from "path";
import {SnoopInstance} from "./SnoopInstance.js";
import {EventlinkClient} from "spirit-link";

const CONFIG_FILE_NAME = 'conspicuous-snoop-config.json';

type SnoopConfig = {
  snoops: {
    name: string,
    eventId: string,
  }[]
};

export async function loadFromConfigIfAvailable(client: EventlinkClient, backupDir: string): Promise<SnoopInstance[]> {
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(path.join(backupDir, CONFIG_FILE_NAME));
  } catch {
    return []; // this can fail, it's fine
  }

  if(stat.isFile()) {
    const config = await loadConfig(backupDir);
    const attemptedSnoops = await Promise.allSettled(config.snoops.map(async (snoopConfig) => {
      const snoop = new SnoopInstance(client, snoopConfig.eventId, snoopConfig.name, backupDir);
      await snoop.init();
      return snoop;
    }));
    if(attemptedSnoops.some((s) => s.status === 'rejected')) {
      console.warn('Some snoops could not be restarted:');
    }
    return attemptedSnoops.map((s) => {
      if(s.status === 'fulfilled') {
        return s.value;
      } else {
        console.warn(s.reason);
        return null;
      }
    }).filter((s) => s);
  }

  return [];
}

export async function updateConfigFile(backupDir: string, snoops: SnoopInstance[]) {
  const config: SnoopConfig = {
    snoops: snoops.map((s) => {
      return {
        name: s.name,
        eventId: s.eventId,
      };
    })
  };

  await writeConfig(backupDir, config);
}

async function loadConfig(dir: string) {
  const configString = await fs.promises.readFile(path.join(dir, CONFIG_FILE_NAME), {encoding: "utf-8"});
  return JSON.parse(configString) as SnoopConfig;
}

async function writeConfig(dir: string, config: SnoopConfig) {
  const configString = JSON.stringify(config, null, 2);
  await fs.promises.writeFile(path.join(dir, CONFIG_FILE_NAME), configString, {encoding: "utf-8"});
}