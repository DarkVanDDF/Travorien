export type KnowledgeStatus = "VERIFIED" | "DEMO" | "UNKNOWN";

export interface SourceProvenance {
  id: string;
  name: string;
  url: string;
  publisher: string;
  lastVerifiedAt: string;
  status: KnowledgeStatus;
  note: string;
}

export interface KnowledgeClaim<T> {
  id: string;
  value: T;
  status: KnowledgeStatus;
  sourceIds: string[];
  lastVerifiedAt?: string;
  caveat?: string;
}

export interface DriveMedia {
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  author: string;
  licenseNote: string;
  alt: string;
  provenance: "public-source";
}

export interface DriveSuitabilityProfile {
  difficulty: "easy" | "easy-to-moderate" | "moderate" | "challenging";
  altitudeExposure: "low" | "moderate" | "high";
  parkingDifficulty: "easy" | "mixed" | "difficult";
  roadSurface: "mostly-expressway" | "mixed-paved" | "mountain-paved";
  serviceConfidence: "frequent" | "mixed" | "remote-stretches";
  longestDrivingMinutes: number;
}

export interface DriveDay {
  dayNumber: number;
  destination: string;
  distanceKm: number;
  estimatedDrivingMinutes: number;
  title: string;
  roadStory: string;
  stops: string[];
  scenery: string[];
  food: string[];
  parking: string;
  bestDepartureTime: string;
  suggestedStay: string;
  experience: string;
  practicalNotes: string[];
}

export interface DriveVariant {
  id: string;
  name: string;
  days: number;
  description: string;
  stopIds: string[];
  travelerFit: string[];
  executable: boolean;
}

export interface SignatureDrive {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  start: string;
  end: string;
  stops: string[];
  catalogDestinationIds: string[];
  routeBinding?: { destinationIds: string[]; capability: "transaction-ready-demo" };
  recommendedDays: number;
  distanceKm: number;
  estimatedDrivingHours: number;
  bestSeasons: string[];
  drivingDifficulty: DriveSuitabilityProfile["difficulty"];
  suitability: DriveSuitabilityProfile;
  roadCharacteristics: string[];
  recommendedVehicleTypes: string[];
  themes: string[];
  travelerFit: string[];
  heroMedia: DriveMedia;
  gallery: DriveMedia[];
  summary: string;
  story: string;
  dailyJourney: DriveDay[];
  permitNotes: string[];
  parkingNotes: string[];
  fuelNotes: string[];
  chargingNotes: string[];
  navigationNotes: string[];
  roadRiskNotes: string[];
  recommendedHotels: string[];
  recommendedExperiences: string[];
  alternativeVersions: DriveVariant[];
  seoTitle: string;
  seoDescription: string;
  transactionStatus: "transaction-ready-demo" | "content-ready";
  source: SourceProvenance[];
  provenance: "demo-content";
}

export interface GuideSection {
  id: string;
  heading: string;
  body: string[];
  claimIds: string[];
}

export interface Guide {
  id: string;
  slug: string;
  category: "road-trips" | "driving" | "destination" | "inspiration";
  title: string;
  standfirst: string;
  readingMinutes: number;
  sections: GuideSection[];
  relatedDriveIds: string[];
  relatedGuideIds: string[];
  seoTitle: string;
  seoDescription: string;
  heroMedia: DriveMedia;
  sourceIds: string[];
  provenance: "demo-content";
}

export interface DrivingReadinessInput {
  nationality: string;
  licenceCountry: string;
  hasValidForeignLicence: boolean | null;
  arrivalCity: string;
  stayDays: number | null;
}

export type DrivingReadinessStatus = "LIKELY_ELIGIBLE" | "ACTION_REQUIRED" | "NOT_ELIGIBLE" | "NEEDS_INFORMATION" | "UNKNOWN";

export interface DrivingReadinessAssessment {
  status: DrivingReadinessStatus;
  headline: string;
  explanation: string;
  requiredDocuments: Array<KnowledgeClaim<string>>;
  nextSteps: string[];
  unknowns: string[];
  sourceIds: string[];
  assessedAt: string;
  authorityNote: string;
}

export type PlanningSeed =
  | { kind: "blank"; prompt?: string }
  | { kind: "signature-drive"; driveId: string; variantId?: string; prompt?: string }
  | { kind: "readiness"; assessment: DrivingReadinessAssessment; selectedDriveId?: string; variantId?: string; prompt?: string };

export interface AdvisorRecommendation {
  prompt: string;
  answer: string;
  recommendedDriveIds: string[];
  comparedDriveIds: string[];
  knowledgeClaimIdsUsed: string[];
  learnedPreferences: string[];
  nextQuestion: string;
}

export interface RoadTripKnowledgeCatalog {
  version: string;
  snapshotId: string;
  drives: SignatureDrive[];
  guides: Guide[];
  claims: Array<KnowledgeClaim<unknown>>;
  sources: SourceProvenance[];
}
