import {Event, EventlinkClient} from "spirit-link";
import {Subscription} from "rxjs";
import * as fs from "fs";
import * as path from "path";

export class SnoopInstance {
  #subs: Subscription[] = [];

  constructor(
    private client: EventlinkClient,
    private event: Event,
    private backupPath: string,
  ) {}

  init() {
    this.#subs = [
      this.client.subscribeToGameResultReported(this.event.id).subscribe(() => this.updateRollingSnapshot()),
      this.client.subscribeToCurrentRound(this.event.id).subscribe((round) => this.roundChange(round)),
    ];
    return this.takeSnapshot('rolling', true);
  }

  roundChange(round) {
    return this.takeSnapshot(`round-${round.number}-auto`);
  }

  updateRollingSnapshot() {
    return this.takeSnapshot(`rolling`, true);
  }

  async takeSnapshot(snapshotName: string, isRolling = false) {
    let eventInfo = await this.client.getEventInfo(this.event.id, 'cache-only');
    try {
      eventInfo = await this.client.getEventInfo(this.event.id, 'network-only');
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
    let savePath = path.join(this.backupPath, 'snapshots', filename);
    if(isRolling) {
      filename = `${snapshotName}.json`;
      savePath = path.join(this.backupPath, filename)
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
    return `${this.event.title} (${this.event.scheduledStartTime})`
  }
}