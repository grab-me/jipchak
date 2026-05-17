pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
    }

    environment {
        DOCKER_COMPOSE_DIR = 'infra'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "touch .env"
                }
            }
        }

        stage('Backend Build & Test') {
            when {
                changeset "backend/**"
            }
            steps {
                echo 'Building & Testing Backend...'
                dir("backend") {
                    sh "docker run --rm -w /app -v \$(pwd):/app eclipse-temurin:21-jdk-jammy sh -c 'chmod +x gradlew && ./gradlew build --no-daemon'"
                }
            }
        }

        stage('AI Build') {
            when {
                changeset "ai/**"
            }
            steps {
                echo 'Building AI Server...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose build ai-jipchak"
                }
            }
        }

        stage('AI Test') {
            when {
                changeset "ai/**"
            }
            steps {
                echo 'Testing AI Server...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose run --rm ai-jipchak python -m pytest tests/ -v"
                }
            }
        }

        stage('Frontend CI') {
            when {
                changeset "frontend/**"
            }
            steps {
                echo 'Frontend typecheck & test...'
                dir("frontend") {
                    sh "docker run --rm -w /app -v \$(pwd):/app node:24-alpine sh -c '(npm ci || npm install) && npm run typecheck && npm run test:ci'"
                }
            }
        }

        stage('Backend Deploy') {
            when {
                changeset "backend/**"
            }
            steps {
                echo 'Deploying Backend...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose up -d --build app-jipchak"
                }
            }
        }

        stage('AI Deploy') {
            when {
                changeset "ai/**"
            }
            steps {
                echo 'Deploying AI Server...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose up -d ai-jipchak"
                }
            }
        }

        stage('Frontend Deploy') {
            when {
                changeset "frontend/**"
            }
            steps {
                echo 'Deploying Frontend...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose up -d --build frontend-jipchak"
                }
            }
        }

        stage('Infra Deploy') {
            when {
                changeset "infra/**"
            }
            steps {
                echo 'Infra changed, rebuilding all services...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    sh "docker compose up -d --build"
                    // nginx conf 가 바인드 마운트라 컨테이너 recreate 가 일어나지 않음.
                    // 무중단 reload 로 새 conf 적용. 실패 시 컨테이너 restart 로 fallback.
                    sh "docker compose exec -T nginx nginx -s reload || docker compose restart nginx"
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo 'CI/CD Finished Successfully!'
        }
        failure {
            echo 'CI/CD Failed. Please check the logs.'
        }
    }
}
