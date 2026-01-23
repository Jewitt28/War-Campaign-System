// src/nations/types.ts
import type { BaseFactionKey } from "../store/useCampaignStore";

export interface NationDefinition {
  id: string;
  name: string;
  defaultFaction?: BaseFactionKey;
  homelandTerritories: string[];
  notes?: string;
}
