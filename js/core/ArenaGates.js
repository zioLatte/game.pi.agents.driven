// Shared, read-only gate geometry for arena rendering and onion spawning.

export function resolveArenaGates(arena) {
  if (!arena?.points?.length) return [];
  const gates = [];
  const points = arena.points;

  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const wallLength = Math.hypot(dx, dy);
    if (wallLength < 48) continue;

    const normal = arena.normals?.[i] || { x: 0, y: 1 };
    const tangentX = dx / wallLength;
    const tangentY = dy / wallLength;
    gates.push({
      x: (p1.x + p2.x) * 0.5,
      y: (p1.y + p2.y) * 0.5,
      length: Math.min(92, Math.max(54, wallLength * 0.22)),
      wallLength,
      angle: Math.atan2(dy, dx),
      tangentX,
      tangentY,
      normalX: normal.x,
      normalY: normal.y,
      p1,
      p2
    });
  }

  return gates;
}

export function resolveGateSpawn(arena, radius = 0, spawnIndex = 0, rng = Math.random) {
  const gates = resolveArenaGates(arena);
  if (!gates.length) return null;

  const safeRadius = Math.max(0, Number(radius) || 0);
  const safeIndex = Math.max(0, Math.floor(Number(spawnIndex) || 0));
  const gate = gates[safeIndex % gates.length];
  const roll = typeof rng === "function" ? Number(rng()) : Math.random();
  const jitterRoll = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5;
  const tangentRoom = Math.max(0, gate.length * 0.5 - safeRadius - 2);
  const tangentOffset = (jitterRoll * 2 - 1) * tangentRoom;
  const inwardOffset = safeRadius + 8;

  return {
    x: gate.x + gate.normalX * inwardOffset + gate.tangentX * tangentOffset,
    y: gate.y + gate.normalY * inwardOffset + gate.tangentY * tangentOffset,
    gate
  };
}
