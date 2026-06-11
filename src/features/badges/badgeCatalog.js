import blueFirstGrip from '../../assets/badges/first-grip/blue_badge_first_grip.png';
import bronzeFirstGrip from '../../assets/badges/first-grip/bronze_badge_first_grip.png';
import goldFirstGrip from '../../assets/badges/first-grip/gold_badge_first_grip.png';
import silverFirstGrip from '../../assets/badges/first-grip/silver_badge_first_grip.png';
import { FIRST_GRIP_BADGE_ID, FIRST_GRIP_RARITIES } from '../../utils/badges.js';

const firstGripIcons = {
  bronze: bronzeFirstGrip,
  silver: silverFirstGrip,
  gold: goldFirstGrip,
  blue: blueFirstGrip,
};

export const BADGE_CATALOG = {
  [FIRST_GRIP_BADGE_ID]: {
    id: FIRST_GRIP_BADGE_ID,
    name: 'First Grip',
    description: 'Belohnung für gelöste Boulder.',
    variants: Object.fromEntries(FIRST_GRIP_RARITIES.map((variant) => [
      variant.key,
      {
        ...variant,
        icon: firstGripIcons[variant.key],
      },
    ])),
  },
};
