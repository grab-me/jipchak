#include <AccelStepper.h>
#include <Servo.h>

// --- Pins ---
const int PIN_BTN_MAIN = A4;
const int PIN_STEP_Z = 4;
const int PIN_DIR_Z = 7;
const int PIN_ENABLE = 8;
const int PIN_SERVO = 13;

// --- Config ---
const int CLAW_ANGLE_OPEN  = 90;
const int CLAW_ANGLE_CLOSE = 145;
const int Z_MOVE_STEPS = 650; // Z축 총 하강 스텝 수
const float MAX_SPEED_Z = 300.0;
const float ACCELERATION_Z = 50000.0; // 등속도를 위한 무한대 가속도

AccelStepper stepperZ(AccelStepper::DRIVER, PIN_STEP_Z, PIN_DIR_Z);
Servo clawServo;

// --- State Machine ---
enum State {
    IDLE,
    SEQ_OPEN,
    SEQ_DOWN,
    SEQ_WAIT_BOTTOM,
    SEQ_GRAB,
    SEQ_UP
};

State currentState = IDLE;
unsigned long stateStartTime = 0;

void setup() {
    Serial.begin(115200);
    pinMode(PIN_BTN_MAIN, INPUT_PULLUP);
    
    pinMode(PIN_ENABLE, OUTPUT);
    digitalWrite(PIN_ENABLE, LOW); // 모터 활성화

    stepperZ.setMaxSpeed(MAX_SPEED_Z);
    stepperZ.setAcceleration(ACCELERATION_Z);

    clawServo.attach(PIN_SERVO);
    clawServo.write(CLAW_ANGLE_CLOSE); // 처음엔 닫힌 상태로 대기

    Serial.println("=== Crane Auto Sequence Test ===");
    Serial.println("Press A4 to start the sequence.");
}

void loop() {
    stepperZ.run(); // 지속적인 스텝퍼 제어를 위해 항상 호출

    switch (currentState) {
        case IDLE:
            if (digitalRead(PIN_BTN_MAIN) == LOW) {
                delay(50); // 간단한 버튼 디바운스
                if (digitalRead(PIN_BTN_MAIN) == LOW) {
                    Serial.println("1. Sequence Started: Opening Claw...");
                    clawServo.write(CLAW_ANGLE_OPEN);
                    stateStartTime = millis();
                    currentState = SEQ_OPEN;
                }
            }
            break;

        case SEQ_OPEN:
            // 집게가 열릴 때까지 0.5초 대기 후 하강 시작
            if (millis() - stateStartTime >= 500) {
                Serial.println("2. Claw Opened. Moving Z Down...");
                stepperZ.move(Z_MOVE_STEPS); // Z_MOVE_STEPS 만큼 하강
                currentState = SEQ_DOWN;
            }
            break;

        case SEQ_DOWN:
            // 하강이 완료되면 바닥에서 0.5초 대기
            if (stepperZ.distanceToGo() == 0) {
                Serial.println("3. Z Reached Bottom. Waiting 0.5s...");
                stateStartTime = millis();
                currentState = SEQ_WAIT_BOTTOM;
            }
            break;

        case SEQ_WAIT_BOTTOM:
            if (millis() - stateStartTime >= 500) {
                Serial.println("4. Closing Claw...");
                clawServo.write(CLAW_ANGLE_CLOSE);
                stateStartTime = millis();
                currentState = SEQ_GRAB;
            }
            break;

        case SEQ_GRAB:
            // 인형을 꽉 잡기 위해 1초 대기 후 상승 시작
            if (millis() - stateStartTime >= 1000) {
                Serial.println("5. Claw Closed. Moving Z Up...");
                stepperZ.move(-Z_MOVE_STEPS); // 다시 원래 위치로 상승
                currentState = SEQ_UP;
            }
            break;

        case SEQ_UP:
            // 끝까지 다 올라오면 다시 대기 상태로 복귀
            if (stepperZ.distanceToGo() == 0) {
                Serial.println("6. Sequence Completed. Returning to IDLE.");
                currentState = IDLE;
            }
            break;
    }
}
