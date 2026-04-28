#include "MotorManager.h"
#include "../../config.h"

MotorManager::MotorManager()
    : stepperX(AccelStepper::DRIVER, PIN_STEP_X, PIN_DIR_X),
      stepperY(AccelStepper::DRIVER, PIN_STEP_Y, PIN_DIR_Y),
      stepperZ(AccelStepper::DRIVER, PIN_STEP_Z, PIN_DIR_Z),
      currentState(MOTOR_HOMING_X),
      _onReady(nullptr) {}

void MotorManager::init() {
    pinMode(PIN_ENABLE, OUTPUT);
    digitalWrite(PIN_ENABLE, LOW);

    pinMode(PIN_ENDSTOP_X_LEFT, INPUT);
    pinMode(PIN_ENDSTOP_X_RIGHT, INPUT);
    pinMode(PIN_ENDSTOP_Y_UP, INPUT);
    pinMode(PIN_ENDSTOP_Y_DOWN, INPUT);

    stepperX.setMaxSpeed(MAX_SPEED_X);
    stepperX.setAcceleration(ACCELERATION_X);

    stepperY.setMaxSpeed(MAX_SPEED_Y);
    stepperY.setAcceleration(ACCELERATION_Y);

    stepperZ.setMaxSpeed(MAX_SPEED_Z);
    stepperZ.setAcceleration(ACCELERATION_Z);

    stepperX.moveTo(HOMING_TRAVEL_STEPS);
}

void MotorManager::checkLimit(AccelStepper& stepper, int pin, bool checkNegative, LimitAction action) {
    if (digitalRead(pin) == LOW) {
        if ((checkNegative && stepper.speed() < 0) || (!checkNegative && stepper.speed() > 0)) {
            stepper.stop();
            if (action == LimitAction::STOP_AND_RESET_ORIGIN) {
                stepper.setCurrentPosition(0);
            }
        }
    }
}

bool MotorManager::isReady() const {
    return currentState == MOTOR_READY || currentState == MOTOR_MANUAL;
}

void MotorManager::setManualMode(bool isManual) {
    if (isReady()) {
        // 수동 -> 자동 전환 시, 모터 튕김 방지
        if (!isManual && currentState == MOTOR_MANUAL) {
            stepperX.moveTo(stepperX.currentPosition());
            stepperY.moveTo(stepperY.currentPosition());
            stepperZ.moveTo(stepperZ.currentPosition());
        }
        currentState = isManual ? MOTOR_MANUAL : MOTOR_READY;
    }
}

void MotorManager::update() {
    switch (currentState) {
        case MOTOR_HOMING_X:
            stepperX.run();
            if (digitalRead(PIN_ENDSTOP_X_LEFT) == LOW) {
                stepperX.stop();
                stepperX.setCurrentPosition(0);
                currentState = MOTOR_HOMING_Y;
                stepperY.moveTo(HOMING_TRAVEL_STEPS);
            }
            break;

        case MOTOR_HOMING_Y:
            stepperY.run();
            if (digitalRead(PIN_ENDSTOP_Y_DOWN) == LOW) {
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
            checkLimit(stepperY, PIN_ENDSTOP_Y_DOWN,  true,  LimitAction::STOP_AND_RESET_ORIGIN);
            checkLimit(stepperY, PIN_ENDSTOP_Y_UP,    false, LimitAction::STOP_ONLY);

            if (currentState == MOTOR_MANUAL) {
                stepperX.runSpeed();
                stepperY.runSpeed();
                stepperZ.runSpeed();
            } else {
                stepperX.run();
                stepperY.run();
                stepperZ.run();
            }
            break;
    }
}
