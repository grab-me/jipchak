#include "Comm.h"
#include <ArduinoJson.h>
#include "../config.h"

void CommManager::init() {
    Serial.begin(BAUD_RATE);
    Serial.setTimeout(10);
}

void CommManager::sendStatus(float currentX, float currentY, int currentState) {
    StaticJsonDocument<128> doc;
    doc["t"] = "s";
    doc["x"] = currentX;
    doc["y"] = currentY;
    doc["st"] = currentState;

    serializeJson(doc, Serial);
    Serial.println();
}

CommandType CommManager::receiveCommand() {
    if (Serial.available() > 0) {
        String jsonString = Serial.readStringUntil('\n');
        jsonString.trim();

        StaticJsonDocument<128> doc;
        DeserializationError error = deserializeJson(doc, jsonString);

        if (error) return CMD_NONE;

        const char* type = doc["t"];
        if (type != nullptr && strcmp(type, "c") == 0) {
            targetX = doc["x"];
            targetY = doc["y"];
            return CMD_CATCH;
        }
    }
    return CMD_NONE;
}

float CommManager::getTargetX() const { return targetX; }
float CommManager::getTargetY() const { return targetY; }
