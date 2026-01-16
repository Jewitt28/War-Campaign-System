// src/setup/startRegions.ts
import type { BaseFactionKey } from "../store/useCampaignStore";
import type { TheatreId } from "../data/theatres";

// WW2-authentic starting areas (Option 2)
// NOTE: this is intentionally coarse: you pick a homeland TERRITORY from these lists.
export const START_THEATRES_BY_FACTION: Record<BaseFactionKey, TheatreId[]> = {
  allies: ["WE", "NA"],
  axis: ["WE", "NA"],
  ussr: ["EE"],
};

// Specific territory allowlists per faction (your current map IDs)
export const START_TERRITORIES_BY_FACTION: Record<BaseFactionKey, string[]> = {
  // UK/France/Benelux/Ireland/Norway/Denmark + Morocco/Algeria/Tunisia West/Tunis (Allied start)
  allies: [
    // WE
    "WE-01",
    "WE-02",
    "WE-03",
    "WE-04",
    "WE-05",
    "WE-06",
    "WE-07",
    "WE-13",
    "WE-15",
    // NA (western side focus)
    "NA-01",
    "NA-02",
    "NA-03",
    "NA-04",
    "NA-05",
  ],

  // Germany/Italy/Alpine + “Axis Africa” Tripoli->Tobruk line
  axis: [
    // WE
    "WE-08",
    "WE-09",
    "WE-10",
    "WE-11",
    "WE-12",
    // NA (Libya focus)
    "NA-06",
    "NA-07",
    "NA-08",
    "NA-09",
    "NA-10",
    "NA-11",
    "NA-12",
  ],

  // USSR in the East: Poland->Caucasus corridor (Finland/Baltics can be contested later)
  ussr: [
    "EE-03",
    "EE-04",
    "EE-05",
    "EE-06",
    "EE-07",
    "EE-08",
    "EE-09",
    "EE-10",
    "EE-11",
    "EE-12",
    "EE-13",
    "EE-14",
    "EE-15",
  ],
};
