import type { Metadata } from "next";
import DriveCollectionPage from "../DriveCollectionPage.tsx";

export const metadata: Metadata = { title: "Great Drives of China | Travorien", description: "Five curated self-drive journeys across Yunnan, Western Sichuan, Guangxi, Hainan and Xinjiang." };
export default function RoadTripsPage() { return <DriveCollectionPage />; }
