import type {
  SyntheticHostService,
  SyntheticHostState,
} from "./syntheticHost";

import {
  buildSyntheticHostRelationshipGraph,
  syntheticHostObjectRefKey,
} from "./syntheticHostRelationship";

import type {
  SyntheticHostAuthoredRelationship,
  SyntheticHostObjectRef,
  SyntheticHostResolvedRelationship,
} from "./syntheticHostRelationship";

export interface SyntheticHostServiceInvestigation {
  service: SyntheticHostService;
  processIds: readonly number[];
  configurationKeys: readonly string[];
  executable: string;
  relationships:
    readonly SyntheticHostResolvedRelationship[];
  relatedRefs:
    readonly SyntheticHostObjectRef[];
}

function uniqueStrings(
  values: readonly string[],
): readonly string[] {
  return [...new Set(values)];
}

function uniqueRefs(
  refs: readonly SyntheticHostObjectRef[],
): readonly SyntheticHostObjectRef[] {
  const seen = new Set<string>();
  const result: SyntheticHostObjectRef[] = [];

  for (const ref of refs) {
    const key = syntheticHostObjectRefKey(ref);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ ...ref });
  }

  return result;
}

export function getSyntheticHostServiceInvestigation(
  host: SyntheticHostState,
  relationships:
    readonly SyntheticHostAuthoredRelationship[],
  serviceName: string,
): SyntheticHostServiceInvestigation {
  const service = host.services.find(
    (candidate) => candidate.name === serviceName,
  );

  if (!service) {
    throw new Error(
      `Synthetic host service not found: ${serviceName}`,
    );
  }

  const serviceRef: SyntheticHostObjectRef = {
    kind: "service",
    id: service.name,
  };
  const relevant =
    buildSyntheticHostRelationshipGraph(
      host,
      relationships,
    ).filter(
      (relationship) =>
        syntheticHostObjectRefKey(
          relationship.source,
        ) === syntheticHostObjectRefKey(
          serviceRef,
        ) ||
        syntheticHostObjectRefKey(
          relationship.target,
        ) === syntheticHostObjectRefKey(
          serviceRef,
        ),
    );
  const processIds = relevant.flatMap(
    (relationship) =>
      relationship.type === "service_process"
        ? [Number(relationship.target.id)]
        : [],
  );
  const configurationKeys = relevant.flatMap(
    (relationship) =>
      relationship.type === "service_configuration"
        ? [relationship.target.id]
        : [],
  );

  return {
    service: structuredClone(service),
    processIds: [
      ...new Set(processIds),
    ],
    configurationKeys:
      uniqueStrings(configurationKeys),
    executable: service.executable,
    relationships:
      structuredClone(relevant),
    relatedRefs: uniqueRefs([
      serviceRef,
      ...relevant.flatMap(
        (relationship) => [
          relationship.source,
          relationship.target,
        ],
      ),
    ]),
  };
}
