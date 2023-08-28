// import {generateDamageScroll, extractDamageInfoCombined, getTargetList} from './utility.js'
// HOOKS STUFF
Hooks.on("ready", async () => {
    console.error("PF2e RPG Numbers is ready");
    ui.notifications.notify("PF2e RPG Numbers is ready")
    //game.RPGNumbers = new RPGNumbers();
})

Hooks.on("createChatMessage", async function (msg, status, id) {
    const result = generateStat(msg);
    debugLog({ msg, result })
})

export function generateStat(msg) {
    let res = {};
    const context = msg?.flags?.pf2e?.context;
    res.dc = context.dc;
    res.domains = (context?.domains ?? []).concat(context?.options?.filter(o => o.startsWith('action:')) ?? [])
    res.isReroll = context?.isReroll;
    res.traits = context?.traits.map(t => t.name);
    res.actor = context.actor;
    res.type = context.type;
    res.outcome = context.outcome;
    res.rolls = msg.rolls.map(roll => {
        result = {
            total: roll.total,
            dice: roll.dice.map(die => (
                {
                    type: die.faces,
                    flavor: die.flavor,
                    total: die.total
                })
            )
        }
        return result;
    })
    return res;
}

export function extractTerm(term, flavor = '') {
    let result = [];
    switch (term.constructor.name) {
        case 'InstancePool':
            for (const roll of term.rolls) {
                result = result.concat(extractTerm(roll, term.flavor || flavor));
            }
            break;
        case 'DamageInstance':
            for (const item of term.terms) {
                result = result.concat(extractTerm(item, term.types || flavor));
            }
            const keepPersistent = !!term.options.evaluatePersistent;
            result = result
                .filter(res => res.type.startsWith('persistent,') ? keepPersistent : true)
                .map(r => ({ value: r.value, type: r.type.replace(/persistent,/g, '') }))
            break;
        case 'Grouping':
            result = result.concat(extractTerm(term.term, term.flavor || flavor));
            break;
        case 'ArithmeticExpression':
            switch (term.operator) {
                case '+':
                    for (const op of term.operands) {
                        result = result.concat(extractTerm(op, term.flavor || flavor));
                    }
                    break;
                case '-':
                    result = result.concat(extractTerm(term.operands[0], term.flavor || flavor));
                    result = result.concat(extractTerm(term.operands[1], term.flavor || flavor)).map(t => { return { value: -t.value, type: t.type } });
                case '*':
                    if (['NumericTerm', 'Die'].includes(term.operands[0].constructor.name)) {
                        result = result.concat(extractTerm(term.operands[1], term.flavor || flavor).flatMap(i => [i, i]));
                    } else if (['NumericTerm', 'Die'].includes(term.operands[1].constructor.name)) {
                        result = result.concat(extractTerm(term.operands[0], term.flavor || flavor).flatMap(i => [i, i]));
                    } else {
                        result.push({ value: term.total, type: term.flavor || flavor })
                    }
                    break;
                default:
                    break;
            }
            break;
        case 'Die':
            for (const dice of term.results) {
                result.push({ value: dice.result, type: term.flavor || flavor })
            }
            break;
        case 'NumericTerm':
            result.push({ value: term.number, type: term.flavor || flavor })
            break;

        default:
            console.error("Unrecognized Term when extracting parts", term)
            result.push({ value: term.total, type: term.flavor || flavor })
            break;
    }
    debugLog({ type: term.constructor.name, result }, 'extractTerm')

    return result;
}

export function debugLog(data, context = "") {
    if (game.settings.get("pf2e-roll-stats", 'debug-mode'))
        console.log(`PF2E-Roll-Stats.${context}:`, data);
}
