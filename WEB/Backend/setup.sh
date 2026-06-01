#!/bin/bash
set -e

# ─────────────────────────────────────────────
# VisionChef 서버 셋업 스크립트
# 사용법: bash setup.sh [CV_MODEL_PATH]
# 예시:  bash setup.sh /root/CV/model/best.pt
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"   # UI/
BACKEND_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/WEB/Frontend"
LLM_REQ="$PROJECT_ROOT/LLM/requirements.txt"
CV_MODEL="${1:-$PROJECT_ROOT/CV/model/best.pt}"

echo "=============================="
echo "  VisionChef Setup"
echo "=============================="
echo "Backend : $BACKEND_DIR"
echo "Frontend: $FRONTEND_DIR"
echo "CV Model: $CV_MODEL"
echo ""

# ── 1. /dev/shm 디렉토리 준비 (디스크 절약) ──
echo "[1/7] /dev/shm 디렉토리 준비..."
mkdir -p /dev/shm/tmp /dev/shm/hf_cache/hub /dev/shm/hf_cache/transformers \
         /dev/shm/ultralytics_config /dev/shm/.npm

export TMPDIR=/dev/shm/tmp
export HF_HOME=/dev/shm/hf_cache
export YOLO_CONFIG_DIR=/dev/shm/ultralytics_config
export npm_config_cache=/dev/shm/.npm

# .hf_cache 심볼릭 링크 (server.py 하드코딩 경로)
HF_CACHE_LINK="$PROJECT_ROOT/.hf_cache"
if [ ! -L "$HF_CACHE_LINK" ]; then
    rm -rf "$HF_CACHE_LINK" 2>/dev/null || true
    ln -sf /dev/shm/hf_cache "$HF_CACHE_LINK" || echo "⚠️  .hf_cache 심볼릭 링크 생성 실패 (디스크 부족 가능)"
fi

# ── 2. 시스템 패키지 설치 ──
echo "[2/7] 시스템 패키지 설치..."
apt-get update -qq
apt-get install -y -qq \
    portaudio19-dev python3-dev \
    libegl1 libegl-mesa0 libgl1-mesa-glx libglib2.0-0 libgles2 \
    unzip curl 2>/dev/null || echo "⚠️  일부 패키지 설치 실패 (계속 진행)"

# ── 3. Python 패키지 설치 ──
echo "[3/7] Python 패키지 설치..."
pip install --quiet -r "$LLM_REQ" || {
    echo "⚠️  일부 패키지 실패. PyAudio 없이 재시도..."
    grep -v "PyAudio" "$LLM_REQ" > /tmp/req_no_audio.txt
    pip install --quiet -r /tmp/req_no_audio.txt
    pip install --quiet PyAudio || echo "⚠️  PyAudio 설치 실패 (TTS/STT 비활성화될 수 있음)"
}
pip install --quiet huggingface_hub 2>/dev/null || true

# ── 4. LLM 모델 다운로드 ──
echo "[4/7] LLM 모델 확인..."
LLM_DIR="${LLM_LOCAL_MODEL_DIR:-/dev/shm/models/skt_A.X-4.0-Light}"
if [ ! -f "$LLM_DIR/config.json" ]; then
    echo "  모델 없음. 다운로드 시작..."
    HF_TOKEN_VAL=$(grep HF_TOKEN "$BACKEND_DIR/.env" 2>/dev/null | cut -d'=' -f2)
    python3 -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='skt/A.X-4.0-Light',
    local_dir='$LLM_DIR',
    token='${HF_TOKEN_VAL}'
)
print('✅ 모델 다운로드 완료')
"
else
    echo "  모델 이미 존재: $LLM_DIR"
fi

# ── 5. .env 설정 ──
echo "[5/7] .env 설정..."
ENV_FILE="$BACKEND_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    TMPDIR=/dev/shm/tmp sed -i \
        "s|LLM_LOCAL_MODEL_DIR=.*|LLM_LOCAL_MODEL_DIR=$LLM_DIR|" "$ENV_FILE"
    TMPDIR=/dev/shm/tmp sed -i \
        "s|HF_HOME=.*|HF_HOME=/dev/shm/hf_cache|" "$ENV_FILE"
    TMPDIR=/dev/shm/tmp sed -i \
        "s|YOLO_MODEL_PATH=.*|YOLO_MODEL_PATH=$CV_MODEL|" "$ENV_FILE"
    TMPDIR=/dev/shm/tmp sed -i \
        "s|SKIP_LLM=.*|SKIP_LLM=0|" "$ENV_FILE"
    echo "  .env 업데이트 완료"
else
    echo "  ⚠️  .env 파일 없음. 직접 설정 필요."
fi

# ── 6. Frontend 빌드 (node_modules를 /dev/shm에 설치) ──
echo "[6/7] Frontend 빌드..."
NODE_MODULES="$FRONTEND_DIR/node_modules"
if [ ! -L "$NODE_MODULES" ]; then
    mkdir -p /dev/shm/node_modules
    rm -rf "$NODE_MODULES" 2>/dev/null || true
    ln -sf /dev/shm/node_modules "$NODE_MODULES" || echo "⚠️  node_modules 링크 실패"
fi

if ! command -v node &>/dev/null; then
    echo "  Node.js 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y -qq nodejs
fi

cd "$FRONTEND_DIR"
npm install --cache /dev/shm/.npm --prefer-offline 2>/dev/null || npm install --cache /dev/shm/.npm
npm run build
cd "$BACKEND_DIR"

# ── 7. 완료 ──
echo ""
echo "=============================="
echo "  셋업 완료!"
echo "=============================="
echo ""
echo "서버 실행:"
echo "  export TMPDIR=/dev/shm/tmp HF_HOME=/dev/shm/hf_cache YOLO_CONFIG_DIR=/dev/shm/ultralytics_config"
echo "  cd $BACKEND_DIR && uvicorn server:app --host 0.0.0.0 --port 8000"
