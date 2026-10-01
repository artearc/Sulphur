// Global event bus. Every gameplay event of narrative or sensory weight is emitted here,
// so audio, VFX, camera and UI can react without the gameplay code knowing about them.
//
// Canonical events (audio hooks):
//   attack:light, attack:heavy, attack:special, hit, hit:heavy, dash, enemy:death,
//   pickup, moral:choice, moral:absolve, moral:condemn, boss:appear, boss:phase,
//   boss:death, player:hurt, player:lowhp, player:death, victory, dialogue:line,
//   dialogue:open, dialogue:close, room:enter, room:clear, door:open, ui:click, ui:hover

const listeners = new Map();

export const Events = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  },
  off(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  emit(type, payload) {
    const set = listeners.get(type);
    if (set) for (const fn of [...set]) fn(payload);
    const any = listeners.get('*');
    if (any) for (const fn of [...any]) fn(type, payload);
  },
};
