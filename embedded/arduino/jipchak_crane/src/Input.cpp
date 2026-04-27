#include "Input.h"
#include "../config.h"

void InputManager::init() {
    pinMode(PIN_JOY_Y_UP,    INPUT_PULLUP);
    pinMode(PIN_JOY_Y_DOWN,  INPUT_PULLUP);
    pinMode(PIN_JOY_X_LEFT,  INPUT_PULLUP);
    pinMode(PIN_JOY_X_RIGHT, INPUT_PULLUP);

    pinMode(PIN_BTN_MAIN, INPUT_PULLUP);
    pinMode(PIN_BTN_SUB,  INPUT_PULLUP);

    prevBtnMain = HIGH;
    prevBtnSub = HIGH;
}

int InputManager::getJoystickX() {
    if (digitalRead(PIN_JOY_X_LEFT) == LOW) return -1;
    if (digitalRead(PIN_JOY_X_RIGHT) == LOW) return 1;
    return 0;
}

int InputManager::getJoystickY() {
    if (digitalRead(PIN_JOY_Y_DOWN) == LOW) return -1;
    if (digitalRead(PIN_JOY_Y_UP) == LOW) return 1;
    return 0;
}

bool InputManager::isBtnMainPressed() {
    bool current = digitalRead(PIN_BTN_MAIN);
    bool pressed = (prevBtnMain == HIGH && current == LOW);
    prevBtnMain = current;
    return pressed;
}

bool InputManager::isBtnSubPressed() {
    bool current = digitalRead(PIN_BTN_SUB);
    bool pressed = (prevBtnSub == HIGH && current == LOW);
    prevBtnSub = current;
    return pressed;
}
