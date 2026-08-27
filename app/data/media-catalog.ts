import type { DestinationMedia, HotelMedia, VehicleMedia } from "../domain.ts";
import { hotels } from "./mock-data.ts";

const demo = "demo-mock" as const;
const commonsImage = (fileName: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1800`;
const commonsSource = (fileName: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${fileName}`)}`;

const destination = (
  destinationId: string,
  fileName: string,
  author: string,
  licenseNote: string,
  alt: string,
): DestinationMedia => ({
  destinationId,
  imageUrl: commonsImage(fileName),
  heroImage: commonsImage(fileName),
  cardImage: commonsImage(fileName),
  gallery: [commonsImage(fileName)],
  source: "Wikimedia Commons",
  sourceType: "public-source",
  sourceUrl: commonsSource(fileName),
  sourceName: "Wikimedia Commons",
  author,
  licenseNote,
  alt,
  provenance: demo,
});

export const destinationMedia: DestinationMedia[] = [
  destination("kunming", "Green Lake Park, Kunming, China - DSC01875.JPG", "Daderot", "Public domain", "Lakeside pavilion and trees at Green Lake Park in Kunming"),
  destination("chuxiong", "20130522云南G320国道禄丰至楚雄道边河谷1 - panoramio.jpg", "fish4fish", "CC BY-SA 3.0", "Green river valley beside the G320 road approaching Chuxiong in Yunnan"),
  destination("dali", "1 dali old town yunnan 2012.jpg", "Chensiyuan", "CC BY-SA 4.0 and GFDL", "Stone street and traditional buildings in Dali Old Town"),
  destination("shaxi", "Shaxi Town, Yunnan (52374101155).jpg", "Rod Waddington", "CC BY-SA 2.0", "Traditional courtyard architecture in Shaxi, Yunnan"),
  destination("lijiang", "1 lijiang old town night.jpg", "Chensiyuan", "CC BY-SA and GFDL as listed on source", "Lantern-lit roofs in Lijiang Old Town at night"),
  destination("tiger-gorge", "Tiger Leaping Gorge (6170291174).jpg", "David Stanley", "CC BY 2.0", "Steep mountains framing Tiger Leaping Gorge in Yunnan"),
  destination("shangri-la", "Zhongdian, Jietang Songlin monastery or Ganden Sumtseling monastery (6169743395).jpg", "David Stanley", "CC BY 2.0", "Songzanlin monastery above the Shangri-La highlands"),
  destination("baishuitai", "Baishuitai, Yunnan, China.jpg", "Ariel Steiner", "CC BY 2.5 / CC BY-SA 3.0", "White mineral terraces at Bai Shui Tai in Yunnan"),
  destination("weishan", "Weishan Yunnan.png", "Sumin Chou", "CC BY-SA 4.0", "Historic street and gate in Weishan Old Town"),
];

const vehicle = (
  vehicleId: string,
  fileName: string,
  author: string,
  licenseNote: string,
  alt: string,
): VehicleMedia => ({
  vehicleId,
  imageUrl: commonsImage(fileName),
  primaryImage: commonsImage(fileName),
  gallery: [commonsImage(fileName)],
  source: "Wikimedia Commons",
  sourceType: "public-source",
  sourceUrl: commonsSource(fileName),
  sourceName: "Wikimedia Commons",
  author,
  licenseNote,
  alt,
  provenance: demo,
});

export const vehicleMedia: VehicleMedia[] = [
  vehicle("vehicle-haval-h6", "2018 Great-Wall Haval H6, front 8.3.18.jpg", "Kevauto", "CC BY-SA 4.0", "White Haval H6 viewed from the front"),
  vehicle("vehicle-vw-tayron", "2023 FAW-Volkswagen Tayron 300TSI (facelift, front).jpg", "User3204", "CC BY-SA 4.0", "White Volkswagen Tayron photographed in China"),
  vehicle("vehicle-toyota-rav4", "Toyota RAV4 (5th Gen.) front look.jpg", "Wh.0414.justin", "CC BY-SA 4.0", "Grey fifth-generation Toyota RAV4 viewed from the front"),
  vehicle("vehicle-byd-song", "2022 BYD Song Plus DM-i, front 8.3.23.jpg", "Kevauto", "CC BY-SA 4.0", "White BYD Song Plus DM-i photographed in China"),
  vehicle("vehicle-vw-golf", "2020 Volkswagen Golf Style 1.5 Front.jpg", "Vauxford", "CC BY-SA 4.0", "Volkswagen Golf compact hatchback viewed from the front"),
  vehicle("vehicle-toyota-corolla", "TOYOTA COROLLA SEDAN (E210) China (7).jpg", "Dinkun Chen", "CC BY-SA 4.0", "White Toyota Corolla sedan photographed in China"),
  vehicle("vehicle-volvo-xc40", "Volvo-XC40-front.jpg", "Jan Ainali", "CC BY-SA 4.0", "Volvo XC40 viewed from the front"),
  vehicle("vehicle-toyota-camry", "2018 GAC-Toyota Camry (front).jpg", "User3204", "CC BY-SA 4.0", "Toyota Camry sedan photographed in China"),
  vehicle("vehicle-tank300", "Tank 300.jpg", "Jengtingchen", "CC BY-SA 4.0", "Grey Tank 300 SUV viewed from the front"),
  vehicle("vehicle-buick-gl8", "Buick GL8.jpg", "Rutger van der Maar", "CC BY 2.0", "Buick GL8 multi-purpose vehicle"),
];

const hotelStylePool = [
  ["Yunnan courtyard (49117833797).jpg", "madras91", "CC BY 2.0", "Late-19th-century Yunnan courtyard architecture"],
  ["Mu Mansion small inner courtyard 2.JPG", "BrokenSphere", "CC BY-SA license listed on source", "Small traditional courtyard at Mu Mansion in Lijiang"],
  ["Inside a Tibetan Home.jpg", "Stephen Anthony Rohan", "CC BY-SA 4.0", "Warm timber interior of a Tibetan home in China"],
  ["Tibetan House in Shigatse.jpg", "钉钉", "CC BY-SA 4.0", "Exterior of a traditional Tibetan house in Shigatse"],
  ["Pictures-of-typical-Tibetan-ancient-timber-structure.jpg", "Juan Wang, Junxiao He, Na Yang and Qingshan Yang", "CC BY 4.0", "Interior timber structure of a traditional Tibetan building"],
] as const;

export const hotelMedia: HotelMedia[] = hotels.map((hotel, index) => {
  const [fileName, author, licenseNote, description] = hotelStylePool[index % hotelStylePool.length];
  return {
    hotelId: hotel.id,
    primaryImage: commonsImage(fileName),
    sourceUrl: commonsSource(fileName),
    sourceName: "Wikimedia Commons",
    sourceType: "public-source",
    author,
    licenseNote,
    alt: `Style reference, not the actual property: ${description}`,
    imageKind: "style-reference-not-property",
    provenance: demo,
  };
});

export const destinationMediaFor = (destinationId: string) => destinationMedia.find((item) => item.destinationId === destinationId);
export const vehicleMediaFor = (vehicleId: string) => vehicleMedia.find((item) => item.vehicleId === vehicleId);
export const hotelMediaFor = (hotelId: string) => hotelMedia.find((item) => item.hotelId === hotelId);
