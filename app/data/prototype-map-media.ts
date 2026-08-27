export interface PrototypeMapPreviewMedia {
  destinationId: string;
  imageUrl: string;
  alt: string;
  sourceUrl: string;
  author: string;
  licenseNote: string;
  provenance: "demo-mock";
}

const commonsSource = (fileName: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${fileName}`)}`;

export const prototypeMapPreviewMedia: PrototypeMapPreviewMedia[] = [
  {
    destinationId: "xian",
    imageUrl: "/xian-hover.jpg",
    alt: "Xi'an Bell Tower illuminated at night",
    sourceUrl: commonsSource("Xi'an Bell Tower at night.jpg"),
    author: "TarnishedPath",
    licenseNote: "CC BY-SA 4.0",
    provenance: "demo-mock",
  },
];

export const prototypeMapPreviewFor = (destinationId: string) => prototypeMapPreviewMedia.find((item) => item.destinationId === destinationId);
