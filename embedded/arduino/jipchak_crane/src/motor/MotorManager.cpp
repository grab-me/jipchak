#include "MotorManager.h"
#include "../../config.h"

MotorManager::MotorManager()
    : stepperX(AccelStepper::DRIVER, PIN_STEP_X, PIN_DIR_X),
      stepperY(AccelStepper::DRIVER, PIN_STEP_Y, PIN_DIR_Y),
      stepperZ(AccelStepper::DRIVER, PIN_STEP_Z, PIN_DIR_Z),
      currentState(MOTOR_READY), // 호밍을 사용하려면 MOTOR_HOMING_X 로 변경하세요.
      _onReady(nullptr) {}

void MotorManager::init() {
    pinMode(PIN_ENABLE, OUTPUT);
    digitalWrite(PIN_ENABLE, LOW);

    pinMode(PIN_ENDSTOP_X_LEFT, INPUT_PULLUP);
    pinMode(PIN_ENDSTOP_X_RIGHT, INPUT_PULLUP);
    pinMode(PIN_ENDSTOP_Y_UP, INPUT_PULLUP);
    pinMode(PIN_ENDSTOP_Y_DOWN, INPUT_PULLUP);

    stepperX.setMaxSpeed(MAX_SPEED_X);
    stepperX.setAcceleration(ACCELERATION_X);

    stepperY.setMaxSpeed(MAX_SPEED_Y);
    stepperY.setAcceleration(ACCELERATION_Y);

    stepperZ.setMaxSpeed(MAX_SPEED_Z);
    stepperZ.setAcceleration(ACCELERATION_Z);

    // 호밍을 사용하려면 아래 주석을 해제하세요.
    // stepperX.moveTo(HOMING_TRAVEL_STEPS);
}

void MotorManager::checkLimit(AccelStepper& stepper, int pin, bool checkNegative, LimitAction action) {
    static int prevStates[20] = {HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH};
    static unsigned long lastTriggerTimes[20] = {0};

    int current = digitalRead(pin);
    if (current != prevStates[pin]) {
        if (millis() - lastTriggerTimes[pin] > 50) {
            if (current == LOW) {
                Serial.print("LIMIT SWITCH TRIGGERED: PIN ");
                Serial.println(pin);
            }
            prevStates[pin] = current;
            lastTriggerTimes[pin] = millis();
        }
    }

    if (prevStates[pin] == LOW) {
        if ((checkNegative && stepper.distanceToGo() < 0) || (!checkNegative && stepper.distanceToGo() > 0)) {
            // 1. AccelStepper의 내부 가속도/속도 수학 계산을 완벽하게 초기화(급정지)
            if (action == LimitAction::STOP_AND_RESET_ORIGIN) {
                stepper.setCurrentPosition(0); // 현재 위치를 0으로 리셋하며 가감속 상태도 초기화
                stepper.moveTo(checkNegative ? 5 : -5); // 그 0점에서부터 5스텝 튕겨나옴
            } else {
                long currentPos = stepper.currentPosition();
                stepper.setCurrentPosition(currentPos); // 위치는 그대로 두고 가감속 상태만 초기화
                stepper.moveTo(currentPos + (checkNegative ? 5 : -5)); // 현재 위치에서 5스텝 튕겨나옴
            }
        }
    }
}

bool MotorManager::isReady() const {
    return currentState == MOTOR_READY || currentState == MOTOR_MANUAL;
}

void MotorManager::setManualMode(bool isManual) {
    if (isManual && currentState != MOTOR_MANUAL) {
        currentState = MOTOR_MANUAL;
    } else if (!isManual && currentState == MOTOR_MANUAL) {
        // Stop manuals
        stepperX.setSpeed(0);
        stepperY.setSpeed(0);
        stepperZ.setSpeed(0);

        // 조이스틱 조작(수동 모드)이 끝났을 때, 현재 멈춘 위치를 새로운 목표점(Target)으로 덮어씌움
        // (안 그러면 run()이 이전에 기억하던 0점이나 옛날 목표지점으로 스스로 돌아가려고 함)
        stepperX.moveTo(stepperX.currentPosition());
        stepperY.moveTo(stepperY.currentPosition());
        stepperZ.moveTo(stepperZ.currentPosition());

        currentState = MOTOR_READY;
    }
}

void MotorManager::update() {
    switch (currentState) {
        case MOTOR_HOMING_X:
            stepperX.run();
            if (digitalRead(PIN_ENDSTOP_X_LEFT) == LOW) {
                Serial.println("HOMING X COMPLETE");
                stepperX.stop();
                stepperX.setCurrentPosition(0);
                currentState = MOTOR_HOMING_Y;
                stepperY.moveTo(-HOMING_TRAVEL_STEPS);
            }
            break;

        case MOTOR_HOMING_Y:
            stepperY.run();
            if (digitalRead(PIN_ENDSTOP_Y_UP) == LOW) {
                Serial.println("HOMING Y COMPLETE");
                stepperY.stop();
                stepperY.setCurrentPosition(0);
                currentState = MOTOR_READY;
                if (_onReady) _onReady();
            }
            break;

        case MOTOR_READY:
        case MOTOR_MANUAL:
            checkLimit(stepperX, PIN_ENDSTOP_X_LEFT,  true,  LimitAction::STOP_AND_RESET_ORIGIN);
            checkLimit(stepperX, PIN_ENDSTOP_X_RIGHT, false, LimitAction::STOP_ONLY);
            checkLimit(stepperY, PIN_ENDSTOP_Y_DOWN,  true,  LimitAction::STOP_ONLY);
            checkLimit(stepperY, PIN_ENDSTOP_Y_UP,    false, LimitAction::STOP_AND_RESET_ORIGIN);

            if (currentState == MOTOR_MANUAL) {
                stepperX.run();
                stepperY.run();
                stepperZ.runSpeed();
            } else {
                stepperX.run();
                stepperY.run();
                stepperZ.run();
            }
            break;
    }
}
