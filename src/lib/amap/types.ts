import type { Coordinates } from '../content/schema';
export type AmapPoi={id:string;name:string;address:string;district:string;type:string;coordinates:Coordinates;telephone:string;openingHours:string;provider:'Google';fetchedAt:string};
export type AmapWalk={distanceMetres:number;durationSeconds:number|null;steps:{instruction:string;distanceMetres:number}[];coordinates:Coordinates[];provider:'Google';fetchedAt:string;origin:AmapPoi;destination:AmapPoi};
