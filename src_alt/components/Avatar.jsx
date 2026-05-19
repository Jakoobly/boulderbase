// src/components/Avatar.jsx
import { initials } from '../utils/avatar.js';

export default function Avatar({ user = {}, size = '', className = '' }) {
  const bg = user.avatarColor || '#2D3142';
  const color = bg.toUpperCase() === '#B0D7FF' ? '#2D3142' : '#fff';
  return (
    <div className={`avatar ${size} ${className}`} style={{ background: bg, color }}>
      {user.avatarIcon || initials(user.name)}
    </div>
  );
}
