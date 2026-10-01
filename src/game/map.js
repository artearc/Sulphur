// Circle map: a layered DAG of 8-12 rooms with branching routes, moral gates and hidden rooms.
//   layer 0: entrance        layers 1..4: random (combat / narrative / altars / shop / elite)
//   layer 5: antechamber (rest or shop)        layer 6: boss
// Optional side branches: minijefe, secret room (hidden door), virtue path, sin rift.

export const ROOM_TYPES = {
  start: { label: 'Umbral', icon: 'gate' },
  combat: { label: 'Combate', icon: 'sword' },
  elite: { label: 'Élite', icon: 'skull' },
  soul: { label: 'Alma condenada', icon: 'soul' },
  altarV: { label: 'Altar de Virtud', icon: 'virtue' },
  altarS: { label: 'Altar de Pecado', icon: 'sin' },
  shop: { label: 'Mercader espectral', icon: 'shop' },
  treasure: { label: 'Relicario', icon: 'relic' },
  rest: { label: 'Fuente de Lete', icon: 'rest' },
  miniboss: { label: 'Minijefe', icon: 'horns' },
  secret: { label: 'Sala secreta', icon: 'secret' },
  boss: { label: 'Guardián del círculo', icon: 'boss' },
};

// combat rewards
export const REWARDS = {
  gold: { label: 'Oro', icon: 'coin' },
  essence: { label: 'Esencias', icon: 'essence' },
  fragment: { label: 'Fragmento de Reliquia', icon: 'fragment' },
  boonV: { label: 'Don de Virtud', icon: 'virtue' },
  boonS: { label: 'Don de Pecado', icon: 'sin' },
  heal: { label: 'Cáliz de vida', icon: 'heal' },
  relic: { label: 'Reliquia', icon: 'relic' },
};

export function generateCircleMap(circle, rng, run) {
  const moral = run.moral;
  const nodes = {};
  let nid = 0;
  const mk = (layer, type, extra = {}) => {
    const id = 'n' + nid++;
    nodes[id] = { id, layer, type, exits: [], reward: null, visited: false, cleared: false, ...extra };
    return nodes[id];
  };
  const layers = [];
  const first = run.circleIndex === 0;
  layers.push([mk(0, 'start', { reward: first ? 'boonV' : rng.pick(['gold', 'essence']) })]);

  // middle layers
  const midCount = 4;
  const narrative = 0.22 * moral.narrativeBias;
  for (let L = 1; L <= midCount; L++) {
    const width = rng.weighted([[2, 5], [3, 4], [1, L === 1 ? 0 : 1]]);
    const row = [];
    for (let k = 0; k < width; k++) {
      let type = rng.weighted([
        ['combat', 6.5], ['soul', narrative * 8 + (L === 2 ? 1 : 0)], ['altarV', 0.6], ['altarS', 0.6],
        ['shop', L === 3 ? 0.8 : 0.15], ['elite', L >= 2 ? 1 + moral.corruption01 * 2 : 0], ['treasure', 0.25],
      ]);
      if (type === 'shop' && row.some((r) => r.type === 'shop')) type = 'combat';
      row.push(mk(L, type));
    }
    // guarantee at least one soul encounter per circle (the circle's named dilemma)
    layers.push(row);
  }
  const all = Object.values(nodes);
  if (!all.some((n) => n.type === 'soul')) {
    const row = layers[2];
    rng.pick(row).type = 'soul';
  }
  if (!all.some((n) => n.type === 'shop') && rng.chance(0.7)) {
    const row = layers[3];
    const n = rng.pick(row);
    if (n.type !== 'soul') n.type = 'shop';
  }
  // antechamber + boss
  layers.push([mk(midCount + 1, rng.chance(0.55) ? 'rest' : 'shop')]);
  layers.push([mk(midCount + 2, 'boss')]);

  // rewards for combat-like nodes
  for (const n of Object.values(nodes)) {
    if (n.reward) continue;
    if (n.type === 'combat') {
      n.reward = rng.weighted([['gold', 3], ['essence', 2.5], ['boonV', 2 + moral.virtue01 * 2], ['boonS', 2 + moral.corruption01 * 2], ['heal', 1.2], ['fragment', 0.6]]);
    } else if (n.type === 'elite') {
      n.reward = rng.weighted([['relic', 3], ['fragment', 2], ['boonS', 1]]);
    }
  }

  // edges: each node links to 1-2 nodes in the next layer; every node gets an incoming edge
  for (let L = 0; L < layers.length - 1; L++) {
    const cur = layers[L], nxt = layers[L + 1];
    for (const n of cur) {
      const k = Math.min(nxt.length, rng.weighted([[1, 2], [2, 3], [3, 1]]));
      const picks = rng.shuffle([...nxt]).slice(0, k);
      for (const p of picks) if (!n.exits.includes(p.id)) n.exits.push(p.id);
    }
    for (const m of nxt) {
      if (!cur.some((n) => n.exits.includes(m.id))) rng.pick(cur).exits.push(m.id);
    }
    // never more than 3 exits from a room
    for (const n of cur) n.exits = n.exits.slice(0, 3);
  }

  // optional branches -----------------------------------------------------------------
  const mids = layers.slice(1, midCount + 1).flat();
  // minijefe: a side path off a middle room, rejoining the next layer
  const mbHost = rng.pick(mids.filter((n) => n.layer <= midCount - 1));
  if (mbHost) {
    const mb = mk(mbHost.layer + 1, 'miniboss', { optional: true, reward: 'relic', miniboss: circle.miniboss });
    mb.layer = mbHost.layer + 0.5;
    mbHost.exits.push(mb.id);
    const rejoin = layers[Math.floor(mbHost.layer) + 1];
    mb.exits = [rng.pick(rejoin).id];
    if (rejoin.length > 1) mb.exits.push(rng.pick(rejoin.filter((r) => r.id !== mb.exits[0])).id);
  }
  // secret room: hidden door (revealed by the Lamp, high corruption, or some relic)
  const secHost = rng.pick(mids);
  if (secHost) {
    const sec = mk(secHost.layer + 0.5, 'secret', { hidden: true, reward: rng.pick(['relic', 'fragment', 'boonV', 'boonS']), secretKind: rng.pick(['corruption', 'lamp', 'virtue']) });
    secHost.exits.push(sec.id);
    sec.exits = [...secHost.exits.filter((x) => x !== sec.id && nodes[x].type !== 'miniboss')].slice(0, 2);
    if (!sec.exits.length) sec.exits = [layers[Math.floor(secHost.layer) + 1][0].id];
  }
  // moral gates: a Virtue Path and a Sin Rift that skip ahead with special rewards
  if (run.circleIndex >= 1) {
    const gHost = rng.pick(layers[1]);
    const target = rng.pick(layers[3]);
    const vg = mk(2.5, 'altarV', { gate: 'virtue', reward: null, label: 'Sendero de Virtud' });
    vg.exits = [target.id];
    gHost.exits.push(vg.id);
    const sHost = rng.pick(layers[2]);
    const st = rng.pick(layers[4] || layers[3]);
    const sg = mk(3.5, 'elite', { gate: 'sin', reward: 'relic', label: 'Grieta del Pecado' });
    sg.exits = [st.id];
    sHost.exits.push(sg.id);
  }
  for (const n of Object.values(nodes)) n.exits = [...new Set(n.exits)].slice(0, 4);

  return { nodes, start: layers[0][0].id, layers: layers.map((l) => l.map((n) => n.id)), circle: circle.id };
}

// Whether a door to `node` is open/visible for this player
export function gateState(node, run, player) {
  if (node.hidden) {
    const st = player?.stats || {};
    const revealed = st.revealSecrets || (node.secretKind === 'corruption' && run.moral.tier <= -1) || (node.secretKind === 'virtue' && run.moral.tier >= 1);
    return revealed ? 'open' : 'hidden';
  }
  if (node.gate === 'virtue') return run.moral.balance >= 25 || player?.stats.openVirtueGates ? 'open' : 'sealed';
  if (node.gate === 'sin') return run.moral.balance <= -25 ? 'open' : 'sealed';
  return 'open';
}
