/**
 * Universal Mobile / Tablet / Touchscreen Chromebook Controls Overlay
 * Features:
 * - Dynamic Thumb Floating Joystick in the lower-left quadrant (anchors where the thumb touches)
 * - Strict Touch Isolation (`e.stopPropagation()`) on both joystick and right-side button clusters
 * - Multi-touch safe identifier tracking & Hold-to-Punch Turbo Combo support
 */
import React, { useRef, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { soundManager } from '../game/audio';
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
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchZoneRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const anchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const strings = t();

  const maxRadius = 46;

  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    soundManager.init();
    if (touchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    touchIdRef.current = touch.identifier;
    anchorRef.current = { x: touch.clientX, y: touch.clientY };
    setAnchorPos({ x: touch.clientX, y: touch.clientY });
    setJoystickActive(true);
    setStickPos({ x: 0, y: 0 });
    engine?.setMoveInput(0, 0);
    // Tapping anywhere (including the joystick zone) immediately executes Smart Action (Punch / Throw Ball / Super Smash)
    engine?.triggerSmartAction();
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateFloatingJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setAnchorPos(null);
        setStickPos({ x: 0, y: 0 });
        engine?.setMoveInput(0, 0);
        break;
      }
    }
  };

  const updateFloatingJoystick = (clientX: number, clientY: number) => {
    if (!engine) return;
    const centerX = anchorRef.current.x;
    const centerY = anchorRef.current.y;

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

  const stopTouchPropagation = (e: React.TouchEvent) => {
    e.stopPropagation();
    soundManager.init();
  };

  return (
    <div
      data-touch-ui="true"
      className="pointer-events-none absolute inset-0 z-30 flex select-none"
    >
      {/* Dynamic Thumb Floating Joystick Zone (Lower-Left Quadrant) */}
      <div
        ref={touchZoneRef}
        data-touch-ui="true"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        className="pointer-events-auto absolute bottom-0 left-0 h-[56vh] w-[44vw] touch-none"
      >
        {/* Joystick Ring: Anchors at thumb touch coordinates when active, or rests at bottom-left */}
        <div
          className="pointer-events-none flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#7a1c14] bg-black/45 backdrop-blur-xs transition-opacity duration-150"
          style={
            joystickActive && anchorPos
              ? {
                  position: 'fixed',
                  left: `${anchorPos.x - 56}px`,
                  top: `${anchorPos.y - 56}px`,
                  opacity: 1,
                }
              : {
                  position: 'absolute',
                  left: '24px',
                  bottom: '80px',
                  opacity: 0.82,
                }
          }
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

      {/* Action Buttons Cluster (Right) — Isolated from Camera Touch Rotation */}
      <div
        data-touch-ui="true"
        onTouchStart={stopTouchPropagation}
        onTouchMove={stopTouchPropagation}
        onTouchEnd={stopTouchPropagation}
        onTouchCancel={stopTouchPropagation}
        onMouseDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute bottom-20 right-6 flex flex-col gap-2.5 touch-none"
      >
        {hasBall && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.punch('throw');
            }}
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
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.punch('super');
            }}
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
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.jump();
            }}
            onClick={() => engine?.jump()}
            className="cartoon-btn flex h-11 flex-1 items-center justify-center gap-1 px-3 font-arcade text-[11px]"
          >
            <span>{strings.touchJump}</span>
          </button>
          <button
            type="button"
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.dash();
            }}
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
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.setTouchPunchHeld(true);
              engine?.triggerSmartAction();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              engine?.setTouchPunchHeld(false);
            }}
            onTouchCancel={(e) => {
              e.stopPropagation();
              engine?.setTouchPunchHeld(false);
            }}
            onClick={() => engine?.triggerSmartAction()}
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
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.init();
              engine?.punch('uppercut_right');
            }}
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

