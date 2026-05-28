import {
  createCreatorTerms,
  createRightsMetadata,
  type CreatorTerms,
  type RightsMetadata
} from "../../../lib/domain/rights";

export function buildCompleteIssuanceTerms(
  creatorHandle: string,
  overrides: {
    rightsMetadata?: Partial<RightsMetadata>;
    creatorTerms?: Partial<CreatorTerms>;
  } = {}
): {
  rightsMetadata: RightsMetadata;
  creatorTerms: CreatorTerms;
} {
  const rightsMetadata = {
    ...createRightsMetadata({
      rightsHolderHandle: creatorHandle,
      licenseSummary: "personal collection, proof sharing, and collector vault display"
    }),
    ...overrides.rightsMetadata
  };

  const creatorTerms = {
    ...createCreatorTerms({
      creatorHandle,
      termsSummary: "collector receives proof, access, and creator-defined display rights",
      editionPolicy: "edition count is fixed when the drop is issued"
    }),
    ...overrides.creatorTerms
  };

  return { rightsMetadata, creatorTerms };
}
