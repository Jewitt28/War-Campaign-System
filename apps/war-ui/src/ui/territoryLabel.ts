type TerritoryNameLookup = Record<string, string | undefined>;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const formatTerritoryLabel = (
  territoryId: string | null | undefined,
  territoryNameById: TerritoryNameLookup,
) => {
  if (!territoryId) return "—";
  const name = territoryNameById[territoryId];
  return name ? `${territoryId} - ${name}` : territoryId;
};

export const formatTerritoryList = (
  territoryIds: string[],
  territoryNameById: TerritoryNameLookup,
) =>
  territoryIds
    .map((territoryId) => formatTerritoryLabel(territoryId, territoryNameById))
    .join(", ");

export const formatTerritoryText = (
  text: string,
  territoryNameById: TerritoryNameLookup,
) => {
  if (!text) return text;
  let result = text;
  for (const [territoryId, name] of Object.entries(territoryNameById)) {
    if (!name) continue;
    const label = `${territoryId} - ${name}`;
    result = result.replace(
      new RegExp(`\\b${escapeRegExp(territoryId)}\\b`, "g"),
      label,
    );
  }
  return result;
};
