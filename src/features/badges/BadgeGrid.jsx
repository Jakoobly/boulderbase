import Badge from './Badge.jsx';
import { FIRST_GRIP_BADGE_ID } from '../../utils/badges.js';

export default function BadgeGrid({ profile }) {
  return (
    <section className="card badge-section-card">
      <div className="card-title">Badges</div>
      <div className="badge-grid">
        <Badge badgeId={FIRST_GRIP_BADGE_ID} profile={profile} />
      </div>
    </section>
  );
}
