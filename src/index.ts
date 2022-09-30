import {Event, EventlinkClient, Organization} from "spirit-link";
import prompts from "prompts";
import {
  actionsPrompt,
  backupPathPrompt,
  confirmPrompt,
  createEventPrompt,
  createOrgPrompt, createSnoopNamePrompt, getSnapshotNamePrompt, getSnoopPrompt,
  loginPrompt
} from "./promptsConfigs.js";
import {SnoopInstance} from "./SnoopInstance.js";
import {loadFromConfigIfAvailable, updateConfigFile} from "./config.js";

const quitOnCancel = {onCancel: () => process.exit(1)};

const client = new EventlinkClient();
if(process.env.EVENTLINK_EMAIL && process.env.EVENTLINK_PASSWORD) {
  console.log(`Using ENV vars to log in as ${process.env.EVENTLINK_EMAIL}`);
  await client.login(process.env.EVENTLINK_EMAIL, process.env.EVENTLINK_PASSWORD);
} else {
  const answers = await prompts(loginPrompt, quitOnCancel);
  await client.login(answers.email, answers.password);
}

const me = await client.getMe();
const myOrgs = me.roles.map((r) => r.organization);

if(myOrgs.length === 0) {
  console.error("You don't belong to any organizations, so you cannot snoop on events.");
  process.exit(1);
}

const {backupPath} = await prompts(backupPathPrompt, quitOnCancel);

const snoops = await loadFromConfigIfAvailable(client, backupPath);

let continueLooping = true;
while(continueLooping) {
  const {action} = await prompts(actionsPrompt);
  switch (action) {
    case "addNew":
      let org: Organization;
      if(myOrgs.length === 1) {
        org = myOrgs[0];
      } else {
        org = (await prompts(createOrgPrompt(myOrgs))).org as Organization;
      }
      if(!org) continue;

      const events = await client.getUpcomingEvents(org.id);
      const event = (await prompts(createEventPrompt(events.events))).event as Event;
      if(!event) continue;

      const {name} = await prompts(createSnoopNamePrompt(event));

      snoops.push(new SnoopInstance(client, event.id, name, backupPath));
      const setupSnap = await snoops.at(-1).init();
      console.log('New snoop created! Rolling snapshot created at ' + setupSnap);

      await updateConfigFile(backupPath, snoops);
      console.log('Config file updated.');

      break;
    case "remove":
      const snoopToRemove = (await prompts(getSnoopPrompt(snoops))).snoop as SnoopInstance;
      const index = snoops.indexOf(snoopToRemove);
      snoops.splice(index, 1);
      snoopToRemove.shutdown();
      console.log("Stopped updating snoop - logs will still exist!");
      break;
    case "snapshot":
      const snoop = (await prompts(getSnoopPrompt(snoops))).snoop as SnoopInstance;
      if(!snoop) continue;

      const {snapshotName} = await prompts(getSnapshotNamePrompt);
      if(!snapshotName) continue;

      await snoop.takeSnapshot(snapshotName);
      break;
    default:
      const result = await prompts(confirmPrompt);
      if(result.confirmed || result.confirmed === undefined) { // Ctrl+C makes this undefined
        continueLooping = false;
        snoops.forEach((snoop) => snoop.shutdown());
        process.exit(0);
      }
  }
}
