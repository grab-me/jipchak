#include <AccelStepper.h>

// --- Joystick & Button Pins ---
const int PIN_JOY_Y_DOWN  = A0;
const int PIN_JOY_X_LEFT  = A1;
const int PIN_JOY_Y_UP    = A2;
const int PIN_JOY_X_RIGHT = A3;
const int PIN_BTN_MAIN    = A4;
const int PIN_BTN_SUB     = A5;

// --- Stepper Pins ---
const int PIN_STEP_X = 2; const int PIN_DIR_X = 5;
const int PIN_STEP_Y = 3; const int PIN_DIR_Y = 6;
const int PIN_STEP_Z = 4; const int PIN_DIR_Z = 7;
const int PIN_ENABLE = 8;

// --- Limit Switch Pins ---
const int PIN_ENDSTOP_X_LEFT  = 9;
const int PIN_ENDSTOP_X_RIGHT = 10;
const int PIN_ENDSTOP_Y_UP    = 11;
const int PIN_ENDSTOP_Y_DOWN  = 12;

AccelStepper stepperX(AccelStepper::DRIVER, PIN_STEP_X, PIN_DIR_X);
AccelStepper stepperY(AccelStepper::DRIVER, PIN_STEP_Y, PIN_DIR_Y);
AccelStepper stepperZ(AccelStepper::DRIVER, PIN_STEP_Z, PIN_DIR_Z);

long prevPosX = 0, prevPosY = 0, prevPosZ = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_JOY_Y_UP, INPUT_PULLUP);
  pinMode(PIN_JOY_Y_DOWN, INPUT_PULLUP);
  pinMode(PIN_JOY_X_LEFT, INPUT_PULLUP);
  pinMode(PIN_JOY_X_RIGHT, INPUT_PULLUP);
  pinMode(PIN_BTN_MAIN, INPUT_PULLUP);
  pinMode(PIN_BTN_SUB, INPUT_PULLUP);

  pinMode(PIN_ENDSTOP_X_LEFT, INPUT_PULLUP);
  pinMode(PIN_ENDSTOP_X_RIGHT, INPUT_PULLUP);
  pinMode(PIN_ENDSTOP_Y_UP, INPUT_PULLUP);
  pinMode(PIN_ENDSTOP_Y_DOWN, INPUT_PULLUP);

  pinMode(PIN_ENABLE, OUTPUT);
  digitalWrite(PIN_ENABLE, LOW); // 모터 활성화

  // 가속도(Acceleration)에 의해 속도가 점진적으로 올라가지만, 
  // setMaxSpeed로 설정한 '최대 속도'를 절대 넘지 않습니다.
  // 너무 빠르다면 이 MaxSpeed 값을 줄이시면 됩니다. (현재 400으로 하향 조정)
  stepperX.setMaxSpeed(400); stepperX.setAcceleration(500);
  stepperY.setMaxSpeed(400); stepperY.setAcceleration(500);
  // Z축은 가감속 없이 일정한 저속으로 움직이도록 가속도를 높게(또는 무의미하게) 설정 (기존 200 -> 300으로 1.5배 상향)
  stepperZ.setMaxSpeed(300); stepperZ.setAcceleration(2000);

  Serial.println("=== Stepper Calibration Tool ===");
  Serial.println("1. Manual Jog (수동 조작):");
  Serial.println("   - Joystick: Move X, Y axis");
  Serial.println("   - Main Button(A4): Z Down, Sub Button(A5): Z Up");
  Serial.println("2. Serial Commands (시리얼 명령어):");
  Serial.println("   - 'X1000' -> X축 1000스텝 이동");
  Serial.println("   - 'Y-500' -> Y축 -500스텝 이동");
  Serial.println("   - 'Z650'  -> Z축 650스텝 이동");
  Serial.println("================================");
}

void loop() {
  // 1. 수동 조작 (X, Y는 가감속 제어, Z는 등속도 제어)
  static int lastDirX = 0, lastDirY = 0;
  int dirX = 0, dirY = 0;
  float speedZ = 0;
  
  if (digitalRead(PIN_JOY_X_LEFT) == LOW) dirX = -1;
  else if (digitalRead(PIN_JOY_X_RIGHT) == LOW) dirX = 1;

  if (digitalRead(PIN_JOY_Y_DOWN) == LOW) dirY = -1;
  else if (digitalRead(PIN_JOY_Y_UP) == LOW) dirY = 1;

  // Z축은 가감속 없이 일정한 속도(300)로 즉시 움직임
  if (digitalRead(PIN_BTN_MAIN) == LOW) speedZ = 300; // Z 하강 (+)
  else if (digitalRead(PIN_BTN_SUB) == LOW) speedZ = -300; // Z 상승 (-)

  // X축 상태 변화 감지 및 가감속 명령
  if (dirX != lastDirX) {
    if (dirX == -1) stepperX.move(-1000000);
    else if (dirX == 1) stepperX.move(1000000);
    else stepperX.stop(); // 부드럽게 감속하여 정지
    lastDirX = dirX;
  }

  // X축 리미트 스위치 충돌 감지 (충돌 시 즉시 정지 후 반대 방향으로 5스텝 부드럽게 이동)
  if (digitalRead(PIN_ENDSTOP_X_LEFT) == LOW && stepperX.distanceToGo() < 0) {
    stepperX.setCurrentPosition(0); // 0점(원점)으로 리셋하며 가속도 타이머도 초기화
    stepperX.moveTo(5); // 0점에서부터 5스텝 튕겨나옴
    Serial.println("X LEFT LIMIT TRIGGERED! Origin Reset to 0. Bouncing back...");
  }
  if (digitalRead(PIN_ENDSTOP_X_RIGHT) == LOW && stepperX.distanceToGo() > 0) {
    long curX = stepperX.currentPosition();
    stepperX.setCurrentPosition(curX);
    stepperX.moveTo(curX - 5);
    Serial.println("X RIGHT LIMIT TRIGGERED! Bouncing back...");
  }
  stepperX.run();

  // Y축 상태 변화 감지 및 가감속 명령
  if (dirY != lastDirY) {
    if (dirY == -1) stepperY.move(-1000000);
    else if (dirY == 1) stepperY.move(1000000);
    else stepperY.stop();
    lastDirY = dirY;
  }

  // Y축 리미트 스위치 충돌 감지
  if (digitalRead(PIN_ENDSTOP_Y_DOWN) == LOW && stepperY.distanceToGo() < 0) {
    stepperY.setCurrentPosition(0); // 0점(원점)으로 리셋하며 가속도 타이머도 초기화
    stepperY.moveTo(5); // 0점에서부터 5스텝 튕겨나옴
    Serial.println("Y DOWN LIMIT TRIGGERED! Origin Reset to 0. Bouncing back...");
  }
  if (digitalRead(PIN_ENDSTOP_Y_UP) == LOW && stepperY.distanceToGo() > 0) {
    long curY = stepperY.currentPosition();
    stepperY.setCurrentPosition(curY);
    stepperY.moveTo(curY - 5);
    Serial.println("Y UP LIMIT TRIGGERED! Bouncing back...");
  }
  stepperY.run();

  // Z축 상태 변화 감지 및 등속도 명령
  static bool wasJoggingZ = false;
  if (speedZ != 0) {
    stepperZ.setSpeed(speedZ);
    stepperZ.runSpeed();
    wasJoggingZ = true;
  } else {
    if (wasJoggingZ) {
      stepperZ.setSpeed(0);
      stepperZ.moveTo(stepperZ.currentPosition());
      wasJoggingZ = false;
    }
    stepperZ.run(); // 시리얼 명령(Z650 등)으로 조작할 때를 대비해 run() 유지
  }

  // 2. 조작이 끝나고 완전히 멈춘 후 누적 스텝 수 출력
  if (dirX == 0 && stepperX.distanceToGo() == 0 && prevPosX != stepperX.currentPosition()) {
    Serial.print("[X] Current Position: "); Serial.println(stepperX.currentPosition());
    prevPosX = stepperX.currentPosition();
  }
  if (dirY == 0 && stepperY.distanceToGo() == 0 && prevPosY != stepperY.currentPosition()) {
    Serial.print("[Y] Current Position: "); Serial.println(stepperY.currentPosition());
    prevPosY = stepperY.currentPosition();
  }
  if (speedZ == 0 && stepperZ.distanceToGo() == 0 && prevPosZ != stepperZ.currentPosition()) {
    Serial.print("[Z] Current Position: "); Serial.println(stepperZ.currentPosition());
    prevPosZ = stepperZ.currentPosition();
  }

  // 3. 시리얼 창에서 명령어 입력 받기 (ex: X1000)
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim(); // 공백 및 줄바꿈 제거
    if (input.length() > 0) {
      char axis = input.charAt(0);
      long steps = input.substring(1).toInt();
      
      if (axis == 'X' || axis == 'x') {
        stepperX.move(steps);
        Serial.print("Command: Move X by "); Serial.println(steps);
      } else if (axis == 'Y' || axis == 'y') {
        stepperY.move(steps);
        Serial.print("Command: Move Y by "); Serial.println(steps);
      } else if (axis == 'Z' || axis == 'z') {
        stepperZ.move(steps);
        Serial.print("Command: Move Z by "); Serial.println(steps);
      }
    }
  }
}
