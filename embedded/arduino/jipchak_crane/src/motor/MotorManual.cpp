#include "MotorManual.h"

MotorManual::MotorManual(MotorManager& manager) : _manager(manager) {}

void MotorManual::setSpeedX(float speed) {
    _manager.setManualMode(true);
    _manager.getStepperX().setSpeed(speed);
}

void MotorManual::setSpeedY(float speed) {
    _manager.setManualMode(true);
    _manager.getStepperY().setSpeed(speed);
}
