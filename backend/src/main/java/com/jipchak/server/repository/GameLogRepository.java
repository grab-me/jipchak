package com.jipchak.server.repository;

import com.jipchak.server.entity.GameLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GameLogRepository extends JpaRepository<GameLog, Long> {
    List<GameLog> findByVideoPathIsNotNullOrderByCreatedAtAsc();
}
