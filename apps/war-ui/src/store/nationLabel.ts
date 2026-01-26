import type { CustomNation } from "./useCampaignStore";
import { NATION_BY_ID, type BaseNationKey } from "../setup/NationDefinitions";

export function nationLabel(key: string, customNations: CustomNation[]) {
  if (key.startsWith("custom:")) {
    const id = key.slice("custom:".length);
    return (
      customNations.find((n) => n.id === key || n.id === id)?.name ??
      "Custom Nation"
    );
  }

  return NATION_BY_ID[key as BaseNationKey]?.name ?? key;
}
