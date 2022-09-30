import {PromptObject} from "prompts";
import {Event, Organization} from "spirit-link";
import * as fs from "fs";
import {SnoopInstance} from "./SnoopInstance.js";

export const loginPrompt: PromptObject[] = [{
  type: "text",
  name: "email",
  message: "Email:",
}, {
  type: "password",
  name: "password",
  message: "Password:",
}];

export const actionsPrompt: PromptObject = {
  type: "select",
  name: "action",
  message: "Choose one:",
  choices: [{
    title: "Add new event to watch list",
    value: "addNew",
  }, {
    title: "Snapshot an event",
    value: "snapshot",
  }, {
    title: "Quit",
    value: "quit",
  }],
};

export const confirmPrompt: PromptObject = {
  type: "select",
  name: "confirmed",
  message: "Are you sure?",
  choices: [{
    title: "No",
    value: false,
  }, {
    title: "Yes",
    value: true,
  }]
}

export const createOrgPrompt = (orgs: Organization[]): PromptObject => {
  return {
    type: "select",
    name: "org",
    message: "Which org?",
    choices: orgs.map((org) => {
      return {
        title: org.name,
        value: org,
      };
    })
  }
}

export const createEventPrompt = (events: Event[]): PromptObject => {
  return {
    type: "select",
    name: "event",
    message: "Which event?",
    choices: events.map((event) => {
      return {
        title: `${event.title} (${event.scheduledStartTime})`,
        value: event,
      };
    })
  }
}

export const createSnoopNamePrompt = (event: Event): PromptObject => {
  return {
    type: "text",
    name: "name",
    message: "What would you like to name this snoop?",
    initial: event.title.replace(/[^-. a-zA-Z0-9]/g, '').substring(0, 20),
  }
}

export const backupPathPrompt: PromptObject = {
  type: "text",
  name: "backupPath",
  message: "Where should these backups be created?",
  initial: 'snapshots',
  validate: (value) => {
    try {
      fs.mkdirSync(value, {recursive: true});
      return true;
    } catch (e) {
      return e.message;
    }
  }
};

export const getSnoopPrompt = (snoops: SnoopInstance[]): PromptObject => {
  return {
    type: "select",
    name: "snoop",
    message: "Which event do you want to snapshot?",
    choices: snoops.map((snoop) => {
      return {
        title: snoop.toString(),
        value: snoop,
      }
    })
  };
}

export const getSnapshotNamePrompt: PromptObject = {
  type: "text",
  name: "snapshotName",
  message: "Snapshot name (e.x. time-in-round-1):",
}
