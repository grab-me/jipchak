#include <Servo.h>

Servo myServo;
const int PIN_SERVO = 13;

void setup() {
  Serial.begin(115200);
  
  // attach 하기 전에 미리 0도로 세팅하여 90도로 튀는 기본 동작 방지
  myServo.write(0);
  myServo.attach(PIN_SERVO);

  Serial.println("=== Claw Angle Test (180 Degree Servo) ===");
  Serial.println("Waiting for manual input...");
  Serial.println("Enter an angle (0 ~ 180) to test your claw.");
  Serial.println("Example: Type '145' and press Enter to see the closed state.");
}

void loop() {
  if (Serial.available() > 0) {
    int angle = Serial.parseInt();

    if (angle >= 0 && angle <= 180) {
      Serial.print("Moving to Angle: ");
      Serial.println(angle);
      
      myServo.write(angle);
    } else if (angle != 0) {
      Serial.println("Please enter a valid angle (0~180).");
    }

    while(Serial.available() > 0) {
      char t = Serial.read();
    }
  }
}
