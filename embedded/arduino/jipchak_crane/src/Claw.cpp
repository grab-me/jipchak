#include "Claw.h"
#include "../config.h"

void ClawManager::init() {
    servo.attach(PIN_SERVO);
    setIdle();
    isWaiting = false;
}

void ClawManager::update() {
    if (isWaiting && millis() - actionStartTime >= waitDuration) {
        isWaiting = false;
    }
}

void ClawManager::open() {
    servo.write(CLAW_ANGLE_OPEN);
}

void ClawManager::close() {
    servo.write(CLAW_ANGLE_CLOSE);
}

void ClawManager::setIdle() {
    servo.write(CLAW_ANGLE_IDLE);
}

void ClawManager::wait(unsigned long ms) {
    actionStartTime = millis();
    waitDuration = ms;
    isWaiting = true;
}

bool ClawManager::isWaitFinished() const {
    return !isWaiting;
}
