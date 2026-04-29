# 1. 빌드 단계
FROM gradle:8.5-jdk21 AS build
WORKDIR /app

# 소스 코드 복사
COPY . .

# 실행 파일 빌드
RUN chmod +x ./gradlew
RUN ./gradlew clean bootJar -x test

# 2. 실행 단계
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# 빌드 단계에서 만든 jar 파일만 가져오기
COPY --from=build /app/build/libs/*.jar app.jar

# 서버 포트 8989 열기
EXPOSE 8989

# 실행!
ENTRYPOINT ["java", "-jar", "app.jar"]

