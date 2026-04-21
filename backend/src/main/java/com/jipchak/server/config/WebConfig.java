package com.jipchak.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String path = Paths.get(System.getProperty("user.dir"), "videos").toUri().toString();

        // http://localhost:8080/videos/파일명.mp4 로 접속 가능하게 함
        registry.addResourceHandler("/videos/**")
                .addResourceLocations(path);
    }
}
