import {
  DEMO_LAB_PRESET_REGISTRY,
  type DemoLabPresetRegistryItem,
  getDemoLabPresetById,
} from './demoLabPresetRegistry';

export type DemoLabExamplePreset = DemoLabPresetRegistryItem;

export const DEMO_LAB_EXAMPLE_PRESETS: DemoLabExamplePreset[] = DEMO_LAB_PRESET_REGISTRY.filter(
  (preset) => preset.kind === 'example',
);

export function getDemoLabExamplePreset(id: string): DemoLabExamplePreset | undefined {
  const preset = getDemoLabPresetById(id);
  return preset?.kind === 'example' ? preset : undefined;
}
