import type { WorkflowTemplateRecord } from '../../../shared/types';
import { type WorkflowDesignerModel } from './workflowDesigner';

export function DesignerMeta({
  model,
  onChange,
}: {
  model: WorkflowDesignerModel;
  onChange: (patch: Partial<WorkflowDesignerModel>) => void;
}) {
  return (
    <section className="wfr-meta">
      <div className="wfr-meta-row">
        <label>
          <span>Name</span>
          <input value={model.name} onChange={(event) => onChange({ name: event.currentTarget.value })} />
        </label>
        <label>
          <span>Version</span>
          <input value={model.version} onChange={(event) => onChange({ version: event.currentTarget.value })} />
        </label>
      </div>
      <div className="wfr-meta-row">
        <label>
          <span>Controller</span>
          <input value={model.controller} onChange={(event) => onChange({ controller: event.currentTarget.value })} />
        </label>
        <label>
          <span>Mode</span>
          <select
            value={model.runMode}
            onChange={(event) => onChange({ runMode: event.currentTarget.value as WorkflowDesignerModel['runMode'] })}
          >
            <option>Terminal</option>
            <option>Shell</option>
            <option>Exec</option>
          </select>
        </label>
      </div>
      <label className="wfr-meta-desc">
        <span>Description</span>
        <input value={model.description} onChange={(event) => onChange({ description: event.currentTarget.value })} />
      </label>
    </section>
  );
}

export function TemplateLibraryView({
  templates,
  status,
  onSaveTemplate,
  onOpenTemplate,
  onToggleFavorite,
  onDeleteTemplate,
}: {
  templates: WorkflowTemplateRecord[];
  status: string;
  onSaveTemplate: () => void | Promise<void>;
  onOpenTemplate: (templateId: string) => void | Promise<void>;
  onToggleFavorite: (templateId: string) => void | Promise<void>;
  onDeleteTemplate: (templateId: string) => void | Promise<void>;
}) {
  const favorites = templates.filter((template) => template.favorite);
  const recent = templates
    .filter((template) => template.lastUsedAt)
    .sort((left, right) => Date.parse(right.lastUsedAt ?? '') - Date.parse(left.lastUsedAt ?? ''))
    .slice(0, 5);

  const renderTemplateRow = (template: WorkflowTemplateRecord, section: string) => (
    <div key={`${section}-${template.id}`} className={`wfr-template-row ${template.favorite ? 'favorite' : ''}`}>
      <button type="button" className="wfr-template-main" onClick={() => onOpenTemplate(template.id)}>
        <strong>{template.name}</strong>
        <span>
          {template.source === 'builtin' ? 'Built-in' : 'User'}
          {template.description ? ` - ${template.description}` : ''}
        </span>
      </button>
      <div className="wfr-template-actions">
        <button type="button" onClick={() => onToggleFavorite(template.id)}>
          {template.favorite ? 'Unfav' : 'Fav'}
        </button>
        <button type="button" disabled={template.source !== 'user'} onClick={() => onDeleteTemplate(template.id)}>
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="wfr-section wfr-template-library">
      <div className="wfr-template-head">
        <label className="wfr-label">Templates</label>
        <button type="button" onClick={onSaveTemplate}>
          Save Template
        </button>
      </div>
      {status ? <div className="wfr-template-status">{status}</div> : null}
      <div className="wfr-template-list">
        <span className="wfr-template-group">Favorites</span>
        {favorites.length ? (
          favorites.map((template) => renderTemplateRow(template, 'favorite'))
        ) : (
          <div className="wfr-empty-inline">No favorite templates.</div>
        )}
        <span className="wfr-template-group">Recent</span>
        {recent.length ? (
          recent.map((template) => renderTemplateRow(template, 'recent'))
        ) : (
          <div className="wfr-empty-inline">No recent templates.</div>
        )}
        <span className="wfr-template-group">All Templates</span>
        {templates.map((template) => renderTemplateRow(template, 'all'))}
      </div>
    </div>
  );
}
