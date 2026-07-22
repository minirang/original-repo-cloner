# original-repo-cloner

GitHub 개인 리포지토리들을 한 번에 자동으로 병렬 클론하는 Node.js 스크립트입니다.

## 실행 방법

### 1. 환경 변수 설정
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 정보를 입력합니다.

```env
GITHUB_USERNAME=본인의_깃허브_유저네임
GITHUB_TOKEN=본인의_개인_액세스_토큰
TARGET_DIR=클론할 파일이 저장 루트
```

### 2. 스크립트 실행
터미널에서 아래 명령어를 입력하여 실행합니다.

```bash
node 스크립트파일명.js
```
