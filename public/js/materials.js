// Shared looks for 3D materials, on top of the plain ones each page makes.
import * as THREE from 'three';

// Living things are wet. A thin, shiny coat over the color underneath gives
// cells and organs a crisp highlight, the way a wet pebble shines.
export const WET = { clearcoat: 0.7, clearcoatRoughness: 0.25 };
export const wet = (params = {}) => new THREE.MeshPhysicalMaterial({ ...WET, ...params });
