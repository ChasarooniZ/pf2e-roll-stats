export function getTargetTokens(msg, context = msg?.flags?.pf2e?.context) {
    const tokens = msg?.flags?.["pf2e-target-damage"] ?
        msg?.flags?.["pf2e-target-damage"]?.targets?.map(target => ({
            id: target.id,
            name: canvas.tokens.get(target.id)?.name,
            img: canvas.tokens.get(target.id)?.document?.texture?.src
        })) :
        [
            {
                id: context?.target?.token,
                name: canvas.tokens.get(context?.target?.token)?.name,
                img: canvas.tokens.get(context?.target?.token)?.document?.texture?.src
            }
        ];
    return tokens;

}

export function getTargetActors(msg) {
    const actors = msg?.flags?.["pf2e-target-damage"] ?
        msg?.flags?.["pf2e-target-damage"]?.targets?.map(target => ({
            id: target.actorUuid.split('.')[1],
            name: game.actors.get(target.actorUuid.split('.')[1])?.name,
            img: game.actors.get(target.actorUuid.split('.')[1])?.img
        })) :
        [
            {
                id: context?.target?.actor,
                name: game.actors.get(context?.target?.actor)?.name,
                img: canvas.actors.get(context?.target?.actor)?.document?.texture?.src
            }
        ];
    return actors;
}