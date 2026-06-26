import React from 'react';
import type { GowooriBenchmarkProviderOption } from '../gowooriChatQualityState';

interface GowooriQualityActionsProps {
  qualityLogLength: number;
  benchmarkProviderCount: number;
  benchmarkProviderOptions: GowooriBenchmarkProviderOption[];
  hasBenchmarkBaseline: boolean;
  isGenerating: boolean;
  isBenchmarking: boolean;
  qualityImportInputRef: React.RefObject<HTMLInputElement | null>;
  matrixReportImportInputRef: React.RefObject<HTMLInputElement | null>;
  qualityReportPackageInputRef: React.RefObject<HTMLInputElement | null>;
  benchmarkBaselineInputRef: React.RefObject<HTMLInputElement | null>;
  onExportQualityLog: () => void | Promise<void>;
  onImportQualityLog: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onImportMatrixReport: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onImportQualityReportPackage: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onClearQualityLog: () => void;
  onRunProviderAcceptanceBenchmark: () => void | Promise<void>;
  onToggleBenchmarkProvider: (provider: string) => void;
  onSelectAllBenchmarkProviders: () => void;
  onSelectActiveBenchmarkProvider: () => void;
  onExportBenchmarkJson: () => void | Promise<void>;
  onExportBenchmarkCsv: () => void | Promise<void>;
  onImportBenchmarkBaseline: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onClearBenchmarkBaseline: () => void;
}

export function GowooriQualityActions({
  qualityLogLength,
  benchmarkProviderCount,
  benchmarkProviderOptions,
  hasBenchmarkBaseline,
  isGenerating,
  isBenchmarking,
  qualityImportInputRef,
  matrixReportImportInputRef,
  qualityReportPackageInputRef,
  benchmarkBaselineInputRef,
  onExportQualityLog,
  onImportQualityLog,
  onImportMatrixReport,
  onImportQualityReportPackage,
  onClearQualityLog,
  onRunProviderAcceptanceBenchmark,
  onToggleBenchmarkProvider,
  onSelectAllBenchmarkProviders,
  onSelectActiveBenchmarkProvider,
  onExportBenchmarkJson,
  onExportBenchmarkCsv,
  onImportBenchmarkBaseline,
  onClearBenchmarkBaseline,
}: GowooriQualityActionsProps) {
  const selectedBenchmarkProviderCount = benchmarkProviderOptions.filter((item) => item.selected).length;

  return (
    <div className="wfr-gowoori-chat__quality-actions">
      <div className="wfr-gowoori-chat__quality-actions-row">
        <button type="button" onClick={() => void onExportQualityLog()} disabled={qualityLogLength === 0}>
          Export JSON
        </button>
        <button type="button" onClick={() => qualityImportInputRef.current?.click()}>
          Import JSON
        </button>
        <button type="button" onClick={() => matrixReportImportInputRef.current?.click()}>
          Import matrix report
        </button>
        <button type="button" onClick={() => qualityReportPackageInputRef.current?.click()}>
          Import report package
        </button>
        <button type="button" onClick={onClearQualityLog} disabled={qualityLogLength === 0}>
          Clear log
        </button>
      </div>
      <section className="wfr-gowoori-chat__benchmark-provider-picker" aria-label="Benchmark providers">
        <header>
          <strong>Benchmark providers</strong>
          <span>
            {selectedBenchmarkProviderCount}/{benchmarkProviderOptions.length} selected
          </span>
        </header>
        <div className="wfr-gowoori-chat__benchmark-provider-list">
          {benchmarkProviderOptions.map((option) => (
            <label key={option.id} className={option.active ? 'is-active' : ''}>
              <input
                type="checkbox"
                checked={option.selected}
                onChange={() => onToggleBenchmarkProvider(option.id)}
                disabled={isGenerating || isBenchmarking}
              />
              <span>{option.label}</span>
              {option.active && <em>active</em>}
            </label>
          ))}
        </div>
        <div className="wfr-gowoori-chat__benchmark-provider-actions">
          <button type="button" onClick={onSelectAllBenchmarkProviders} disabled={isGenerating || isBenchmarking}>
            Select all
          </button>
          <button type="button" onClick={onSelectActiveBenchmarkProvider} disabled={isGenerating || isBenchmarking}>
            Active only
          </button>
          <button
            type="button"
            onClick={() => void onRunProviderAcceptanceBenchmark()}
            disabled={isGenerating || isBenchmarking || selectedBenchmarkProviderCount === 0}
            title="Run acceptance benchmark for selected providers"
          >
            {isBenchmarking ? 'Benchmarking...' : 'Run selected benchmark'}
          </button>
        </div>
      </section>
      <div className="wfr-gowoori-chat__quality-actions-row">
        <button type="button" onClick={() => void onExportBenchmarkJson()} disabled={benchmarkProviderCount === 0}>
          Export benchmark JSON
        </button>
        <button type="button" onClick={() => void onExportBenchmarkCsv()} disabled={benchmarkProviderCount === 0}>
          Export benchmark CSV
        </button>
        <button type="button" onClick={() => benchmarkBaselineInputRef.current?.click()}>
          Import benchmark baseline
        </button>
        <button type="button" onClick={onClearBenchmarkBaseline} disabled={!hasBenchmarkBaseline}>
          Clear baseline
        </button>
      </div>
      <input
        ref={qualityImportInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void onImportQualityLog(event)}
      />
      <input
        ref={matrixReportImportInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void onImportMatrixReport(event)}
      />
      <input
        ref={qualityReportPackageInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void onImportQualityReportPackage(event)}
      />
      <input
        ref={benchmarkBaselineInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void onImportBenchmarkBaseline(event)}
      />
    </div>
  );
}
