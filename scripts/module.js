// import {generateDamageScroll, extractDamageInfoCombined, getTargetList} from './utility.js'

import { getTargetTokens } from "./helpers/targets.js";

// HOOKS STUFF
Hooks.on("ready", () => {
  ui.notifications.notify("PF2e Roll Stats Exist");
  game.pf2eRollStats = {
    exportRolls: function (name) {
      exportRollsAsJSON(name);
      game.user.unsetFlag("pf2e-roll-stats", "rolls");
    },
    setSession: setSession,
    toggleLoggingStats: toggleLoggingStats,
  };
  Hooks.on("getSceneControlButtons", async (controls) => {
    controls.push({
      icon: "fas fa-chart-simple",
      layer: "stats",
      name: "rollstats",
      title: `PF2e Roll Stats`,
      visible: game.user.isGM,
      tools: [
        {
          name: "export",
          icon: "fas fa-file-export",
          title: `Export Roll Stats`,
          onClick: () => {
            Dialog.confirm({
              title: game.i18n.localize(
                "FXMASTER.ClearParticleAndFilterEffectsTitle"
              ),
              content: game.i18n.localize(
                "FXMASTER.ClearParticleAndFilterEffectsContent"
              ),
              yes: () => {
                ui.notifications.notify(
                  "Roll data has been exported and deleted"
                );
                exportRollsAsJSON("Roll Stats");
                game.user.unsetFlag("pf2e-roll-stats", "rolls");
              },
              defaultYes: true,
            });
          },
          button: true,
          visible: true,
        },
        {
          name: "active",
          icon: "fas fa-video",
          title: `Record Roll Stats`,
          toggle: true,
          onClick: (toggled) => {
            game.settings.set("pf2e-roll-stats", "log-stats", toggled);
          },
          button: true,
          visible: true,
        },
        {
          name: "delete",
          icon: "fas fa-trash",
          title: `Delete Roll Stats`,
          onClick: () => {
            Dialog.confirm({
              title: game.i18n.localize(
                "FXMASTER.ClearParticleAndFilterEffectsTitle"
              ),
              content: game.i18n.localize(
                "FXMASTER.ClearParticleAndFilterEffectsContent"
              ),
              yes: () => {
                ui.notifications.notify("Roll data has been deleted");
                game.user.unsetFlag("pf2e-roll-stats", "rolls");
              },
              defaultYes: true,
            });
          },
          button: true,
          visible: true,
        },
      ],
      activeTool: "export",
    });
  });

  Hooks.on("createChatMessage", async function (msg, _status, _id) {
    if (
      msg.rolls &&
      game.user.isGM &&
      game.settings.get("pf2e-roll-stats", "log-stats")
    ) {
      const result = generateStat(msg);
      debugLog({ msg, result });
      let all_rolls = game.user.getFlag("pf2e-roll-stats", "rolls") ?? [];
      all_rolls.push(result);
      game.user.setFlag("pf2e-roll-stats", "rolls", all_rolls);
    }
  });
});

export function generateStat(msg) {
  let res = {};
  const context = msg?.flags?.pf2e?.context;
  res.msgID = msg?.id;
  res.dc = context?.dc;
  res.domains = (context?.domains ?? []).concat(
    context?.options?.filter((o) => o.startsWith("action:")) ?? []
  );
  res.tokenId = context?.token;
  res.tokenName = context?.token && canvas.tokens.get(context?.token)?.name;
  res.tokenImg =
    context?.token && canvas.tokens.get(context?.token)?.document?.texture?.src;
  res.isReroll = context?.isReroll ?? false;
  res.traits = context?.traits;
  res.actorId = context?.actor;
  res.actorName = context?.actor && game.actors.get(context?.actor)?.name;
  res.actorImg = context?.actor && game.actors.get(context?.actor)?.img;
  res.type = context?.type;
  res.outcome = context?.outcome;
  res.secret = context?.secret || context?.rollMode === "gmroll";
  res.rollMode = context?.rollMode;
  res.user = msg?.user?.id;
  res.timestamp = msg.timestamp;
  res.targetActors = getTargetTokens(msg);
  res.targetTokens = getTargetTokens(msg);
  res.rolls = msg?.rolls.map((roll) => {
    return {
      total: roll.total,
      dice: roll.dice.map((die) => ({
        die: die.results.map((r) => ({
          faces: die.faces,
          flavor: die.flavor,
          total: r.result,
          active: r.active,
        })),
        expression: die.expression,
      })),
    };
  });
  return res;
}

// export function extractTerm(term, flavor = '') {
//     let result = [];
//     switch (term.constructor.name) {
//         case 'InstancePool':
//             for (const roll of term.rolls) {
//                 result = result.concat(extractTerm(roll, term.flavor || flavor));
//             }
//             break;
//         case 'DamageInstance':
//             for (const item of term.terms) {
//                 result = result.concat(extractTerm(item, term.types || flavor));
//             }
//             const keepPersistent = !!term.options.evaluatePersistent;
//             result = result
//                 .filter(res => res.type.startsWith('persistent,') ? keepPersistent : true)
//                 .map(r => ({ value: r.value, type: r.type.replace(/persistent,/g, '') }))
//             break;
//         case 'Grouping':
//             result = result.concat(extractTerm(term.term, term.flavor || flavor));
//             break;
//         case 'ArithmeticExpression':
//             switch (term.operator) {
//                 case '+':
//                     for (const op of term.operands) {
//                         result = result.concat(extractTerm(op, term.flavor || flavor));
//                     }
//                     break;
//                 case '-':
//                     result = result.concat(extractTerm(term.operands[0], term.flavor || flavor));
//                     result = result.concat(extractTerm(term.operands[1], term.flavor || flavor)).map(t => { return { value: -t.value, type: t.type } });
//                 case '*':
//                     if (['NumericTerm', 'Die'].includes(term.operands[0].constructor.name)) {
//                         result = result.concat(extractTerm(term.operands[1], term.flavor || flavor).flatMap(i => [i, i]));
//                     } else if (['NumericTerm', 'Die'].includes(term.operands[1].constructor.name)) {
//                         result = result.concat(extractTerm(term.operands[0], term.flavor || flavor).flatMap(i => [i, i]));
//                     } else {
//                         result.push({ value: term.total, type: term.flavor || flavor })
//                     }
//                     break;
//                 default:
//                     break;
//             }
//             break;
//         case 'Die':
//             for (const dice of term.results) {
//                 result.push({ value: dice.result, type: term.flavor || flavor })
//             }
//             break;
//         case 'NumericTerm':
//             result.push({ value: term.number, type: term.flavor || flavor })
//             break;

//         default:
//             console.error("Unrecognized Term when extracting parts", term)
//             result.push({ value: term.total, type: term.flavor || flavor })
//             break;
//     }
//     debugLog({ type: term.constructor.name, result }, 'extractTerm')

//     return result;
// }

export function debugLog(data, context = "") {
  if (game.settings.get("pf2e-roll-stats", "debug-mode"))
    console.log(`PF2E-Roll-Stats${context || "." + context}:`, data);
}

export async function setSession() {
  const currSession = game.user.getFlag("pf2e-roll-stats", "session") || "";
  let myValue = await Dialog.prompt({
    title: "Set Session Number",
    content: `<p>Current Session Number '${currSession}'</p><p>New Session Number:<input type="text"></p>`,
    callback: (html) => html.find("input").val(),
  });
  game.user.setFlag("pf2e-roll-stats", "session", myValue);
}
export function toggleLoggingStats() {
  game.settings.set(
    "pf2e-roll-stats",
    "log-stats",
    !game.settings.get("pf2e-roll-stats", "log-stats")
  );
}

export function exportRollsAsJSON(name) {
  const data = {
    name: game.user.getFlag("pf2e-roll-stats", "session") || "",
    rolls: game.user.getFlag("pf2e-roll-stats", "rolls"),
  };
  saveDataToFile(JSON.stringify(data), "json", `${name}.json`);
}
