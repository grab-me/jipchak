package com.jipchak.server.service;

import com.jipchak.server.entity.GameLog;
import com.jipchak.server.repository.GameLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class GameLogService {

    private final GameLogRepository gameLogRepository;

    // 영상이 저장될 로컬 경로 (프로젝트 폴더 안의 videos 폴더)
    private final String uploadPath = Paths.get(System.getProperty("user.dir"), "videos").toString();

    public Long saveGameLog(Boolean isSuccess, MultipartFile video) throws IOException {
        // 1. 영상 저장 폴더가 없으면 생성
        File folder = new File(uploadPath);
        if (!folder.exists())
            folder.mkdirs();

        // 2. 오래된 영상 삭제 로직 (상큼이가 말한 자바 처리!)
        deleteOldestVideo();

        // 3. 파일 저장 (이름 중복 방지를 위해 UUID 사용)
        String fileName = UUID.randomUUID() + "_" + video.getOriginalFilename();
        String fullPath = Paths.get(uploadPath, fileName).toString();
        video.transferTo(new File(fullPath));

        // 4. DB에 로그 저장
        GameLog log = GameLog.builder()
                .isSuccess(isSuccess)
                .videoPath(fullPath)
                .qrCodeKey(UUID.randomUUID().toString().substring(0, 8)) // 8자리 랜덤 키
                .build();

        return gameLogRepository.save(log).getId();
    }

    private void deleteOldestVideo() {
        List<GameLog> logs = gameLogRepository.findByVideoPathIsNotNullOrderByCreatedAtAsc();
        if (logs.size() >= 3) {
            GameLog oldest = logs.get(0);
            File file = new File(oldest.getVideoPath());
            if (file.exists())
                file.delete(); // 실제 파일 삭제

            oldest.updateVideoPath(null); // DB 경로 초기화 (엔티티에 메소드 추가 필요!)
        }
    }
}
