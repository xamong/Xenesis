import type { MetaRecord } from '../metaManagementProvider';
import type { MetaManagementNewGroupData } from '../useMetaManagementGroupModal';

export interface MetaManagementNewGroupModalProps {
  visible: boolean;
  data: MetaManagementNewGroupData;
  attrsList: MetaRecord[];
  isLoading: boolean;
  onClose: () => void;
  onDataChange: (data: MetaManagementNewGroupData) => void;
  onCreate: () => void | Promise<void>;
  t: (key: string, values?: Record<string, string>) => string;
}

export function MetaManagementNewGroupModal({
  visible,
  data,
  attrsList,
  isLoading,
  onClose,
  onDataChange,
  onCreate,
  t,
}: MetaManagementNewGroupModalProps) {
  if (!visible) return null;

  return (
    <div className="mm-modal-overlay" onClick={onClose}>
      <div className="mm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="mm-modal-header">{t('meta.addGroup')}</div>
        <div className="mm-modal-body">
          <label className="mm-form-label">{t('meta.parentCode')}</label>
          <input className="mm-form-input" value={data.pcode} readOnly />

          <label className="mm-form-label">
            {t('meta.code')} <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            className="mm-form-input"
            value={data.code}
            onChange={(event) => onDataChange({ ...data, code: event.target.value })}
            placeholder={t('meta.codePlaceholder')}
          />

          <label className="mm-form-label">
            {t('meta.codeName')} <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            className="mm-form-input"
            value={data.name}
            onChange={(event) => onDataChange({ ...data, name: event.target.value })}
            placeholder={t('meta.codeNamePlaceholder')}
          />

          <label className="mm-form-label">{t('meta.attrCode')}</label>
          <select
            className="mm-form-input"
            value={data.acode}
            onChange={(event) => {
              const attr = attrsList.find((item) => item.CODE === event.target.value);
              onDataChange({
                ...data,
                acode: event.target.value,
                aid: Number(attr?.UID ?? 0),
              });
            }}
          >
            <option value="">{t('meta.noSelection')}</option>
            {attrsList.map((attr) => (
              <option key={String(attr.CODE)} value={String(attr.CODE)}>
                {String(attr.NAME || attr.CODE)} ({String(attr.CODE)})
              </option>
            ))}
          </select>
        </div>
        <div className="mm-modal-footer">
          <button className="mm-btn" onClick={onClose}>
            {t('meta.cancelBtn')}
          </button>
          <button className="mm-btn primary" onClick={onCreate} disabled={isLoading || !data.code || !data.name}>
            {isLoading ? t('meta.creatingBtn') : t('meta.createBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
