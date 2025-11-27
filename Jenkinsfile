pipeline {
    // 在任何可用的 agent 上執行
    agent any
    
    // 環境變數設定，請改成你的資訊
    environment {
        DOCKER_HUB_USER = 'peggy123'
        APP_NAME = 'lsap-cicd-app'
        DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1443664242690490419/3JbqXB10nI4EBPFTKZ_n9I5Y8WjaQSMPG3eGT-OSCdznmPPAD0Gf6i8nBfv1eAr4dmm-'
    }
    
    stages {
        // ===== 第一階段：程式碼靜態分析（所有分支都會跑）=====
        stage('Static Analysis') {
            steps {
                echo 'Running ESLint...'
                sh 'npm install'          // 安裝相依套件
                sh 'npm run lint'         // 執行 eslint 檢查
            }
        }
        
        // ===== 第二階段：Dev 分支 - 建置並部署到 Staging =====
        stage('Build and Deploy to Staging') {
            // 只有 dev 分支才執行這個 stage
            when {
                branch 'dev'
            }
            steps {
                echo '🔨 Building Docker image...'
                
                // 建立 Docker image，標記為 dev-建置編號
                sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER} ."
                
                // 登入 Docker Hub 並推送
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                    sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER}"
                }
                
                echo '🚀 Deploying to Staging (Port 8081)...'
                
                // 移除舊的容器（如果存在的話，-f 強制移除）
                sh 'docker rm -f dev-app || true'
                
                // 啟動新容器
                sh "docker run -d --name dev-app -p 8081:3000 ${DOCKER_HUB_USER}/${APP_NAME}:dev-${BUILD_NUMBER}"
                
                // 等待應用程式啟動
                sh 'sleep 5'
                
                // 健康檢查
                echo '🏥 Health check...'
                sh 'curl -f http://localhost:8081/health'
            }
        }
        
        // ===== 第三階段：Main 分支 - GitOps 部署到 Production =====
        stage('Deploy to Production (GitOps)') {
            // 只有 main 分支才執行
            when {
                branch 'main'
            }
            steps {
                script {
                    // 讀取 deploy.config 檔案，取得要部署的版本
                    def targetTag = readFile('deploy.config').trim()
                    echo "📦 Target version from GitOps config: ${targetTag}"
                    
                    // 登入 Docker Hub
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                        
                        // 拉取指定版本的 image
                        sh "docker pull ${DOCKER_HUB_USER}/${APP_NAME}:${targetTag}"
                        
                        // 重新標記為 production 版本
                        sh "docker tag ${DOCKER_HUB_USER}/${APP_NAME}:${targetTag} ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                        
                        // 推送 production 標籤到 Docker Hub
                        sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                    }
                    
                    echo '🚀 Deploying to Production (Port 8082)...'
                    
                    // 移除舊的 production 容器
                    sh 'docker rm -f prod-app || true'
                    
                    // 啟動新的 production 容器
                    sh "docker run -d --name prod-app -p 8082:3000 ${DOCKER_HUB_USER}/${APP_NAME}:prod-${BUILD_NUMBER}"
                }
            }
        }
    }
    
    // ===== 建置完成後的動作 =====
    post {
        // 失敗時發送 Discord 通知
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
        
        // 成功時也可以通知（可選）
        success {
            echo '✅ Build completed successfully!'
        }
    }
}
