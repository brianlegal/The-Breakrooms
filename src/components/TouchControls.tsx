/**
 * Mobile / Touch Controls Overlay with Glossy Plump Cartoon Buttons & Custom Vector Icons (zero emojis).
 */
import React, { useRef, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { t } from '../game/i18n';
import {
  CartoonBombIcon,
  CartoonBoltIcon,
  CartoonGloveIcon,
  CartoonExplosionIcon,
} from './CartoonIcons';

interface TouchControlsProps {
  engine: GameEngine | null;
  canSuperSmash: boolean;
  hasBall?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ engine, canSuperSmash, hasBall }) => {
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const strings = t();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setStickPos({ x: 0, y: 0 });
        engine?.setMoveInput(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current || !engine) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = 45;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });

    const normX = dx / maxRadius;
    const normY = -dy / maxRadius;
    engine.setMoveInput(normX, normY);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex select-none md:hidden">
      {/* Virtual Joystick (Left) */}
      <div className="absolute bottom-20 left-6 pointer-events-auto">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#7a1c14] bg-black/45 backdrop-blur-xs"
        >
          <div
            className="cartoon-btn h-12 w-12 !rounded-full"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: joystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        </div>
      </div>

      {/* Action Buttons (Right) */}
      <div className="absolute bottom-20 right-6 flex flex-col gap-2.5 pointer-events-auto">
        {hasBall && (
          <button
            type="button"
            onClick={() => engine?.punch('throw')}
            className="cartoon-btn cartoon-btn-purple flex h-12 w-full items-center justify-center gap-2 px-4 font-arcade text-xs animate-pulse"
          >
            <CartoonBombIcon className="h-5 w-5" />
            <span>{strings.touchThrow}</span>
          </button>
        )}

        {canSuperSmash && !hasBall && (
          <button
            type="button"
            onClick={() => engine?.punch('super')}
            className="cartoon-btn flex h-12 w-full items-center justify-center gap-2 px-4 font-arcade text-sm animate-bounce"
          >
            <CartoonBoltIcon className="h-5 w-5" />
            <span>SUPER SMASH!</span>
          </button>
        )}

        {/* Mobility Row: Jump and Dash */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => engine?.jump()}
            className="cartoon-btn flex h-11 flex-1 items-center justify-center gap-1 px-3 font-arcade text-[11px]"
          >
            <span>{strings.touchJump}</span>
          </button>
          <button
            type="button"
            onClick={() => engine?.dash()}
            className="cartoon-btn cartoon-btn-green flex h-11 flex-1 items-center justify-center gap-1 px-3 font-arcade text-[11px]"
          >
            <CartoonBoltIcon className="h-4 w-4" />
            <span>{strings.touchDash}</span>
          </button>
        </div>

        {/* Punches Row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => engine?.punch('combo')}
            className="cartoon-btn cartoon-btn-red flex h-16 w-18 flex-col items-center justify-center gap-1 font-arcade text-xs"
          >
            {hasBall ? (
              <CartoonBombIcon className="h-6 w-6" />
            ) : (
              <CartoonGloveIcon className="h-6 w-6" />
            )}
            <span>{hasBall ? strings.touchThrow : strings.touchCombo}</span>
          </button>

          <button
            type="button"
            onClick={() => engine?.punch('uppercut_right')}
            className="cartoon-btn flex h-16 w-18 flex-col items-center justify-center gap-1 font-arcade text-xs"
          >
            {hasBall ? (
              <CartoonBombIcon className="h-6 w-6" />
            ) : (
              <CartoonExplosionIcon className="h-6 w-6" />
            )}
            <span>{hasBall ? strings.touchThrow : strings.touchHeavy}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
