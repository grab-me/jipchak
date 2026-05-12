/**
 * SOUND_ASSETS
 * 시스템에서 사용하는 모든 오디오 에셋의 경로를 관리합니다.
 */
export const SOUND_ASSETS = {
  BGM: {
    MAIN: '/src/assets/sounds/bgm/bgm-main.mp3',
  },
  SFX: {
    CLAW_MOVE: '/src/assets/sounds/sfx/sfx-claw-move.mp3',
    CLAW_FALL: '/src/assets/sounds/sfx/sfx-claw-falling.mp3',
    CLAW_RETURN: '/src/assets/sounds/sfx/sfx-claw-comeback.mp3',
    TRY_CATCH: '/src/assets/sounds/sfx/sfx-try-catch.mp3',
    WIN: '/src/assets/sounds/sfx/sfx-you-win.mp3',
    BUTTON_CLICK: '/src/assets/sounds/sfx/sfx-continue.mp3',
  },
  VOICE: {
    QR_AGREE: '/src/assets/sounds/voice/voice-qr-agree.mp3',
  },
} as const;

export type BgmName = keyof typeof SOUND_ASSETS.BGM;
export type SfxName = keyof typeof SOUND_ASSETS.SFX;
export type VoiceName = keyof typeof SOUND_ASSETS.VOICE;
