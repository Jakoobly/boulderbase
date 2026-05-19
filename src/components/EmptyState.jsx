// src/components/EmptyState.jsx
export default function EmptyState({ children = 'Noch keine Daten.' }) {
  return <div className="empty">{children}</div>;
}
