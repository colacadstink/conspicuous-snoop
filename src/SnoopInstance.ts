import {EventlinkClient} from "spirit-link";
import {Subscription} from "rxjs";
import * as fs from "fs";
import * as path from "path";

export class SnoopInstance {
  #subs: Subscription[] = [];

  constructor(
    private client: EventlinkClient,
    public readonly eventId: string,
    public readonly name: string,
    public readonly backupPath: string,
  ) {}

  init() {
    const dir = path.join(this.backupPath, this.name, 'snapshots');
    let mustMkdir = true;
    try {
      if(fs.statSync(dir).isDirectory()) {
        mustMkdir = false;
      }
    } catch {}
    if(mustMkdir) {
      fs.mkdirSync(dir, {recursive: true});
    }

    return this.resetSubs();
  }

  resetSubs() {
    for(const sub of this.#subs) {
      try {
        sub.unsubscribe();
      } catch {}
    }
    this.#subs = [
      this.client.subscribeToGameResultReported(this.eventId).subscribe({
        next: () => this.updateRollingSnapshot(),
        error: () => this.resetSubs(),
      }),
      this.client.subscribeToCurrentRound(this.eventId).subscribe({
        next: (round) => this.roundChange(round),
        error: () => this.resetSubs(),
      }),
    ];
    return this.updateRollingSnapshot();
  }

  roundChange(round) {
    return this.takeSnapshot(`round-${round.number}-auto`);
  }

  updateRollingSnapshot() {
    return this.takeSnapshot(`rolling`, true);
  }

  async takeSnapshot(snapshotName: string, isRolling = false) {
    let eventInfo = await this.client.getEventInfo(this.eventId, 'cache-only', true);
    try {
      eventInfo = await this.client.getEventInfo(this.eventId, 'network-only', true);
    } catch {
      snapshotName += '.FROM-CACHE-ONLY';
    }

    const dateString = new Date().toISOString()
      .replace('T','_')
      .replace('Z', '')
      .replace(/:/g, '-')
      .replace(/\.\d+/, '');
    const eventJSON = JSON.stringify(eventInfo, null, 2);

    let filename = `${dateString}.${snapshotName}.json`;
    let savePath = path.join(this.backupPath, this.name, 'snapshots', filename);
    if(isRolling) {
      filename = `${snapshotName}.json`;
      savePath = path.join(this.backupPath, this.name, filename)
    }

    await fs.promises.writeFile(
      savePath,
      eventJSON
    );

    return savePath;
  }

  shutdown() {
    this.#subs.forEach((s) => s.unsubscribe());
  }

  toString() {
    return this.name;
  }
}