import type { Timestamps } from "./timestamp.type";

export interface ColdStorage extends Timestamps {
    id: string;
    locationId: string;
    name: string;
    description: string | null;
}
