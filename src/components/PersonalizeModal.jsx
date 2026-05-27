import { useState } from 'react';
import Avatar from './Avatar.jsx';
import { AVATAR_COLORS, AVATAR_ICONS } from '../constants.js';

export default function PersonalizeModal({ title, value, descriptionLabel = 'Beschreibung', onClose, onSave, dangerAction }) {
  const [draft, setDraft] = useState({
    name: value?.name || '',
    description: value?.description ?? value?.status ?? '',
    avatarColor: value?.avatarColor || '#2D3142',
    avatarIcon: value?.avatarIcon || '🪨'
  });
  function save() {
    onSave({
      name: draft.name.trim() || value?.name || 'Unbenannt',
      description: draft.description.trim(),
      avatarColor: draft.avatarColor,
      avatarIcon: draft.avatarIcon
    });
    onClose();
  }
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="personalize-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><div className="tag">Personalisieren</div><h2>{title}</h2></div><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-preview"><Avatar profile={draft} className="big" /><div><strong>{draft.name || 'Name'}</strong><div className="sub">{draft.description || descriptionLabel}</div></div></div>
      <div className="modal-section"><label>Name</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name eingeben" /></div>
      <div className="modal-section"><label>{descriptionLabel}</label><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={`${descriptionLabel} eingeben`} rows="3" /></div>
      <div className="modal-section"><label>Icon</label><div className="avatar-picker modal-picker">{AVATAR_ICONS.map((i) => <button type="button" key={i} className={`avatar-choice ${draft.avatarIcon === i ? 'active' : ''}`} onClick={() => setDraft({ ...draft, avatarIcon: i })}>{i}</button>)}</div></div>
      <div className="modal-section"><label>Farbe</label><div className="avatar-picker modal-picker">{AVATAR_COLORS.map((c) => <button type="button" key={c} className={`avatar-choice color-choice ${draft.avatarColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, avatarColor: c })}>{draft.avatarColor === c ? '✓' : ''}</button>)}</div></div>
      {dangerAction && <div className="modal-danger-zone"><button type="button" className="link-danger-btn subtle-delete-btn" onClick={dangerAction.onClick}>{dangerAction.label}</button></div>}
      <div className="modal-actions personalize-actions"><button className="personalize-action-btn secondary" onClick={onClose}>Abbrechen</button><button className="personalize-action-btn primary" onClick={save}>Speichern</button></div>
    </div>
  </div>;
}
