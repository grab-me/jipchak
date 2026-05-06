package com.jipchak.server.controller;

import com.jipchak.server.service.GameLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameLogController {

    private final GameLogService gameLogService;

    @PostMapping("/log")
    public ResponseEntity<String> createGameLog(
            @RequestParam("isSuccess") Boolean isSuccess,
            @RequestParam("video") MultipartFile video) {
        try {
            Long logId = gameLogService.saveGameLog(isSuccess, video);
            return ResponseEntity.ok("게임 로그 저장 완료! ID: " + logId);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("저장 실패: " + e.getMessage());
        }
    }
}