import type { Timestamps } from "./timestamp.type";

export interface Location extends Timestamps {
    id: string;
    divisionId: string;
    name: string;
    description: string | null;
}
