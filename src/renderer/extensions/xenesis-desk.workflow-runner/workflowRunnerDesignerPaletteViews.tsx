import { useMemo } from 'react';
import { ACTION_CATALOG, type WorkflowDesignerActionType } from './workflowDesigner';

export function ActionPalette({ onAddAction }: { onAddAction: (type: WorkflowDesignerActionType) => void }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof ACTION_CATALOG>();
    for (const item of ACTION_CATALOG) {
      grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
    }
    return [...grouped.entries()];
  }, []);

  return (
    <aside className="wfr-palette">
      <div className="wfr-panel-title">Action Palette</div>
      {groups.map(([category, items]) => (
        <div key={category} className="wfr-palette-group">
          <div className="wfr-palette-category">{category}</div>
          {items.map((item) => (
            <button
              key={item.type}
              type="button"
              className="wfr-palette-item"
              title={item.description}
              onClick={() => onAddAction(item.type)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
