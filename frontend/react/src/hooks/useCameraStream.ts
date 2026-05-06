import { useEffect, useRef, useState } from 'react';
import { decode } from '@msgpack/msgpack';

/**
 * AI 서버가 송출하는 카메라 스트림(/ws/stream)을 구독하여,
 * 매 프레임 JPEG 바이트를 ObjectURL 로 변환해 반환한다.
 *
 * - channel: '2d' = 일반 웹캠(color_2d), '3d' = D435 RGB(color_3d)
 * - 자동 재연결: 끊겼을 때 지수 백오프(최대 5초)
 * - 메모리 관리: 이전 ObjectURL 은 다음 프레임이 도착할 때 즉시 revoke
 *
 * 페이로드 스키마 (RPi의 FramePacker 와 일치):
 *   { timestamp, color_2d?: Uint8Array, color_3d?: Uint8Array, depth_3d?, depth_3d_shape? }
 */

type Channel = '2d' | '3d';

interface DecodedPayload {
    color_2d?: Uint8Array;
    color_3d?: Uint8Array;
    timestamp?: number | bigint;
}

export interface CameraStreamState {
    /** 가장 최근 프레임의 blob URL. 아직 한 프레임도 안 왔으면 null. */
    frameUrl: string | null;
    /** WebSocket 연결 상태. */
    connected: boolean;
}

/**
 * 환경에 따라 ws URL 을 결정한다.
 *  - VITE_WS_STREAM_PATH 가 절대 URL 이면 그대로 사용
 *  - 상대 경로(/ws/stream)면 현재 origin 에 붙여 ws[s]:// 로 변환
 */
function resolveWsUrl(): string {
    const path = (import.meta.env.VITE_WS_STREAM_PATH as string | undefined) ?? '/ws/stream';
    if (/^wss?:\/\//.test(path)) return path;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${path}`;
}

export function useCameraStream(channel: Channel): CameraStreamState {
    const [frameUrl, setFrameUrl] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    // ObjectURL 누수 방지용: 직전 URL 을 보관해두고 다음 프레임 도착 시 revoke
    const prevUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const url = resolveWsUrl();
        let ws: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let backoffMs = 500;
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;

            ws = new WebSocket(url);
            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                setConnected(true);
                backoffMs = 500; // 성공 시 백오프 리셋
            };

            ws.onmessage = (event) => {
                if (!(event.data instanceof ArrayBuffer)) return;

                let payload: DecodedPayload;
                try {
                    payload = decode(new Uint8Array(event.data)) as DecodedPayload;
                } catch (e) {
                    // 깨진 프레임은 조용히 무시 (다음 프레임이 곧 도착)
                    return;
                }

                const jpegBytes = channel === '2d' ? payload.color_2d : payload.color_3d;
                if (!jpegBytes || jpegBytes.length === 0) return;

                // Uint8Array<ArrayBufferLike> → 새 ArrayBuffer 로 복사하여
                // BlobPart 타입 호환성 확보 (TS 5.7+ 의 엄격 generic).
                const ab = new ArrayBuffer(jpegBytes.byteLength);
                new Uint8Array(ab).set(jpegBytes);
                const blob = new Blob([ab], { type: 'image/jpeg' });
                const next = URL.createObjectURL(blob);

                // 이전 URL 즉시 해제 → 메모리 누적 방지
                if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
                prevUrlRef.current = next;

                setFrameUrl(next);
            };

            ws.onerror = () => {
                // close 가 뒤이어 호출되므로 여기서는 로깅만
            };

            ws.onclose = () => {
                setConnected(false);
                if (cancelled) return;
                // 지수 백오프 재연결 (최대 5초)
                reconnectTimer = setTimeout(connect, backoffMs);
                backoffMs = Math.min(backoffMs * 2, 5000);
            };
        };

        connect();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
            if (prevUrlRef.current) {
                URL.revokeObjectURL(prevUrlRef.current);
                prevUrlRef.current = null;
            }
        };
    }, [channel]);

    return { frameUrl, connected };
}
