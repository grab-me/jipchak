package com.jipchak.server.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GameLogResponse {
    private Long id;
    private Boolean isSuccess;
    private String videoUrl;
    private String createdAt;
}