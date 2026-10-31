/**
 * Multi-Layered Hand-Crafted Cartoon Vector Icons
 * Modeled directly after the "CARTOON BUTTONS SET" reference sheet:
 * - Plump, chubby organic silhouettes with convex curves
 * - Deep maroon-brown outer contour (#4a0e09)
 * - Recessed bottom drop-bevel + inner top-left specular highlight
 * - Zero emojis anywhere in the application.
 */

import React from 'react';
import { BudgetId } from '../game/progression';

interface IconProps {
  className?: string;
}

const OUTLINE = '#4a0e09';

/**
 * 1. PLAY ICON (Row 1, Col 1 of reference)
 * Chubby convex rounded triangle with inner top-left highlight arc
 */
export const CartoonPlayIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Bottom bevel shadow */}
    <path
      d="M8.5 7.8C8.5 5.1 11.6 3.6 14.1 5.0L26.2 12.2C28.6 13.6 28.6 17.0 26.2 18.4L14.1 25.6C11.6 27.0 8.5 25.5 8.5 22.8V7.8Z"
      fill="rgba(0,0,0,0.28)"
      transform="translate(0, 1.6)"
    />
    {/* Main chubby triangle */}
    <path
      d="M8.5 7.8C8.5 5.1 11.6 3.6 14.1 5.0L26.2 12.2C28.6 13.6 28.6 17.0 26.2 18.4L14.1 25.6C11.6 27.0 8.5 25.5 8.5 22.8V7.8Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    {/* Top-left inner specular highlight */}
    <path
      d="M11.2 8.4C11.2 7.3 12.4 6.7 13.4 7.3L19.5 10.9"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 2. ARROW RIGHT ICON (Row 1, Col 2 of reference)
 * Plump barrel shaft + fat rounded triangular head
 */
export const CartoonArrowRightIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M4.5 13.2C4.5 11.4 6.0 10.0 7.8 10.0H15.5V6.8C15.5 4.5 18.2 3.3 20.0 4.8L28.2 11.8C29.8 13.2 29.8 15.6 28.2 17.0L20.0 24.0C18.2 25.5 15.5 24.3 15.5 22.0V18.8H7.8C6.0 18.8 4.5 17.4 4.5 15.6V13.2Z"
      fill="rgba(0,0,0,0.28)"
      transform="translate(0, 1.5)"
    />
    <path
      d="M4.5 13.2C4.5 11.4 6.0 10.0 7.8 10.0H15.5V6.8C15.5 4.5 18.2 3.3 20.0 4.8L28.2 11.8C29.8 13.2 29.8 15.6 28.2 17.0L20.0 24.0C18.2 25.5 15.5 24.3 15.5 22.0V18.8H7.8C6.0 18.8 4.5 17.4 4.5 15.6V13.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 12.4H14.5"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 3. PAUSE ICON (Row 1, Col 4 of reference)
 * Two fat, chubby vertical rounded capsules
 */
export const CartoonPauseIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <g transform="translate(0, 1.5)" fill="rgba(0,0,0,0.28)">
      <rect x="6.5" y="5.5" width="7.5" height="20" rx="3.75" />
      <rect x="18" y="5.5" width="7.5" height="20" rx="3.75" />
    </g>
    <rect
      x="6.5"
      y="5.5"
      width="7.5"
      height="20"
      rx="3.75"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
    />
    <rect
      x="18"
      y="5.5"
      width="7.5"
      height="20"
      rx="3.75"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
    />
    <path
      d="M9.2 8.5V13.5M20.7 8.5V13.5"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 4. GEAR / SETTINGS ICON (Row 2, Col 1 of reference)
 * 8-tooth chubby cogwheel with center ring hole
 */
export const CartoonGearIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.6 3.5C13.1 3.5 12.7 3.9 12.5 4.4L11.9 6.8C11.1 7.1 10.4 7.5 9.8 8.0L7.4 7.2C6.9 7.0 6.3 7.2 6.0 7.6L4.0 10.6C3.7 11.0 3.8 11.6 4.2 12.0L6.1 13.6C5.9 14.4 5.9 15.2 6.1 16.0L4.2 17.6C3.8 18.0 3.7 18.6 4.0 19.0L6.0 22.0C6.3 22.4 6.9 22.6 7.4 22.4L9.8 21.6C10.4 22.1 11.1 22.5 11.9 22.8L12.5 25.2C12.7 25.7 13.1 26.1 13.6 26.1H18.4C18.9 26.1 19.3 25.7 19.5 25.2L20.1 22.8C20.9 22.5 21.6 22.1 22.2 21.6L24.6 22.4C25.1 22.6 25.7 22.4 26.0 22.0L28.0 19.0C28.3 18.6 28.2 18.0 27.8 17.6L25.9 16.0C26.1 15.2 26.1 14.4 25.9 13.6L27.8 12.0C28.2 11.6 28.3 11.0 28.0 10.6L26.0 7.6C25.7 7.2 25.1 7.0 24.6 7.2L22.2 8.0C21.6 7.5 20.9 7.1 20.1 6.8L19.5 4.4C19.3 3.9 18.9 3.5 18.4 3.5H13.6ZM16 19.2C18.4 19.2 20.4 17.2 20.4 14.8C20.4 12.4 18.4 10.4 16 10.4C13.6 10.4 11.6 12.4 11.6 14.8C11.6 17.2 13.6 19.2 16 19.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 5. RESET / REPLAY CIRCULAR ARROW ICON (Row 2, Col 2 of reference)
 * Thick curved circular arrow with plump arrowhead at top
 */
export const CartoonResetIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M15.5 4.2C15.5 2.7 13.7 1.9 12.6 2.9L6.8 8.2C5.9 9.0 5.9 10.4 6.8 11.2L12.6 16.5C13.7 17.5 15.5 16.7 15.5 15.2V12.8C19.2 13.1 21.8 15.9 21.8 19.4C21.8 23.1 18.8 26.0 15.0 26.0C11.5 26.0 8.6 23.4 8.2 20.0C8.0 18.2 6.4 17.0 4.6 17.2C2.8 17.5 1.6 19.1 1.8 20.9C2.7 27.4 8.3 32.2 15.0 32.2C22.4 32.2 28.2 26.5 28.2 19.4C28.2 12.5 22.8 6.9 15.5 6.5V4.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
      transform="translate(1, -1.5)"
    />
  </svg>
);

/**
 * 6. REBIRTH / DOUBLE SYNC ARROWS ICON (Row 2, Col 3 of reference)
 * Two plump curved chasing arrows forming a tight dynamic circle
 */
export const CartoonRebirthIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Upper arrow */}
    <path
      d="M6.2 13.8C7.4 8.6 12.0 5.0 17.5 5.4L17.5 3.4C17.5 1.9 19.3 1.2 20.4 2.2L26.2 7.4C27.1 8.2 27.1 9.6 26.2 10.4L20.4 15.6C19.3 16.6 17.5 15.9 17.5 14.4V11.6C14.3 11.3 11.7 13.2 11.0 15.8C10.5 17.4 8.8 18.2 7.3 17.6C5.9 17.0 5.8 15.3 6.2 13.8Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Lower arrow */}
    <path
      d="M25.8 18.2C24.6 23.4 20.0 27.0 14.5 26.6V28.6C14.5 30.1 12.7 30.8 11.6 29.8L5.8 24.6C4.9 23.8 4.9 22.4 5.8 21.6L11.6 16.4C12.7 15.4 14.5 16.1 14.5 17.6V20.4C17.7 20.7 20.3 18.8 21.0 16.2C21.5 14.6 23.2 13.8 24.7 14.4C26.1 15.0 26.2 16.7 25.8 18.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 7. CLOSE X ICON (Row 3, Col 1 of reference)
 * Two fat crossed capsules with rounded pillow ends
 */
export const CartoonCloseIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M7.2 7.2C8.9 5.5 11.6 5.5 13.3 7.2L16.0 9.9L18.7 7.2C20.4 5.5 23.1 5.5 24.8 7.2C26.5 8.9 26.5 11.6 24.8 13.3L22.1 16.0L24.8 18.7C26.5 20.4 26.5 23.1 24.8 24.8C23.1 26.5 20.4 26.5 18.7 24.8L16.0 22.1L13.3 24.8C11.6 26.5 8.9 26.5 7.2 24.8C5.5 23.1 5.5 20.4 7.2 18.7L9.9 16.0L7.2 13.3C5.5 11.6 5.5 8.9 7.2 7.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <path
      d="M9.4 9.2L12.2 12.0M20.2 9.2L22.6 11.6"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 8. CHECK ICON (Row 3, Col 2 of reference)
 * Very plump, chubby rounded checkmark
 */
export const CartoonCheckIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M5.4 16.6C3.8 15.0 3.8 12.3 5.4 10.7C7.0 9.1 9.7 9.1 11.3 10.7L13.8 13.2L20.7 6.3C22.3 4.7 25.0 4.7 26.6 6.3C28.2 7.9 28.2 10.6 26.6 12.2L16.8 22.0C15.1 23.7 12.4 23.7 10.8 22.0L5.4 16.6Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.4"
      strokeLinejoin="round"
      transform="translate(0, 1.5)"
    />
    <path
      d="M7.5 13.2L11.2 16.9M16.2 14.5L23.5 7.2"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 9. SOUND ON ICON (Row 3, Col 3 of reference)
 * Chubby speaker cone + 2 thick curved sound-wave arcs
 */
export const CartoonSoundOnIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M4.5 12.2C4.5 10.7 5.7 9.5 7.2 9.5H10.4L15.8 5.2C17.4 3.9 19.8 5.1 19.8 7.2V24.8C19.8 26.9 17.4 28.1 15.8 26.8L10.4 22.5H7.2C5.7 22.5 4.5 21.3 4.5 19.8V12.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M23.2 11.2C25.2 13.8 25.2 18.2 23.2 20.8"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <path
      d="M26.8 7.8C30.0 12.4 30.0 19.6 26.8 24.2"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 10. SOUND OFF ICON
 * Chubby speaker cone + bold mute cross
 */
export const CartoonSoundOffIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M4.5 12.2C4.5 10.7 5.7 9.5 7.2 9.5H10.4L15.8 5.2C17.4 3.9 19.8 5.1 19.8 7.2V24.8C19.8 26.9 17.4 28.1 15.8 26.8L10.4 22.5H7.2C5.7 22.5 4.5 21.3 4.5 19.8V12.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M23.0 12.5L28.5 19.5M28.5 12.5L23.0 19.5"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 11. TROPHY ICON (Row 4, Col 3 of reference)
 * Chubby cup with rounded ear handles, pedestal base, and golden star in the center
 */
export const CartoonTrophyIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Cup handles */}
    <path
      d="M8.5 8.5H5.8C4.2 8.5 3.2 10.0 3.6 11.8C4.2 14.5 6.4 16.5 9.2 16.8M23.5 8.5H26.2C27.8 8.5 28.8 10.0 28.4 11.8C27.8 14.5 25.6 16.5 22.8 16.8"
      stroke={OUTLINE}
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <path
      d="M8.5 8.5H5.8C4.2 8.5 3.2 10.0 3.6 11.8C4.2 14.5 6.4 16.5 9.2 16.8M23.5 8.5H26.2C27.8 8.5 28.8 10.0 28.4 11.8C27.8 14.5 25.6 16.5 22.8 16.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Cup body + stem + base */}
    <path
      d="M8.2 5.5C8.2 4.7 8.9 4.0 9.7 4.0H22.3C23.1 4.0 23.8 4.7 23.8 5.5V12.2C23.8 16.5 20.6 20.0 16 20.0C11.4 20.0 8.2 16.5 8.2 12.2V5.5Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <rect
      x="13.5"
      y="19.5"
      width="5"
      height="5"
      rx="1.5"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    <rect
      x="9.5"
      y="24"
      width="13"
      height="4.2"
      rx="2.1"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    {/* Star carved in the center of the cup (exact detail from reference) */}
    <path
      d="M16 7.4L17.3 10.0L20.1 10.4L18.0 12.4L18.5 15.2L16 13.8L13.5 15.2L14.0 12.4L11.9 10.4L14.7 10.0L16 7.4Z"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 12. STAR ICON (Row 5, Col 1 of reference)
 * Chubby 5-pointed star with soft rounded tips and inner highlight
 */
export const CartoonStarIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M14.5 4.2C15.1 2.9 16.9 2.9 17.5 4.2L20.3 9.9L26.6 10.8C28.0 11.0 28.6 12.7 27.5 13.7L23.0 18.1L24.1 24.4C24.3 25.8 22.8 26.9 21.6 26.2L16.0 23.2L10.4 26.2C9.2 26.9 7.7 25.8 7.9 24.4L9.0 18.1L4.5 13.7C3.4 12.7 4.0 11.0 5.4 10.8L11.7 9.9L14.5 4.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M14.8 7.2L13.2 10.6L9.5 11.2"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 13. VIDEO CAMERA / REWARDED AD ICON (Row 5, Col 5 of reference)
 * Retro cartoon film camera with 2 round reels on top, chubby body, and flared side cone
 */
export const CartoonVideoAdIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Two round film reels on top with center holes */}
    <circle
      cx="9.5"
      cy="8.5"
      r="4.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    <circle cx="9.5" cy="8.5" r="1.4" fill="#fff36b" />
    <circle
      cx="18.2"
      cy="8.5"
      r="4.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    <circle cx="18.2" cy="8.5" r="1.4" fill="#fff36b" />
    {/* Chubby camera body */}
    <rect
      x="4.5"
      y="13"
      width="17"
      height="13"
      rx="4.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    {/* Flared lens cone on the right */}
    <path
      d="M21.5 16.5L26.8 13.4C28.0 12.7 29.5 13.6 29.5 15.0V24.0C29.5 25.4 28.0 26.3 26.8 25.6L21.5 22.5V16.5Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    {/* Specular highlight on body */}
    <path
      d="M7.5 15.8H13.5"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 14. GLOSSY 3D CARTOON COIN ICON
 * Multi-layered golden coin with maroon contour, recessed inner disk, star & specular crescent
 */
export const CartoonCoinIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* 3D Bottom Coin Rim */}
    <circle cx="16" cy="17.4" r="12.5" fill="#9e2518" stroke={OUTLINE} strokeWidth="2.3" />
    {/* Main Golden Coin Body */}
    <circle cx="16" cy="15.2" r="12.5" fill="#f7c122" stroke={OUTLINE} strokeWidth="2.3" />
    {/* Recessed Inner Ring */}
    <circle
      cx="16"
      cy="15.2"
      r="8.8"
      fill="#e08814"
      stroke="#7a1c14"
      strokeWidth="1.8"
    />
    {/* Center Embossed Vertical Bar / Star */}
    <rect
      x="14.1"
      y="9.8"
      width="3.8"
      height="10.8"
      rx="1.9"
      fill="#fff566"
      stroke="#7a1c14"
      strokeWidth="1.5"
    />
    {/* Top-Left Curved Specular Highlight */}
    <path
      d="M7.8 11.2C8.9 8.2 11.6 6.2 14.8 5.8"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 15. CHUBBY CARTOON BOXING GLOVE ICON
 */
export const CartoonGloveIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Main padded fist dome */}
    <path
      d="M9.5 18.5V11.8C9.5 6.8 13.5 3.5 18.5 3.5C23.5 3.5 27.2 7.0 27.2 12.0V16.8C27.2 20.2 24.6 22.5 21.2 22.5H11.5C9.8 22.5 8.5 21.2 8.5 19.5"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    {/* Chubby curved thumb */}
    <path
      d="M11.2 11.5H7.8C5.4 11.5 3.8 13.2 3.8 15.5C3.8 17.8 5.6 19.5 8.0 19.5H13.5C15.2 19.5 16.5 18.2 16.5 16.5C16.5 14.8 15.2 13.5 13.5 13.5"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Wrist strap cuff */}
    <rect
      x="10.5"
      y="22"
      width="11.5"
      height="6"
      rx="2.6"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    {/* Top knuckle highlight */}
    <path
      d="M13.5 7.2C15.5 6.0 18.5 6.0 20.8 7.0"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 16. CHUBBY LIGHTNING BOLT ICON
 */
export const CartoonBoltIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M18.2 3.2C19.5 2.0 21.6 3.2 21.1 4.9L18.6 13.0H24.2C25.9 13.0 26.8 15.0 25.6 16.2L13.8 28.8C12.5 30.0 10.4 28.8 10.9 27.1L13.4 19.0H7.8C6.1 19.0 5.2 17.0 6.4 15.8L18.2 3.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M17.2 6.8L11.2 13.5"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 17. CARTOON MAGNET ICON
 */
export const CartoonMagnetIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M6.5 6.5V16.5C6.5 22.0 10.8 26.5 16 26.5C21.2 26.5 25.5 22.0 25.5 16.5V6.5H19.5V16.5C19.5 18.6 18.0 20.2 16 20.2C14.0 20.2 12.5 18.6 12.5 16.5V6.5H6.5Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <rect
      x="6.5"
      y="4.5"
      width="6"
      height="5"
      rx="1.5"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    <rect
      x="19.5"
      y="4.5"
      width="6"
      height="5"
      rx="1.5"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
  </svg>
);

/**
 * 18. CARTOON WRECKING BALL / BOMB ICON
 */
export const CartoonBombIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle
      cx="15"
      cy="18"
      r="10"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    <path
      d="M19.5 9.2L22.2 6.5C23.5 5.2 25.8 5.2 27.2 6.8"
      stroke={OUTLINE}
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <circle cx="27.2" cy="6.8" r="2.6" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.6" />
    <path
      d="M10.2 14.2C11.2 12.0 13.4 10.6 15.8 10.5"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 19. CARTOON SHIELD ICON
 */
export const CartoonShieldIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M16 3.5L6.2 7.5V15.2C6.2 21.8 10.4 26.8 16 28.8C21.6 26.8 25.8 21.8 25.8 15.2V7.5L16 3.5Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M16 7.5L10.2 10.0V14.8C10.2 19.0 12.6 22.5 16 24.2"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 20. CARTOON STOPWATCH / TIMER ICON
 */
export const CartoonTimerIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <rect
      x="12.5"
      y="2.5"
      width="7"
      height="3.8"
      rx="1.9"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
    />
    <circle
      cx="16"
      cy="18"
      r="10.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    <circle cx="16" cy="18" r="6.8" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.8" />
    <path
      d="M16 14.2V18.2L18.8 20.0"
      stroke={OUTLINE}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 21. CARTOON EXPLOSION STARBURST ICON
 */
export const CartoonExplosionIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M16 2.8L19.6 9.5L27.0 6.8L23.6 13.8L30.0 17.8L22.6 20.5L24.8 28.0L17.8 24.0L13.0 30.0L11.6 22.4L3.8 23.6L8.4 17.2L3.0 11.5L10.6 10.6L10.8 3.2L16 2.8Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 22. CARTOON GOLDEN BRICK WALL ICON
 */
export const CartoonGoldWallIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <rect
      x="4"
      y="5.5"
      width="24"
      height="21"
      rx="4"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    <path
      d="M4 12.5H28M4 19.5H28M15 5.5V12.5M21 12.5V19.5M11 19.5V26.5"
      stroke={OUTLINE}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M6.8 8.2H12.2"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 23. CARTOON HAMMER / SMASH ICON
 */
export const CartoonHammerIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    {/* Wooden handle */}
    <path
      d="M14.5 14.5L6.2 22.8C5.0 24.0 5.0 26.0 6.2 27.2C7.4 28.4 9.4 28.4 10.6 27.2L18.9 18.9"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinecap="round"
    />
    {/* Heavy mallet head */}
    <rect
      x="14.5"
      y="3.5"
      width="14.5"
      height="9.5"
      rx="3.2"
      transform="rotate(45 18 5)"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
  </svg>
);

/**
 * 24. CARTOON FLAME / COMBO ICON
 */
export const CartoonFlameIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M16.8 3.2C18.5 7.4 25.5 11.2 25.5 18.5C25.5 24.2 21.2 28.5 15.8 28.5C10.4 28.5 6.2 24.2 6.2 18.5C6.2 14.2 8.8 10.6 11.2 8.5C11.2 11.5 13.0 13.0 14.2 13.4C13.0 9.6 14.5 5.6 16.8 3.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M15.8 25.5C18.2 25.5 20.0 23.6 20.0 21.0C20.0 18.6 17.5 16.8 16.2 15.0C15.0 16.8 12.2 18.6 12.2 21.0C12.2 23.6 13.8 25.5 15.8 25.5Z"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 25. CARTOON ROOM DOOR ICON
 */
export const CartoonDoorIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <rect
      x="7.5"
      y="4"
      width="17"
      height="24"
      rx="3.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    <circle cx="20.2" cy="16" r="2.2" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.6" />
    <path
      d="M10.5 7.5V16"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 26. CARTOON PADLOCK ICON
 */
export const CartoonLockIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M10.5 14V10.2C10.5 7.0 13.0 4.5 16 4.5C19.0 4.5 21.5 7.0 21.5 10.2V14"
      stroke={OUTLINE}
      strokeWidth="4.6"
      strokeLinecap="round"
    />
    <path
      d="M10.5 14V10.2C10.5 7.0 13.0 4.5 16 4.5C19.0 4.5 21.5 7.0 21.5 10.2V14"
      stroke="#fff36b"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <rect
      x="6.5"
      y="13.5"
      width="19"
      height="14.5"
      rx="4.2"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
    />
    <circle cx="16" cy="20.5" r="2.4" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.6" />
  </svg>
);

/**
 * 27. CARTOON SKULL / BOSS ICON
 */
export const CartoonSkullIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M16 4.2C9.8 4.2 5.5 8.6 5.5 14.5C5.5 18.0 7.2 20.8 9.8 22.4V26.2C9.8 27.4 10.8 28.4 12.0 28.4H20.0C21.2 28.4 22.2 27.4 22.2 26.2V22.4C24.8 20.8 26.5 18.0 26.5 14.5C26.5 8.6 22.2 4.2 16 4.2Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <circle cx="12.2" cy="14.8" r="2.6" fill={OUTLINE} />
    <circle cx="19.8" cy="14.8" r="2.6" fill={OUTLINE} />
    <path d="M14.2 24.5V28M17.8 24.5V28" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/**
 * Helper to render the matching Cartoon Vector Icon for any of the 6 Budgets
 */
export const CartoonBudgetIcon: React.FC<{ id: BudgetId; className?: string }> = ({
  id,
  className = 'w-7 h-7',
}) => {
  switch (id) {
    case 'coin_magnet':
      return <CartoonMagnetIcon className={className} />;
    case 'multi_ball':
      return <CartoonBombIcon className={className} />;
    case 'gold_rush':
      return <CartoonGoldWallIcon className={className} />;
    case 'shock_shield':
      return <CartoonShieldIcon className={className} />;
    case 'plus_timer':
      return <CartoonTimerIcon className={className} />;
    case 'tnt_punch':
      return <CartoonExplosionIcon className={className} />;
  }
};

/**
 * 28. CARTOON LANGUAGE TOGGLE ICON (PT / EN)
 * Chubby globe with latitude/longitude lines and specular reflection
 */
export const CartoonLanguageIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="17.2" r="10.8" fill="rgba(0,0,0,0.28)" />
    <circle cx="16" cy="16" r="10.8" fill="currentColor" stroke={OUTLINE} strokeWidth="2.3" />
    <ellipse cx="16" cy="16" rx="5.5" ry="10.8" stroke={OUTLINE} strokeWidth="1.8" />
    <path d="M5.5 16H26.5M7.5 10.5H24.5M7.5 21.5H24.5" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M9.5 9.5C11.2 7.5 13.5 6.5 16 6.5"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 29. CARTOON JACKPOT / LUCKY CROWN & ROULETTE ICON
 * Golden royal crown with 3 sparkling starburst jewels and headband
 */
export const CartoonJackpotIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M5.5 22.5L4 10L11 15L16 6.5L21 15L28 10L26.5 22.5H5.5Z"
      fill="rgba(0,0,0,0.28)"
      transform="translate(0, 1.5)"
    />
    <path
      d="M5.5 22.5L4 10L11 15L16 6.5L21 15L28 10L26.5 22.5H5.5Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <circle cx="4" cy="9.5" r="2.4" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.5" />
    <circle cx="16" cy="6" r="2.7" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.5" />
    <circle cx="28" cy="9.5" r="2.4" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.5" />
    <rect x="5.5" y="21.5" width="21" height="4.5" rx="2" fill="#fff36b" stroke={OUTLINE} strokeWidth="2" />
    <circle cx="11" cy="23.8" r="1.1" fill="#e12d24" />
    <circle cx="16" cy="23.8" r="1.1" fill="#22c55e" />
    <circle cx="21" cy="23.8" r="1.1" fill="#9333ea" />
  </svg>
);

/**
 * 30. CARTOON SOUND ICON (Context-aware: muted or unmuted)
 */
export const CartoonSoundIcon: React.FC<IconProps & { muted?: boolean }> = ({
  className = 'w-6 h-6',
  muted = false,
}) => {
  return muted ? <CartoonSoundOffIcon className={className} /> : <CartoonSoundOnIcon className={className} />;
};

/**
 * 31. CARTOON MOVE SPEED (WINGED BOOT / DASH) ICON
 */
export const CartoonMoveSpeedIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M3 17H7M2 21H6M4 25H8" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M5.5 9.5C8 9.5 12 11.5 13 14M4 14C7 14 11 16 12 18M3 18.5C6 18.5 9 20 10 21"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinecap="round"
    />
    <path
      d="M12 13L16 11L18 17H23C25.5 17 28 19 28 22C28 24.5 26 25.5 23 25.5H12C9.5 25.5 8 23.5 8 21L12 13Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M8 23.5H27" stroke="#fff36b" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 14.5L17 12.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const CartoonSpeedBootIcon = CartoonMoveSpeedIcon;

/**
 * 32. CARTOON PUNCH FORCE (EXPLOSIVE GLOVE BLAST) ICON
 */
export const CartoonPunchForceIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M23 7L24.5 10L28 10.5L25.5 13L26 16.5L23 15L20 16.5L20.5 13L18 10.5L21.5 10L23 7Z"
      fill="#fff36b"
      stroke={OUTLINE}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 19.5V13.8C7.5 9.5 11 6.5 15.5 6.5C19.8 6.5 23 9.5 23 13.8V17.8C23 20.8 20.8 22.8 17.8 22.8H9.5C8.2 22.8 7.5 21.5 7.5 19.5"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M9 13.5H6C4 13.5 2.5 15 2.5 17C2.5 19 4 20.5 6 20.5H11"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="8.5" y="22.5" width="10" height="5.5" rx="2.5" fill="#fff36b" stroke={OUTLINE} strokeWidth="2.2" />
    <path d="M12 9.5C13.8 8.5 16.2 8.5 18 9.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 33. CARTOON PUNCH SPEED (RAPID COMBO FISTS / SPEED TRAILS) ICON
 */
export const CartoonPunchSpeedIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M3 9H9M2 16H8M3 23H9" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M10 13H15C17.5 13 19.5 14.8 19.5 17C19.5 19.2 17.5 21 15 21H10"
      stroke={OUTLINE}
      strokeWidth="2.2"
      opacity="0.4"
      strokeLinecap="round"
    />
    <path
      d="M11 7C11 5.5 12.2 4.2 13.8 4.2H18.5C22 4.2 25 7 25 10.5C25 12.2 24.2 13.8 23 14.8C24.5 15.8 25.5 17.5 25.5 19.5C25.5 23 22.5 25.8 19 25.8H13.8C12.2 25.8 11 24.5 11 23V7Z"
      fill="currentColor"
      stroke={OUTLINE}
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path d="M18 10H23M18 15H22M18 20H23" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
    <path d="M14 7.5H18" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const CartoonFistComboIcon = CartoonPunchSpeedIcon;

/**
 * 34. CARTOON BALL FORCE (HEAVY KINETIC WRECKING ORB) ICON
 */
export const CartoonBallForceIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="13" stroke="#f43f5e" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.75" />
    <circle cx="16" cy="17.5" r="9.5" fill="rgba(0,0,0,0.3)" />
    <circle cx="16" cy="16" r="9.5" fill="currentColor" stroke={OUTLINE} strokeWidth="2.3" />
    <circle cx="14" cy="14" r="1.8" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.2" />
    <circle cx="18" cy="14" r="1.8" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.2" />
    <circle cx="16" cy="18.5" r="1.8" fill="#fff36b" stroke={OUTLINE} strokeWidth="1.2" />
    <path
      d="M10.5 11.5C11.8 9.5 13.8 8.5 16 8.5"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
