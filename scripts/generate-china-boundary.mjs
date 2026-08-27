import { readFile, writeFile } from "node:fs/promises";

const inputPath = new URL("./ne_10m_admin_0_countries_chn.geojson", import.meta.url);
const outputPath = new URL("../app/data/china-boundary-path.ts", import.meta.url);
const data = JSON.parse(await readFile(inputPath, "utf8"));
const feature = data.features.find((candidate) => candidate.properties?.ADMIN === "China");
if (!feature || feature.geometry.type !== "MultiPolygon") throw new Error("Natural Earth China MultiPolygon was not found.");

const bounds = { minLongitude: 72.5, maxLongitude: 136.5, minLatitude: 17.5, maxLatitude: 54.5 };
const radians = (degrees) => degrees * Math.PI / 180;
const mercatorY = (latitude) => Math.log(Math.tan(Math.PI / 4 + radians(latitude) / 2));
const minX = radians(bounds.minLongitude);
const maxX = radians(bounds.maxLongitude);
const minY = mercatorY(bounds.minLatitude);
const maxY = mercatorY(bounds.maxLatitude);
const width = 1000;
const scale = width / (maxX - minX);
const height = Number(((maxY - minY) * scale).toFixed(2));
const project = ([longitude, latitude]) => [
  (radians(longitude) - minX) * scale,
  (maxY - mercatorY(latitude)) * scale,
];

const pointSegmentDistance = (point, start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
};

const simplify = (points, tolerance = 0.62) => {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let furthest = tolerance;
    let index = -1;
    for (let cursor = start + 1; cursor < end; cursor++) {
      const distance = pointSegmentDistance(points[cursor], points[start], points[end]);
      if (distance > furthest) { furthest = distance; index = cursor; }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, index) => keep[index]);
};

const polygons = feature.geometry.coordinates.filter((polygon) => {
  const outer = polygon[0];
  const north = Math.max(...outer.map((point) => point[1]));
  const south = Math.min(...outer.map((point) => point[1]));
  const west = Math.min(...outer.map((point) => point[0]));
  const east = Math.max(...outer.map((point) => point[0]));
  return north >= bounds.minLatitude && south <= bounds.maxLatitude && east >= bounds.minLongitude && west <= bounds.maxLongitude;
});

const path = polygons.flatMap((polygon) => polygon.map((ring) => {
  const projected = simplify(ring.map(project));
  if (projected.length < 3) return "";
  return `${projected.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z`;
})).join("");

const source = `/**
 * Generated from Natural Earth 1:10m Admin 0 Countries (China POV), version 5.1.1.
 * Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/
 * Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries_chn.geojson
 * Projection: Web Mercator, cropped to the China prototype viewport. Geometry simplified to 0.62 SVG pixels.
 */
export const CHINA_BOUNDARY_SOURCE = {
  name: "Natural Earth 1:10m Admin 0 Countries — China POV",
  version: "5.1.1",
  license: "Public domain",
  url: "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries_chn.geojson",
} as const;

export const CHINA_MAP_BOUNDS = ${JSON.stringify(bounds)} as const;
export const CHINA_MAP_VIEWBOX = { width: ${width}, height: ${height} } as const;
export const CHINA_BOUNDARY_PATH = ${JSON.stringify(path)};
`;

await writeFile(outputPath, source);
console.log(`Generated ${outputPath.pathname} with ${polygons.length} polygons and ${path.length} path characters.`);
