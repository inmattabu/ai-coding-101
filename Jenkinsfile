pipeline {
  agent any

  environment {
    IMAGE_NAME = 'analytics-dashboard'
    CONTAINER_NAME = 'analytics-dashboard'
    LAST_SUCCESSFUL_TAG = 'last-successful'
    APP_PORT = '9009  }

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
          podman run -d --restart=unless-stopped --name ${CONTAINER_NAME} \\
            -p ${APP_PORT}:80 \\
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

    stage('Promote successful image') {
      steps {
        sh 'podman tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:${LAST_SUCCESSFUL_TAG}'
      }
    }
  }

  post {
    always {
      sh 'podman logs --timestamps ${CONTAINER_NAME} > container-${BUILD_NUMBER}.log 2>&1 || true'
      archiveArtifacts artifacts: 'container-*.log', allowEmptyArchive: true
      sh 'podman image prune -f || true'
    }
  }
}
