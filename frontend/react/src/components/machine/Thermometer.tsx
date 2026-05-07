import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface ThermometerProps {
  probability: number; // 0 ~ 100
}

/**
 * Thermometer
 * 완전한 Absolute Positioning을 사용하여 기둥과 구슬의 위치를 픽셀 단위로 정확히 고정하고,
 * Flexbox 버그 없이 액체가 바닥에 완벽히 밀착되도록 강제한 최종 무결점 버전
 */
const Thermometer = ({ probability }: ThermometerProps) => {
  const animatedValue = useMotionValue(0);

  useEffect(() => {
    const controls = animate(animatedValue, probability, {
      type: 'spring',
      stiffness: 60,
      damping: 15,
      mass: 1,
    });
    return controls.stop;
  }, [probability, animatedValue]);

  const heightPercent = useTransform(animatedValue, [0, 100], ['0%', '90%']);

  const fluidColor = useTransform(
    animatedValue,
    [0, 30, 60, 90],
    ['#3b82f6', '#22c55e', '#eab308', '#ef4444']
  );

  const bulbSize = "clamp(35px,4.5vw,70px)";
  // 유리관의 순수 벽 두께와 액체 사이의 여백을 통합 관리합니다.
  const glassBorderWidth = "clamp(2.5px,0.4vw,5px)"; 
  const liquidInset = "clamp(3px,0.4vw,6px)"; // 유리관 안쪽에서 액체까지의 거리

  // 유지보수를 위한 기둥 너비 설정 (현재 사용자님이 설정하신 67% 반영)
  const tubeWidthPct = 67;
  const bulbRightPct = -(100 - tubeWidthPct); // 기둥 왼쪽 라인에 맞춘 구슬 오프셋 (-33%)

  // 기둥의 바닥 위치 (구슬 높이의 75% 지점)
  const tubeBottom = `calc(${bulbSize} * 0.75)`;

  return (
    <div 
      className="absolute right-0 bottom-[4%] h-[92%] w-[clamp(35px,4.5vw,70px)] z-overlay pointer-events-none select-none drop-shadow-lg"
      onContextMenu={(e) => e.preventDefault()} // [컨벤션 147] 우클릭 방지
    >
      
      {/* --- 구슬 유리관 테두리 (기둥 너비에 따라 자동 정렬) --- */}
      <div
        className="absolute bg-white rounded-full border-crayon-line"
        style={{ 
          width: `calc(100% + ((${liquidInset} + ${glassBorderWidth}) * 2))`,
          aspectRatio: '1 / 1',
          right: `calc(${bulbRightPct}% - (${liquidInset} + ${glassBorderWidth}))`,
          bottom: `calc(-1% - (${liquidInset} + ${glassBorderWidth}))`,
          borderWidth: glassBorderWidth,
          zIndex: 0 
        }}
      />

      {/* 2. 구슬 영역 액체 (기둥 너비 변화에도 정렬 보존) */}
      <div
        className="absolute bottom-[-1%]"
        style={{ 
          right: `${bulbRightPct}%`,
          width: '100%',
          aspectRatio: '1 / 1',
          zIndex: 5 
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: fluidColor }}
        />
      </div>

      {/* 1. 기둥 (Tube) */}
      <div
        className="absolute top-0 right-0 bg-white rounded-tl-full border-crayon-line overflow-hidden"
        style={{
          width: `${tubeWidthPct}%`,
          borderWidth: glassBorderWidth,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          bottom: tubeBottom,
          zIndex: 10
        }}
      >
        {/* 눈금 표시 */}
        <div className="absolute inset-y-0 left-0 w-[45%] flex flex-col justify-between py-[20%] opacity-40 z-20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-[clamp(1px,0.2vw,2.5px)] bg-crayon-line w-full rounded-r-full" />
          ))}
        </div>

        {/* 기둥 내부 액체 (구슬 액체와 동일한 인셋 적용) */}
        <div
          className="absolute z-10"
          style={{
            top: liquidInset,
            left: liquidInset,
            right: 0,
            bottom: 0,
          }}
        >
          <motion.div
            className="absolute left-0 right-0 bottom-0 rounded-t-full origin-bottom"
            style={{ height: heightPercent, backgroundColor: fluidColor }}
          />
        </div>
      </div>

    </div>
  );
};

export default Thermometer;
