#include <Servo.h>

Servo myServo;
const int PIN_SERVO = 13;

void setup() {
  Serial.begin(115200);
  myServo.attach(PIN_SERVO);
  
  // 1500 입력 시 360도 무한회전 서보라면 '정지'합니다.
  myServo.writeMicroseconds(1500);
  Serial.println("360 Servo Test Ready.");
  Serial.println("Enter a pulse width between 500 and 2500:");
  Serial.println("- If Continuous (무한회전): 1500=Stop, 1000=Left, 2000=Right");
  Serial.println("- If Absolute (절대각도 360): 500=0deg, 1500=180deg, 2500=360deg");
}

void loop() {
  if (Serial.available() > 0) {
    int pulse = Serial.parseInt();
    
    if (pulse >= 500 && pulse <= 2500) {
      Serial.print("Sending Pulse: ");
      Serial.println(pulse);
      myServo.writeMicroseconds(pulse);
    }
    
    while(Serial.available() > 0) {
      char t = Serial.read();
    }
  }
}
