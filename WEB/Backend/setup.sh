#!/bin/bash
# 시스템 패키지
sudo apt-get update
sudo apt-get install -y \
    portaudio19-dev \
    python3-dev \
    libegl1 \
    libegl-mesa0 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgles2

# Node.js / npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 패키지
pip install -r ../../LLM/requirements.txt

# Frontend 빌드
cd ../Frontend
npm install
npm run build
cd ../Backend
