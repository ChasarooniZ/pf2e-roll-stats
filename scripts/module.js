// import {generateDamageScroll, extractDamageInfoCombined, getTargetList} from './utility.js'
// HOOKS STUFF
Hooks.on("ready", () => {
    //game.RPGNumbers = new RPGNumbers();
    ui.notifications.notify("PF2e Roll Stats Exist")
    game.pf2eRollStats = {
        exportRolls: function (name) {
            exportRollsAsJSON(game.user.getFlag('pf2e-roll-stats', 'rolls'), name);
            game.user.unsetFlag('pf2e-roll-stats', 'rolls')
        }
    }
    Hooks.on('getSceneControlButtons', async (controls) => {
        controls.push({
            icon: 'fas fa-solid fa-chart-simple',
            layer: 'rollstats',
            name: "rollstats.ui.controls.group",
            title: `PF2e Roll Stats`,
            visible: game.user.isGM,
            tools: [
                {
                    name: "rollstats.ui.controls.export",
                    icon: 'fas fa-solid fa-file-export',
                    title: `Export Roll Stats`,
                    onClick: () => {
                        ui.notifications.notify("Roll data has been exported and deleted");
                        exportRollsAsJSON(game.user.getFlag('pf2e-roll-stats', 'rolls'), 'Roll Stats');
                        game.user.unsetFlag('pf2e-roll-stats', 'rolls');
                    },
                    button: true
                },
                {
                    name: "rollstats.ui.controls.active",
                    icon: 'fas fa-solid fa-video',
                    title: `Record Roll Stats`,
                    toggle: true,            
                    onClick: (toggled) => {
                        //TODO Implement
                    },
                    button: true
                },
                {
                    name: "rollstats.ui.controls.delete",
                    icon: 'fas fa-solid fa-trash',
                    title: `Delete Roll Stats`,
                    onClick: () => {
                        ui.notifications.notify("Roll data has been deleted");
                        game.user.unsetFlag('pf2e-roll-stats', 'rolls');
                    },
                    button: true
                }
            ],
            activeTool: 'rollstats.ui.controls.group'
        
        });
    });

    Hooks.on("createChatMessage", async function (msg, status, id) {
        if (!msg.rolls && !game.user.isGM) return;
        const result = generateStat(msg);
        debugLog({ msg, result })
        let all_rolls = game.user.getFlag('pf2e-roll-stats', 'rolls') ?? [];
        all_rolls.push(result)
        game.user.setFlag('pf2e-roll-stats', 'rolls', all_rolls);
    });
});



export function generateStat(msg) {
    let res = {};
    const context = msg?.flags?.pf2e?.context;
    res.dc = context?.dc;
    res.domains = (context?.domains ?? []).concat(context?.options?.filter(o => o.startsWith('action:')) ?? [])
    res.tokenId = context?.token;
    res.tokenName = context?.token && canvas.tokens.get(context?.token)?.name;
    res.tokenImg = context?.token && canvas.tokens.get(context?.token)?.document?.texture?.src;
    res.isReroll = context?.isReroll ?? false;
    res.traits = context?.traits;
    res.actorId = context?.actor;
    res.actorName = context?.actor && game.actors.get(context?.actor)?.name;
    res.actorImg = context?.actor && game.actors.get(context?.actor)?.img;
    res.type = context?.type;
    res.outcome = context?.outcome;
    res.secret = context?.secret || context?.rollMode === 'gmroll';
    res.rollMode = context?.rollMode;
    res.user = msg?.user?.id;
    res.timestamp = msg.timestamp;
    res.targetActors = msg?.flags?.["pf2e-target-damage"] ? msg?.flags?.["pf2e-target-damage"]?.targets?.map(t => t.uuid) : [context?.target?.actor];
    res.targetActorNames = msg?.flags?.["pf2e-target-damage"] ? msg?.flags?.["pf2e-target-damage"]?.targets?.map(t => t.actorUuid.split('.')[0]) : [context?.target?.actor && game.actors.get(context?.target?.actor)?.name];
    res.targetTokens = msg?.flags?.["pf2e-target-damage"] ? msg?.flags?.["pf2e-target-damage"]?.targets?.map(t => game.actors.get(t.actorUuid.split('.')[0]).name) : [context?.target?.token];
    res.targetTokenNames = msg?.flags?.["pf2e-target-damage"] ? msg?.flags?.["pf2e-target-damage"]?.targets?.map(t => canvas.token.get(t.id)) : [context?.target?.token && canvas.tokens.get(context?.target?.token)?.name];

    res.rolls = msg?.rolls.map(roll => {
        let result = {
            total: roll.total,
            dice: roll.dice.map(die => (
                die.results.map(
                    r => (
                        {
                            type: die.faces,
                            flavor: die.flavor,
                            total: r.result
                        }
                    )
                )
            )
            )
        }
        return result;
    })
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
    if (game.settings.get("pf2e-roll-stats", 'debug-mode'))
        console.log(`PF2E-Roll-Stats.${context}:`, data);
}

export function exportRollsAsJSON(rolls, name) {
    saveDataToFile(JSON.stringify(rolls), "json", `${name}.json`);
}
