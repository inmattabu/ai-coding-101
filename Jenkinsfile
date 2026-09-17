pipeline {
  agent any

  environment {
    IMAGE_NAME = 'analytics-dashboard'
    CONTAINER_NAME = 'analytics-dashboard'
    APP_PORT = '9009'
  }

  stages {
    stage('Build image') {
      steps {
        sh 'podman build --pull=missing -t ${IMAGE_NAME}:${BUILD_NUMBER} .'
      }
    }

    stage('Replace deployment') {
      steps {
        sh '''
          podman rm -f ${CONTAINER_NAME} || true
          podman run -d --name ${CONTAINER_NAME} \\
            -p ${APP_PORT}:9009 \\
            -v "${WORKSPACE}/data:/app/data:Z" \\
            ${IMAGE_NAME}:${BUILD_NUMBER}
        '''
      }
    }

    stage('Availability check') {
      steps {
        sh '''
          for attempt in 1 2 3 4 5; do
            if curl --fail --silent http://127.0.0.1:${APP_PORT}/healthz; then
              exit 0
            fi
            sleep 2
          done
          podman logs ${CONTAINER_NAME}
          exit 1
        '''
      }
    }
  }

  post {
    always {
      sh 'podman image prune -f || true'
    }
  }
}
