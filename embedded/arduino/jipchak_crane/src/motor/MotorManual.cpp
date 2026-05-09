#include "MotorManual.h"

MotorManual::MotorManual(MotorManager& manager) : _manager(manager) {}

void MotorManual::setSpeedX(float speed) {
    static float prevSpeedX = 0;
    if (speed != prevSpeedX) {
        if (speed > 0) Serial.println("MOTOR X RIGHT (Manual)");
        else if (speed < 0) Serial.println("MOTOR X LEFT (Manual)");
        else Serial.println("MOTOR X STOP (Manual)");
        prevSpeedX = speed;
    }
    _manager.setManualMode(true);
    _manager.getStepperX().setSpeed(speed);
}

void MotorManual::setSpeedY(float speed) {
    static float prevSpeedY = 0;
    if (speed != prevSpeedY) {
        if (speed > 0) Serial.println("MOTOR Y UP (Manual)");
        else if (speed < 0) Serial.println("MOTOR Y DOWN (Manual)");
        else Serial.println("MOTOR Y STOP (Manual)");
        prevSpeedY = speed;
    }
    _manager.setManualMode(true);
    _manager.getStepperY().setSpeed(speed);
}
