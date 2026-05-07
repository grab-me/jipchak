# 1. 빌드 단계 (Build Stage)
FROM node:24-alpine AS build

WORKDIR /app

# npm 버전을 특정 버전으로 고정
RUN npm install -g npm@11.6.2

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 2. 실행 단계 (Production Stage)
FROM nginx:stable-alpine

# Nginx 설정 파일 복사 (필요한 경우)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물을 Nginx 기본 경로로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 컨테이너 내부 포트
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
