import React from 'react';
import type { MetaFormField, MetaFormPreviewRow } from '../metaManagementCmdbAssist';

interface MetaManagementFormOption {
  value: string;
  label: string;
}

export interface MetaManagementFormViewProps {
  formFields: MetaFormField[];
  formPreviewRows: MetaFormPreviewRow[];
  instanceOptions: MetaManagementFormOption[];
  selectedRid: string;
  onSelectedRidChange: (value: string) => void;
}

export function MetaManagementFormView({
  formFields,
  formPreviewRows,
  instanceOptions,
  selectedRid,
  onSelectedRidChange,
}: MetaManagementFormViewProps) {
  return (
    <div className="mm-xmdb-form-layout">
      {formPreviewRows.length === 0 ? (
        <div className="mm-xmdb-empty">No form metadata is available for the selected node.</div>
      ) : (
        <>
          <div className="mm-xmdb-grid">
            {formFields.map((field) => (
              <div key={field.code} className="mm-xmdb-field">
                <div className="mm-xmdb-field-main">
                  <strong>{field.label}</strong>
                  <span>{field.code}</span>
                </div>
                <div className="mm-xmdb-badges">
                  <span className="mm-xmdb-badge">{field.inputType}</span>
                  {!field.visible && <span className="mm-xmdb-badge muted">hidden</span>}
                  {field.required && <span className="mm-xmdb-badge warn">required</span>}
                  {field.readOnly && <span className="mm-xmdb-badge muted">readonly</span>}
                  {field.options.length > 0 && <span className="mm-xmdb-badge">{field.options.length} options</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mm-xmdb-preview" aria-label="Metadata form preview">
            <div className="mm-xmdb-preview-head">
              <div className="mm-xmdb-preview-title">Preview</div>
              {instanceOptions.length > 0 && (
                <label className="mm-xmdb-preview-select">
                  <span>Preview Record</span>
                  <select value={selectedRid} onChange={(event) => onSelectedRidChange(event.target.value)}>
                    {instanceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {formPreviewRows.map(({ field, value, source }) => (
              <label key={field.code} className="mm-xmdb-preview-field">
                <span>
                  {field.label}
                  <em>{source}</em>
                </span>
                {field.inputType === 'textarea' ? (
                  <textarea value={value} readOnly />
                ) : field.inputType === 'select' ? (
                  <select value={value} disabled>
                    <option value="">{value || '-'}</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.inputType === 'checkbox' ? (
                  <input type="checkbox" checked={String(value).toUpperCase() === 'Y'} readOnly />
                ) : (
                  <input
                    type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
                    value={value}
                    readOnly
                  />
                )}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
