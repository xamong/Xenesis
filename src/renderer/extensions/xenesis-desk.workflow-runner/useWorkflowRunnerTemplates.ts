import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { WorkflowTemplateRecord } from '../../../shared/types';
import {
  designerModelToWorkflowText,
  type WorkflowDesignerModel,
  workflowTextToDesignerModel,
} from './workflowDesigner';
import type { WorkflowRunResult } from './workflowEngine';
import { createBuiltinWorkflowTemplates, DEFAULT_FIXTURE, mergeWorkflowTemplates } from './workflowRunnerConstants';
import { inferWorkflowNameFromText } from './workflowRunnerRuntimeUtils';
import type { WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerTemplatesOptions {
  designer: WorkflowDesignerModel;
  workflow: string;
  fixture: string;
  workspaceTab: WorkspaceTab;
  setWorkflow: Dispatch<SetStateAction<string>>;
  setFixture: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<WorkflowRunResult | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setExportStatus: Dispatch<SetStateAction<string>>;
  setWorkflowFileStatus: Dispatch<SetStateAction<string>>;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
}

export function useWorkflowRunnerTemplates({
  designer,
  workflow,
  fixture,
  workspaceTab,
  setWorkflow,
  setFixture,
  setDesigner,
  setSelectedActionId,
  setResult,
  setError,
  setExportStatus,
  setWorkflowFileStatus,
  setWorkspaceTab,
}: UseWorkflowRunnerTemplatesOptions) {
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateRecord[]>(() =>
    createBuiltinWorkflowTemplates(),
  );
  const [templateStatus, setTemplateStatus] = useState('');

  useEffect(() => {
    void loadWorkflowTemplates();
  }, []);

  async function loadWorkflowTemplates() {
    try {
      const userTemplates = await window.workflowTemplatesAPI.list();
      setWorkflowTemplates((prev) => {
        const preservedBuiltins = createBuiltinWorkflowTemplates().map((template) => {
          const previous = prev.find((item) => item.id === template.id && item.source === 'builtin');
          return previous ? { ...template, favorite: previous.favorite, lastUsedAt: previous.lastUsedAt } : template;
        });
        return mergeWorkflowTemplates([...preservedBuiltins, ...userTemplates]);
      });
      setTemplateStatus(
        userTemplates.length ? `Loaded ${userTemplates.length} saved templates` : 'Built-in templates ready',
      );
    } catch (loadError) {
      setWorkflowTemplates(createBuiltinWorkflowTemplates());
      setTemplateStatus(`Template load failed: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
    }
  }

  async function saveCurrentAsTemplate() {
    const source = workspaceTab === 'code' ? workflow : designerModelToWorkflowText(designer);
    if (!source.trim()) {
      setTemplateStatus('Template save failed: workflow is empty');
      return;
    }
    const workflowName = inferWorkflowNameFromText(source, designer.name);
    const now = new Date().toISOString();
    const template: WorkflowTemplateRecord = {
      version: 1,
      id: `user-template-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: workflowName,
      description: 'Saved from Workflow Runner',
      source: 'user',
      workflow: source,
      fixture,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const saveResult = await window.workflowTemplatesAPI.save(template);
      setWorkflowTemplates((prev) =>
        mergeWorkflowTemplates([...prev.filter((item) => item.id !== saveResult.template.id), saveResult.template]),
      );
      setTemplateStatus(`Saved template: ${saveResult.template.name}`);
    } catch (saveError) {
      setTemplateStatus(`Template save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }
  }

  async function applyWorkflowTemplate(templateId: string) {
    const template = workflowTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const nextWorkflow = template.workflow;
    const nextDesigner = workflowTextToDesignerModel(nextWorkflow);
    setWorkflow(nextWorkflow);
    setFixture(template.fixture || JSON.stringify(DEFAULT_FIXTURE, null, 2));
    setDesigner(nextDesigner);
    setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
    setResult(null);
    setError('');
    setExportStatus('');
    setWorkflowFileStatus('');
    setWorkspaceTab('code');

    const usedAt = new Date().toISOString();
    if (template.source === 'user') {
      try {
        const userTemplates = await window.workflowTemplatesAPI.touch(template.id);
        setWorkflowTemplates((prev) =>
          mergeWorkflowTemplates([...prev.filter((item) => item.source === 'builtin'), ...userTemplates]),
        );
      } catch (touchError) {
        setTemplateStatus(
          `Template recent update failed: ${touchError instanceof Error ? touchError.message : String(touchError)}`,
        );
        return;
      }
    } else {
      setWorkflowTemplates((prev) =>
        mergeWorkflowTemplates(prev.map((item) => (item.id === template.id ? { ...item, lastUsedAt: usedAt } : item))),
      );
    }
    setTemplateStatus(`Opened template: ${template.name}`);
  }

  async function toggleWorkflowTemplateFavorite(templateId: string) {
    const template = workflowTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const favorite = !template.favorite;
    if (template.source === 'builtin') {
      setWorkflowTemplates((prev) =>
        mergeWorkflowTemplates(prev.map((item) => (item.id === template.id ? { ...item, favorite } : item))),
      );
      setTemplateStatus(favorite ? `Favorite template: ${template.name}` : `Unfavorite template: ${template.name}`);
      return;
    }
    try {
      const userTemplates = await window.workflowTemplatesAPI.setFavorite(template.id, favorite);
      setWorkflowTemplates((prev) =>
        mergeWorkflowTemplates([...prev.filter((item) => item.source === 'builtin'), ...userTemplates]),
      );
      setTemplateStatus(favorite ? `Favorite template: ${template.name}` : `Unfavorite template: ${template.name}`);
    } catch (favoriteError) {
      setTemplateStatus(
        `Favorite update failed: ${favoriteError instanceof Error ? favoriteError.message : String(favoriteError)}`,
      );
    }
  }

  async function deleteWorkflowTemplate(templateId: string) {
    const template = workflowTemplates.find((item) => item.id === templateId);
    if (!template || template.source !== 'user') return;
    try {
      const userTemplates = await window.workflowTemplatesAPI.remove(template.id);
      setWorkflowTemplates((prev) =>
        mergeWorkflowTemplates([...prev.filter((item) => item.source === 'builtin'), ...userTemplates]),
      );
      setTemplateStatus(`Deleted template: ${template.name}`);
    } catch (deleteError) {
      setTemplateStatus(
        `Template delete failed: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
      );
    }
  }

  return {
    workflowTemplates,
    templateStatus,
    saveCurrentAsTemplate,
    applyWorkflowTemplate,
    toggleWorkflowTemplateFavorite,
    deleteWorkflowTemplate,
  };
}
