pipeline {
    agent any // Jenkins Agent 환경에서 실행

    environment {
        DOCKER_COMPOSE_DIR = 'infra'
    }

    stages {
        stage('Checkout') {
            steps {
                // 소스 코드 가져오기
                checkout scm
            }
        }

        stage('Frontend Deploy') {
            when {
                // 프론트엔드 폴더 내의 파일이 변경되었을 때만 실행
                changeset "frontend/react/**"
            }
            steps {
                echo 'Starting Frontend Deployment...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    // 프론트엔드 서비스만 재빌드 및 컨테이너 교체
                    sh "docker-compose up -d --build frontend-jipchak"
                }
            }
        }

        stage('Backend Deploy') {
            when {
                // 백엔드 폴더 내의 파일이 변경되었을 때만 실행
                changeset "backend/**"
            }
            steps {
                echo 'Starting Backend Deployment...'
                dir("${DOCKER_COMPOSE_DIR}") {
                    // 백엔드 서비스만 재빌드 및 컨테이너 교체
                    sh "docker-compose up -d --build app-jipchak"
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                // 사용하지 않는 빌드 이미지 정리 (디스크 용량 확보)
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo 'Deployment Finished Successfully!'
        }
        failure {
            echo 'Deployment Failed. Please check the logs.'
        }
    }
}
