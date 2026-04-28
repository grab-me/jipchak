#include "MotorAuto.h"
#include "../../config.h"

MotorAuto::MotorAuto(MotorManager& manager) : _manager(manager) {}

void MotorAuto::setTarget(float xMm, float yMm) {
    _manager.getStepperX().moveTo(static_cast<long>(xMm * STEPS_PER_MM_X));
    _manager.getStepperY().moveTo(static_cast<long>(yMm * STEPS_PER_MM_Y));
}

void MotorAuto::moveZ(int steps) {
    _manager.getStepperZ().move(steps);
}

bool MotorAuto::isReachedTarget() const {
    return _manager.getStepperX().distanceToGo() == 0 && _manager.getStepperY().distanceToGo() == 0;
}

bool MotorAuto::isZReachedTarget() const {
    return _manager.getStepperZ().distanceToGo() == 0;
}
