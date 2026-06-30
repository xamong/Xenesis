import { buildFeatureParityMatrixFromSourceCatalog, summarizeFeatureParityMatrix } from './FeatureParityMatrix.js';
import type { SourceFeatureCatalog } from './SourceFeatureCatalog.js';

export function createParityReportPayload(catalog: SourceFeatureCatalog) {
  const featureParityMatrix = buildFeatureParityMatrixFromSourceCatalog(catalog);
  const sourceFeaturesById = new Map(catalog.items.map((item) => [item.id, item]));
  const parityItemSummary = (item: (typeof featureParityMatrix.items)[number]) => {
    const sourceFeature = sourceFeaturesById.get(item.sourceFeatureId);
    return {
      id: item.id,
      sourceFeatureId: item.sourceFeatureId,
      xenesisFeatureId: item.xenesisFeatureId,
      category: sourceFeature?.category,
      risk: item.risk,
      referencePath: sourceFeature?.referencePath,
    };
  };

  return {
    kind: 'xenesis-parity-report',
    generatedAt: catalog.generatedAt,
    referenceRoot: catalog.referenceRoot,
    analysisPath: catalog.analysisPath,
    summary: catalog.summary,
    unmapped: catalog.items
      .filter((item) => item.status === 'unmapped')
      .map((item) => ({
        id: item.id,
        category: item.category,
        referencePath: item.referencePath,
        observable: item.observable,
      })),
    notParityReady: catalog.items
      .filter(
        (item) =>
          item.source === 'reference-required' &&
          item.parityStatus !== 'parity_ready' &&
          item.status !== 'intentionally_upgraded' &&
          item.status !== 'intentionally_excluded',
      )
      .map((item) => ({
        id: item.id,
        category: item.category,
        parityStatus: item.parityStatus,
        mappedTo: item.mappedTo,
        referencePath: item.referencePath,
        observable: item.observable,
      })),
    featureParity: {
      summary: summarizeFeatureParityMatrix(featureParityMatrix),
      implemented: featureParityMatrix.items.filter((item) => item.status === 'implemented').map(parityItemSummary),
      notStarted: featureParityMatrix.items.filter((item) => item.status === 'not_started').map(parityItemSummary),
    },
  };
}
