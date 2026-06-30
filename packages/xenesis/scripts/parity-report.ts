#!/usr/bin/env tsx
import {
  assertNoUnmappedSourceFeatures,
  assertSourceFeaturesParityReady,
  buildSourceFeatureCatalog,
  createParityReportPayload,
} from '../src/evaluation/parity/index.js';

function hasFlag(name: string) {
  return process.argv.includes(name);
}

const referenceRoot = process.env.XENESIS_REFERENCE_SRC ?? 'reference-src';
const analysisPath = process.env.XENESIS_REFERENCE_ANALYSIS ?? 'reference-analysis/agent-internals-analysis.md';
const allowUnmapped = hasFlag('--allow-unmapped');
const allowUnverified = allowUnmapped || hasFlag('--allow-unverified');
const strictVerified = hasFlag('--strict-verified') || hasFlag('--fail-unverified');

const catalog = buildSourceFeatureCatalog({
  referenceRoot,
  analysisPath,
});

console.log(JSON.stringify(createParityReportPayload(catalog), null, 2));

if (!allowUnmapped) {
  assertNoUnmappedSourceFeatures(catalog);
}
if (strictVerified && !allowUnverified) {
  assertSourceFeaturesParityReady(catalog);
}
