import { useMemo, useState } from 'react';
import { hasRenderableDemoContent } from './demoLabPreset';
import { type DemoLabPresetRegistryItem, getDemoLabPresetById, getDemoLabPresetOptions } from './demoLabPresetRegistry';

export type { DemoLabPresetRegistryItem } from './demoLabPresetRegistry';

export interface DemoLabPresetLoadState {
  preset: DemoLabPresetRegistryItem;
  sourceLabel: string;
  loadError: string | null;
}

export function createDemoLabPresetLoadState(preset: DemoLabPresetRegistryItem): DemoLabPresetLoadState {
  return {
    preset,
    sourceLabel: `${preset.kind === 'built-in' ? 'Built-in' : 'Example'} preset: ${preset.title}`,
    loadError: hasRenderableDemoContent(preset.content)
      ? null
      : `Demo Lab preset has no renderable XCON content: ${preset.fileName}`,
  };
}

export function useDemoLabPresetRegistry(initialPresetId = getDemoLabPresetOptions()[0]?.id ?? '') {
  const presetOptions = useMemo(() => getDemoLabPresetOptions(), []);
  const [selectedPresetId, setSelectedPresetId] = useState(initialPresetId);
  const selectedPreset = useMemo(
    () => getDemoLabPresetById(selectedPresetId) ?? presetOptions[0],
    [presetOptions, selectedPresetId],
  );

  const loadPreset = (presetId = selectedPresetId): DemoLabPresetLoadState | null => {
    const preset = getDemoLabPresetById(presetId);
    if (!preset) return null;
    setSelectedPresetId(preset.id);
    return createDemoLabPresetLoadState(preset);
  };

  return {
    presetOptions,
    selectedPreset,
    selectedPresetId,
    setSelectedPresetId,
    loadPreset,
  };
}
