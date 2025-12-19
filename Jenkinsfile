pipeline {
    agent any
    
    environment {
        DOCKER_HUB_USER = 'peggy123'
        APP_NAME = 'lsap-cicd-app'
        DISCORD_WEBHOOK = '[https://discord.com/api/webhooks/1443664242690490419/3JbqXB10nI4EBPFTKZ_n9I5Y8WjaQSMPG3eGT-OSCdznmPPAD0Gf6i8nBfv1eAr4dmm-](https://discord.com/api/webhooks/1443664242690490419/3JbqXB10nI4EBPFTKZ_n9I5Y8WjaQSMPG3eGT-OSCdznmPPAD0Gf6i8nBfv1eAr4dmm-)'
    }
    
    stages {
        stage('Static Analysis') {
            steps {
                echo '📋 Running ESLint...'
                sh 'npm install'
                sh 'npm run lint'
            }
        }
        
        stage('Build and Deploy to Staging') {
            when {
                branch 'dev'
            }
            steps {
                script {
                    // 用 shell 指令讀取 package.json 的 version
                    def version = sh(script: "grep '\"version\"' package.json | cut -d'\"' -f4", returnStdout: true).trim()
                    echo "📦 Version from package.json: v${version}"
                    
                    echo '🔨 Building Docker image...'
                    sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER} ."
                    
                    // 多 tag 一個 semantic version
                    sh "docker tag ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER} ${DOCKER_HUB_USER}/${APP_NAME}:v${version}"
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                        sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER}"
                        sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:v${version}"
                    }
                    
                    echo '🚀 Deploying to Staging (Port 8081)...'
                    sh 'docker rm -f dev-app || true'
                    sh "docker run -d --name dev-app -p 8081:3000 ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER}"
                    
                    sh 'sleep 5'
                    echo '🏥 Health check...'
                    sh 'curl -f http://localhost:8081/health'
                }
            }
        }
        
        stage('Deploy to Production (GitOps)') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def targetTag = readFile('deploy.config').trim()
                    echo "📦 Target version from GitOps config: ${targetTag}"
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                        sh "docker pull ${DOCKER_HUB_USER}/${APP_NAME}:${targetTag}"
                        sh "docker tag ${DOCKER_HUB_USER}/${APP_NAME}:${targetTag} ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                        sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                    }
                    
                    echo '🚀 Deploying to Production (Port 8082)...'
                    sh 'docker rm -f prod-app || true'
                    sh "docker run -d --name prod-app -p 8082:3000 ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                }
            }
        }
    }
    
    post {
        failure {
            script {
                def payload = """{
                    "content": "❌ **Jenkins Build Failed!**",
                    "embeds": [{
                        "title": "Build Failure Notification",
                        "color": 15158332,
                        "fields": [
                            {"name": "👤 Name", "value": "簡立佩", "inline": true},
                            {"name": "🆔 Student ID", "value": "B13705034", "inline": true},
                            {"name": "📁 Job Name", "value": "${JOB_NAME}", "inline": true},
                            {"name": "🔢 Build Number", "value": "${BUILD_NUMBER}", "inline": true},
                            {"name": "🌿 Branch", "value": "${BRANCH_NAME}", "inline": true},
                            {"name": "📊 Status", "value": "${currentBuild.currentResult}", "inline": true},
                            {"name": "🔗 GitHub Repo", "value": "${GIT_URL}", "inline": false}
                        ]
                    }]
                }"""
                
                sh """curl -X POST -H "Content-Type: application/json" -d '${payload}' ${DISCORD_WEBHOOK}"""
            }
        }
        
        success {
            echo '✅ Build completed successfully!'
        }
    }
}
