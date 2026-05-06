#pragma once
#include <Arduino.h>

enum CommandType {
    CMD_NONE = 0,
    CMD_CATCH = 1
};

class CommManager {
private:
    float targetX;
    float targetY;

public:
    void init();
    void sendStatus(float currentX, float currentY, int currentState);
    CommandType receiveCommand();
    float getTargetX() const;
    float getTargetY() const;
};
