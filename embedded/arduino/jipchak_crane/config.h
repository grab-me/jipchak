#pragma once

// --- UART Communication ---
const unsigned long BAUD_RATE = 115200;

// --- Joystick Pins ---
const int PIN_JOY_Y_DOWN  = A0;
const int PIN_JOY_X_LEFT  = A1;
const int PIN_JOY_Y_UP    = A2;
const int PIN_JOY_X_RIGHT = A3;

// --- Button Pins ---
const int PIN_BTN_MAIN = A4;
const int PIN_BTN_SUB  = A5;

// --- Stepper Motor Pins ---
const int PIN_STEP_X = 2;
const int PIN_DIR_X  = 5;

const int PIN_STEP_Y = 3;
const int PIN_DIR_Y  = 6;

const int PIN_STEP_Z = 4;
const int PIN_DIR_Z  = 7;

const int PIN_ENABLE = 8; // LOW to enable

// --- Limit Switch Pins ---
const int PIN_ENDSTOP_X_LEFT  = 9;
const int PIN_ENDSTOP_X_RIGHT = 10;
const int PIN_ENDSTOP_Y_UP    = 11;
const int PIN_ENDSTOP_Y_DOWN  = 12;

// --- Servo Motor Pins & Angles ---
const int PIN_SERVO = 13;

const int CLAW_ANGLE_OPEN  = 90;
const int CLAW_ANGLE_CLOSE = 0;
const int CLAW_ANGLE_IDLE  = 90;

// --- Stepper Motor Configuration ---
const float MAX_SPEED_X = 400.0;
const float ACCELERATION_X = 500.0;
const float MAX_SPEED_Y = 400.0;
const float ACCELERATION_Y = 500.0;
const float MAX_SPEED_Z = 300.0;
const float ACCELERATION_Z = 50000.0; // Z축 등속도를 위해 가속도 무한대 설정

// Z-axis movement steps
const int Z_MOVE_STEPS_DOWN = 520;
const int Z_MOVE_STEPS_UP = 550;

// --- Conversion & Homing Configuration ---
const float STEPS_PER_MM_X = 80.0f;
const float STEPS_PER_MM_Y = 80.0f;

// --- Homing Travel Steps Configuration ---
const long HOMING_TRAVEL_STEPS_X = -3200;
const long HOMING_TRAVEL_STEPS_Y = 3200;