import {Event, EventlinkClient, Organization} from "spirit-link";
import prompts from "prompts";
import {
  actionsPrompt,
  backupPathPrompt,
  confirmPrompt,
  createEventPrompt,
  createOrgPrompt, getSnapshotNamePrompt, getSnoopPrompt,
  loginPrompt
} from "./promptsConfigs.js";
import {SnoopInstance} from "./SnoopInstance.js";

const quitOnCancel = {onCancel: () => process.exit(1)}

const answers = await prompts(loginPrompt, quitOnCancel);

const client = new EventlinkClient();
await client.login(answers.email, answers.password);

const me = await client.getMe();
const myOrgs = me.roles.map((r) => r.organization);

const snoops: SnoopInstance[] = [];

let continueLooping = true;
while(continueLooping) {
  const {action} = await prompts(actionsPrompt);
  switch (action) {
    case "addNew":
      const org = (await prompts(createOrgPrompt(myOrgs))).org as Organization;
      if(!org) continue;

      const events = await client.getUpcomingEvents(org.id);
      const event = (await prompts(createEventPrompt(events.events))).event as Event;
      if(!event) continue;

      const {backupPath} = await prompts(backupPathPrompt);
      if(!backupPath) continue;

      snoops.push(new SnoopInstance(client, event, backupPath));
      const setupSnap = await snoops.at(-1).init();
      console.log('New snoop created! Rolling snapshot created at ' + setupSnap);
      break;
    case "snapshot":
      const snoop = (await prompts(getSnoopPrompt(snoops))).snoop as SnoopInstance;
      if(!snoop) continue;

      const {snapshotName} = await prompts(getSnapshotNamePrompt);
      if(!snapshotName) continue;

      await snoop.takeSnapshot(snapshotName);
      break;
    case "quit":
      const {confirmed} = await prompts(confirmPrompt);
      if(confirmed) {
        continueLooping = false;
        snoops.forEach((snoop) => snoop.shutdown());
      }
      process.exit(0);
  }
}
