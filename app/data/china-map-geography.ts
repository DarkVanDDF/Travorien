import { CHINA_MAP_BOUNDS } from "./china-boundary-path.ts";

export interface GeographicCoordinate {
  longitude: number;
  latitude: number;
}

// Publicly documented city-centre coordinates, projected through the same
// fixed Web Mercator viewport as the Natural Earth boundary.
export const chinaCityCoordinates: Record<string, GeographicCoordinate> = {
  beijing: { longitude: 116.4074, latitude: 39.9042 },
  xian: { longitude: 108.9398, latitude: 34.3416 },
  luoyang: { longitude: 112.454, latitude: 34.6197 },
  huashan: { longitude: 110.084, latitude: 34.482 },
  pingyao: { longitude: 112.1763, latitude: 37.189 },
  kaifeng: { longitude: 114.3076, latitude: 34.7973 },
  dunhuang: { longitude: 94.6619, latitude: 40.1421 },
  chengdu: { longitude: 104.0665, latitude: 30.5728 },
  siguniangshan: { longitude: 102.84, latitude: 31.11 },
  kangding: { longitude: 101.957, latitude: 30.05 },
  kunming: { longitude: 102.8329, latitude: 24.8801 },
  dali: { longitude: 100.2676, latitude: 25.6065 },
  shaxi: { longitude: 99.852, latitude: 26.32 },
  lijiang: { longitude: 100.2278, latitude: 26.855 },
  "shangri-la": { longitude: 99.7008, latitude: 27.8297 },
  lhasa: { longitude: 91.1172, latitude: 29.6469 },
  guilin: { longitude: 110.2902, latitude: 25.2736 },
  yangshuo: { longitude: 110.4966, latitude: 24.7785 },
  guangzhou: { longitude: 113.2644, latitude: 23.1291 },
  shenzhen: { longitude: 114.0579, latitude: 22.5431 },
  xiamen: { longitude: 118.0894, latitude: 24.4798 },
  haikou: { longitude: 110.1999, latitude: 20.044 },
  sanya: { longitude: 109.5119, latitude: 18.2528 },
  urumqi: { longitude: 87.6168, latitude: 43.8256 },
};

export const primaryMapLabelIds = new Set(["beijing", "xian", "chengdu", "kunming", "dali", "lijiang", "guilin", "guangzhou", "urumqi"]);

const radians = (degrees: number) => degrees * Math.PI / 180;
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + radians(latitude) / 2));
const minimumMercatorY = mercatorY(CHINA_MAP_BOUNDS.minLatitude);
const maximumMercatorY = mercatorY(CHINA_MAP_BOUNDS.maxLatitude);

export function projectChinaCoordinate(coordinate: GeographicCoordinate) {
  return {
    x: (coordinate.longitude - CHINA_MAP_BOUNDS.minLongitude) / (CHINA_MAP_BOUNDS.maxLongitude - CHINA_MAP_BOUNDS.minLongitude) * 100,
    y: (maximumMercatorY - mercatorY(coordinate.latitude)) / (maximumMercatorY - minimumMercatorY) * 100,
  };
}

export function projectedChinaCity(id: string) {
  const coordinate = chinaCityCoordinates[id];
  return coordinate ? projectChinaCoordinate(coordinate) : null;
}
