export const TERRAIN_REGISTRY = Object.freeze({
  cemetery: { tint: '#14201b', road: '#504950', roadEdge: '#8a7180', fog: '#9bb6ad', ember: '#c06c38' },
  forest: { tint: '#102019', road: '#484a45', roadEdge: '#657b6c', fog: '#789f8d', ember: '#a95535' },
  village: { tint: '#201711', road: '#51453f', roadEdge: '#8a6954', fog: '#9c8c7c', ember: '#dc7540' },
  default: { tint: '#15131b', road: '#47444e', roadEdge: '#75677d', fog: '#8e91a9', ember: '#bb5c43' }
});

export function terrainFor(mapId) { return TERRAIN_REGISTRY[mapId] || TERRAIN_REGISTRY.default; }
