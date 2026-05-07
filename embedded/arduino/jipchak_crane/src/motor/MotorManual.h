#pragma once
#include "MotorManager.h"

class MotorManual {
public:
    explicit MotorManual(MotorManager& manager);

    void setSpeedX(float speed);
    void setSpeedY(float speed);

private:
    MotorManager& _manager;
};
