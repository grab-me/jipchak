#include "StateMachine.h"
#include "../config.h"

/**
 * 게임 한 판 흐름:
 *   IDLE → READY (빨간) → PLAYING (빨간) → 집기 시퀀스 → POST_GAME → 다음판 or 세션 종료
 *
 * 캠 lifecycle (RPi 가 관리):
 *   IDLE: 카메라 OFF (발열 보호)
 *   READY 이상: 카메라 ON
 */

StateMachine::StateMachine(
    CommManager* c, MotorManager* m, MotorAuto* ma,
    MotorManual* mm, ClawManager* cl, InputManager* in)
    : comm(c), motor(m), motorAuto(ma), motorManual(mm),
      claw(cl), input(in),
      currentState(IDLE),
      lastStatusTime(0),
      playStartTime(0),
      subState(0) {}

void StateMachine::init() {
    motor->init();
    claw->init();
    input->init();
}

bool StateMachine::isPlayingTimeout() const {
    return (millis() - playStartTime) >= PLAY_TIMEOUT_MS;
}

void StateMachine::startGrabSequence() {
    // 조이스틱 잔재 제거 (manual mode → ready)
    motorManual->setDirectionX(0);
    motorManual->setDirectionY(0);
    motor->setManualMode(false);

    motorAuto->moveZ(-Z_MOVE_STEPS_DOWN);
    currentState = GRAB_DOWN;
}

void StateMachine::update() {
    // 100ms 마다 RPi 에 현재 위치 + state 송신
    if (millis() - lastStatusTime >= 100) {
        comm->sendStatus(
            motor->getStepperX().currentPosition() / STEPS_PER_MM_X,
            motor->getStepperY().currentPosition() / STEPS_PER_MM_Y,
            currentState);
        lastStatusTime = millis();
    }

    motor->update();
    claw->update();

    switch (currentState) {
    // ────────────────────────────────────────
    // 1. IDLE — 캠 OFF, 빨간(1) 누름 대기
    // ────────────────────────────────────────
    case IDLE:
        if (input->isBtnMainPressed()) {
            currentState = READY;
        }
        break;

    // ────────────────────────────────────────
    // 2. READY — 캠 ON, 빨간(2) 누름 대기 (게임 시작)
    // ────────────────────────────────────────
    case READY:
        if (input->isBtnMainPressed()) {
            // 게임 시작. PLAYING 진입 시 배출구(좌하단)로 자동 복귀.
            // 정확히 (0,0) 으로 두면 endstop chatter 에서 checkLimit 가 무한 트리거됨.
            motorAuto->setTarget(DROP_OFF_X_MM, DROP_OFF_Y_MM);
            playStartTime = millis();
            currentState = PLAYING;
        }
        break;

    // ────────────────────────────────────────
    // 3. PLAYING — 조이스틱 자유 이동 + 15초 타이머
    //              파란 누름 또는 타이머 만료 → 집기 시퀀스
    // ────────────────────────────────────────
    case PLAYING:
        if (!motor->isReady()) break;
        handleManualInput();

        if (input->isBtnSubPressed() || isPlayingTimeout()) {
            startGrabSequence();
        }
        break;

    // ────────────────────────────────────────
    // 4. GRAB_DOWN → GRAB_CLOSE → GRAB_UP : 집기 시퀀스
    // ────────────────────────────────────────
    case GRAB_DOWN:
        if (motorAuto->isZReachedTarget()) {
            claw->close();
            claw->wait(1000);   // 1초 동안 잡은 채로 유지
            currentState = GRAB_CLOSE;
        }
        break;

    case GRAB_CLOSE:
        if (claw->isWaitFinished()) {
            motorAuto->moveZ(Z_MOVE_STEPS_UP);
            currentState = GRAB_UP;
        }
        break;

    case GRAB_UP:
        if (motorAuto->isZReachedTarget()) {
            // 배출구로 이동 (endstop chatter 회피 위해 정확히 0 이 아닌 1mm 안쪽).
            motorAuto->setTarget(DROP_OFF_X_MM, DROP_OFF_Y_MM);
            currentState = RETURN_MOVE;
        }
        break;

    // ────────────────────────────────────────
    // 5. RETURN_MOVE → RETURN_DOWN → RETURN_OPEN → RETURN_UP : 배출구에서 인형 놓기
    // ────────────────────────────────────────
    case RETURN_MOVE:
        if (motorAuto->isReachedTarget()) {
            motorAuto->moveZ(-Z_MOVE_STEPS_DOWN);
            currentState = RETURN_DOWN;
        }
        break;

    case RETURN_DOWN:
        if (motorAuto->isZReachedTarget()) {
            claw->open();
            claw->wait(500);
            currentState = RETURN_OPEN;
        }
        break;

    case RETURN_OPEN:
        if (claw->isWaitFinished()) {
            motorAuto->moveZ(Z_MOVE_STEPS_UP);
            currentState = RETURN_UP;
        }
        break;

    case RETURN_UP:
        if (motorAuto->isZReachedTarget()) {
            currentState = POST_GAME;
        }
        break;

    // ────────────────────────────────────────
    // 6. POST_GAME — 한 판 종료. 빨간=다음 판, 파란=세션 종료
    // ────────────────────────────────────────
    case POST_GAME:
        if (input->isBtnMainPressed()) {
            // 다음 판 시작 — PLAYING 진입 (이미 0,0 에 있음)
            playStartTime = millis();
            currentState = PLAYING;
        } else if (input->isBtnSubPressed()) {
            // 세션 종료 → 캠 OFF
            currentState = IDLE;
        }
        break;
    }
}

void StateMachine::handleManualInput() {
    int xDir = input->getJoystickX();
    int yDir = input->getJoystickY();

    if (xDir != 0 || yDir != 0) {
        motorManual->setDirectionX(xDir);
        motorManual->setDirectionY(yDir);
    } else {
        motorManual->setDirectionX(0);
        motorManual->setDirectionY(0);
        // setDirectionX(0) 내부에서 stop + setManualMode(false) 호출됨.
        // 여기서 추가로 호출하지 않아 자동 모드 target 이 보존되도록 한다.
    }
}
