#include "StateMachine.h"
#include "../config.h"

StateMachine::StateMachine(
    CommManager* c, MotorManager* m, MotorAuto* ma,
    MotorManual* mm, ClawManager* cl, InputManager* in)
    : comm(c), motor(m), motorAuto(ma), motorManual(mm),
      claw(cl), input(in), currentState(IDLE), lastStatusTime(0), subState(0) {}

void StateMachine::init() {
    motor->init();
    claw->init();
    input->init();
}

void StateMachine::update() {
    if (millis() - lastStatusTime >= 100) {
        comm->sendStatus(
            motor->getStepperX().currentPosition() / STEPS_PER_MM_X,
            motor->getStepperY().currentPosition() / STEPS_PER_MM_Y,
            currentState);
        lastStatusTime = millis();
    }

    motor->update();
    claw->update();

    CommandType cmd = comm->receiveCommand();

    switch (currentState) {
    case IDLE:
        if (!motor->isReady()) break; // 호밍 완료 대기

        handleManualInput();

        if (cmd == CMD_CATCH) {
            motorAuto->setTarget(comm->getTargetX(), comm->getTargetY());
            currentState = AUTO_SEQ_MOVE;
            subState = 0;
        } else if (input->isBtnMainPressed()) {
            motorAuto->moveZ(Z_MOVE_STEPS); // 하강
            currentState = SEQ_DOWN;
            subState = 0;
        } else if (input->isBtnSubPressed()) {
            claw->open();
            claw->wait(800);
            subState = 100;
        }

        if (subState == 100 && claw->isWaitFinished()) {
            claw->close();
            subState = 0;
        }
        break;

    case AUTO_SEQ_MOVE:
        if (motorAuto->isReachedTarget()) {
            motorAuto->moveZ(Z_MOVE_STEPS); // 하강
            currentState = AUTO_SEQ_DOWN;
        }
        break;

    case AUTO_SEQ_DOWN:
    case SEQ_DOWN:
        if (motorAuto->isZReachedTarget()) {
            claw->open();
            claw->wait(500);
            currentState = (currentState == AUTO_SEQ_DOWN) ? AUTO_SEQ_GRAB : SEQ_GRAB;
        }
        break;

    case AUTO_SEQ_GRAB:
    case SEQ_GRAB:
        if (claw->isWaitFinished() && subState == 0) {
            claw->close();
            claw->wait(1000);
            subState = 1;
        } else if (claw->isWaitFinished() && subState == 1) {
            motorAuto->moveZ(-Z_MOVE_STEPS); // 상승
            currentState = (currentState == AUTO_SEQ_GRAB) ? AUTO_SEQ_UP : SEQ_UP;
            subState = 0;
        }
        break;

    case AUTO_SEQ_UP:
    case SEQ_UP:
        if (motorAuto->isZReachedTarget()) {
            if (currentState == AUTO_SEQ_UP) {
                motorAuto->setTarget(0.0f, 0.0f); // 원점 복귀
                currentState = AUTO_SEQ_RETURN;
            } else {
                currentState = IDLE;
            }
        }
        break;

    case AUTO_SEQ_RETURN:
        if (motorAuto->isReachedTarget()) {
            claw->open();
            currentState = IDLE;
        }
        break;
    }
}

void StateMachine::handleManualInput() {
    int xDir = input->getJoystickX();
    int yDir = input->getJoystickY();

    if (xDir != 0 || yDir != 0) {
        motorManual->setSpeedX(xDir * MAX_SPEED_X);
        motorManual->setSpeedY(yDir * MAX_SPEED_Y);
    } else {
        motor->setManualMode(false);
    }
}
