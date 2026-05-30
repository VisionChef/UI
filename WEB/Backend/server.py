import os
import re
import sys
import json
import io
import base64
from getpass import getpass
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional
import tempfile
import threading

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

# ⚠️ Hugging Face / Transformers 캐시는 관련 라이브러리 import 전에 잡아둔다.
# 기존 코드는 D:\models를 사용했지만, D 드라이브가 없는 PC에서는 서버 시작이 실패한다.
# 현재 server.py 기준으로 프로젝트 루트(UI)를 계산하고, UI/models 아래에 LLM 캐시/모델을 저장한다.
_THIS_FILE = Path(__file__).resolve()
MODULE_DIR = _THIS_FILE.parent                  # UI/WEB/Backend
PROJECT_DIR = MODULE_DIR.parent                # UI/WEB
VISIONCHEF_ROOT = PROJECT_DIR.parent           # UI

DEFAULT_HF_HOME = VISIONCHEF_ROOT / ".hf_cache"
DEFAULT_HF_HUB_CACHE = DEFAULT_HF_HOME / "hub"
DEFAULT_TRANSFORMERS_CACHE = DEFAULT_HF_HOME / "transformers"
DEFAULT_LOCAL_MODEL_DIR = DEFAULT_HF_HOME / "skt_A.X-4.0-Light"

DEFAULT_HF_HOME.mkdir(parents=True, exist_ok=True)
DEFAULT_HF_HUB_CACHE.mkdir(parents=True, exist_ok=True)
DEFAULT_TRANSFORMERS_CACHE.mkdir(parents=True, exist_ok=True)

os.environ["HF_HOME"] = str(DEFAULT_HF_HOME)
os.environ["HF_HUB_CACHE"] = str(DEFAULT_HF_HUB_CACHE)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(DEFAULT_HF_HUB_CACHE)
os.environ["TRANSFORMERS_CACHE"] = str(DEFAULT_TRANSFORMERS_CACHE)
os.environ["HF_HUB_DISABLE_EXPERIMENTAL_XET"] = "1"
os.environ["HF_HUB_DISABLE_XET"] = "1"

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
from openai import OpenAI as RunYourClient
from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, StoppingCriteria, StoppingCriteriaList, pipeline
from huggingface_hub import login, snapshot_download
from gtts import gTTS
import pygame
import time
from starlette.concurrency import run_in_threadpool

try:
    import numpy as np
    import cv2
    from ultralytics import YOLO as YOLODetector
    _yolo_available = True
except ImportError:
    _yolo_available = False
    print("⚠️ YOLO/OpenCV 라이브러리 없음 — /detect 엔드포인트 비활성화")

_mediapipe_available = False
_hand_landmarker = None
try:
    if _yolo_available:
        import urllib.request as _urllib_req
        import mediapipe as mp
        from mediapipe.tasks import python as _mp_python
        from mediapipe.tasks.python import vision as _mp_vision
        _mp_model_path = str(Path(tempfile.gettempdir()) / "hand_landmarker.task")
        if not Path(_mp_model_path).exists():
            print("⬇️ MediaPipe 손 랜드마크 모델 다운로드 중...")
            _urllib_req.urlretrieve(
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                _mp_model_path,
            )
        _hand_landmarker = _mp_vision.HandLandmarker.create_from_options(
            _mp_vision.HandLandmarkerOptions(
                base_options=_mp_python.BaseOptions(model_asset_path=_mp_model_path),
                running_mode=_mp_vision.RunningMode.IMAGE,
                num_hands=1,
                min_hand_detection_confidence=0.7,
                min_hand_presence_confidence=0.7,
                min_tracking_confidence=0.7,
            )
        )
        _mediapipe_available = True
        print("✅ MediaPipe 손 인식 준비 완료")
except Exception as _mp_err:
    print(f"⚠️ MediaPipe 초기화 실패 — /gesture 비활성화: {_mp_err}")


def detect_hand_gesture(image_bytes: bytes) -> str:
    if not _mediapipe_available or _hand_landmarker is None:
        return "NONE"
    data = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if frame is None:
        return "NONE"
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = _hand_landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return "NONE"
    lm = result.hand_landmarks[0]
    fingers = []
    for tip, pip, mcp in [(8, 6, 5), (12, 10, 9), (16, 14, 13), (20, 18, 17)]:
        fingers.append(1 if lm[tip].y < lm[pip].y and lm[tip].y < lm[mcp].y else 0)
    thumb_up = lm[4].y < lm[3].y and lm[4].y < lm[5].y
    if fingers == [0, 0, 0, 0] and thumb_up:
        return "THUMBS_UP"
    if fingers[0] == 1 and fingers[1] == 1 and fingers[2] == 0 and fingers[3] == 0:
        return "PEACE"
    if fingers == [0, 0, 0, 0] and not thumb_up:
        return "FIST"
    return "NONE"

# 프로젝트 루트 기준 경로 계산 후 sys.path 추가
_THIS_FILE   = Path(__file__).resolve()
_WEB_DIR     = _THIS_FILE.parent.parent          # C:\VisionChef\WEB
_ROOT_DIR    = _WEB_DIR.parent                   # C:\VisionChef
_LLM_DIR     = _ROOT_DIR / "LLM"                 # C:\VisionChef\LLM
sys.path.insert(0, str(_LLM_DIR))
sys.path.insert(0, str(_LLM_DIR / "RAG"))

from RAG.rag import (
    load_recipes,
    build_vectorstore,
    search_recipes,
    normalize_ingredient,
)
from youtube_api import find_best_youtube_segment, get_last_youtube_error, is_cooking_video_query

MODULE_DIR       = _THIS_FILE.parent                          # C:\VisionChef\WEB\Backend
PROJECT_DIR      = MODULE_DIR.parent                          # C:\VisionChef\WEB
VISIONCHEF_ROOT  = PROJECT_DIR.parent                         # C:\VisionChef
RAG_DATA_DIR     = VISIONCHEF_ROOT / "LLM" / "RAG" / "data"
BOOK_RECIPES_FILE    = str(RAG_DATA_DIR / "baek_book_recipes.json")
TRENDING_RECIPES_FILE = str(RAG_DATA_DIR / "trending_recipes.json")
CHROMA_PATH      = str(VISIONCHEF_ROOT / "LLM" / "RAG" / "chroma_db")


def read_env_file(path: Path) -> dict[str, str]:
    values = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def get_runtime_env(name: str) -> Optional[str]:
    return (
        os.getenv(name)
        or read_env_file(MODULE_DIR / ".env").get(name)
        or read_env_file(PROJECT_DIR / ".env").get(name)
        or read_env_file(VISIONCHEF_ROOT / ".env").get(name)
    )

# ==========================================
# ⚙️ 설정, 모델 로드, RAG 초기화
# ==========================================
pipe = None
vectorstore = None # RAG 벡터 저장소
recipe_documents = []
loaded_model_source = None
loaded_quantization = "none"
rag_error = None
rag_mode = "none"
tts_lock = threading.Lock()
generation_lock = threading.Lock()
generation_state_lock = threading.Lock()
generation_cancel_event = threading.Event()
generation_active = False
SERVER_TTS_ENABLED = os.getenv("ENABLE_SERVER_TTS", "0").strip().lower() in {"1", "true", "yes", "on"}
LLM_MODEL_ID = os.getenv("LLM_MODEL_ID", "skt/A.X-4.0-Light")
LLM_LOCAL_MODEL_DIR = os.getenv("LLM_LOCAL_MODEL_DIR", DEFAULT_LOCAL_MODEL_DIR)
LLM_LOAD_IN_8BIT = os.getenv("LLM_LOAD_IN_8BIT", "0").strip().lower() in {"1", "true", "yes", "on"}
SYSTEM_PROMPT = """너는 사용자 옆에서 같이 요리하는 만능 셰프야.
말투는 사람과 대화하듯 자연스럽고 친근하게 해. 사용자를 가르치는 설명서가 아니라, 지금 주방에서 같이 조리하는 셰프처럼 반응해.
항상 존댓말로 말해. 반말, 친구 말투, 명령조는 절대 쓰지 말고 "~요", "~세요", "~습니다" 형태로 답해.
재료 손질, 조리 순서, 대체 재료, 간 맞추기, 실패 수습, 보관법, 플레이팅까지 폭넓게 도와줘.
사용자의 말이 짧거나 애매하면 먼저 상황을 짚고, 필요한 질문은 한 가지만 물어봐.
레시피 추천은 먼저 참고 문서의 RAG 결과를 우선해. RAG 결과가 없으면 네 일반 요리 지식으로 답해도 된다.
단, 어떤 경우에도 현재 인식된 재료나 사용자가 말한 보유 재료로 만들 수 있는 음식만 추천해. 사용자가 가지고 있지 않은 재료가 꼭 필요한 레시피는 추천하지 마.
현재 사용 가능한 재료 목록에 없는 식재료, 양념, 토핑, 고명은 새로 꺼내지 마. 기본재료도 목록에 포함되어 있을 때만 사용할 수 있어.
요리 실행을 안내할 때는 반드시 아래 방식을 지켜.
지금 사용자가 바로 실행할 한 단계만 말해. 전체 레시피, 전체 순서, 다음 단계 목록을 한 번에 말하지 마.
한 단계 안에서는 꼭 필요한 양, 불 세기, 시간, 상태 기준만 짚어.
답변은 2문장 이상 4문장 이하로 짧게 말해. 요리 중 듣기 부담스럽지 않게 핵심만 말해.
사용자가 "다 했어", "다음", "계속", "했어"처럼 진행 신호를 주면 그때 다음 단계로 넘어가.
사용자가 전체 레시피를 물어도 전체를 나열하지 말고, 먼저 시작 단계부터 같이 진행해.
절대 *, #, - 같은 기호나 번호 목록을 쓰지 말고 구어체로만 답해.
문서 내용과 관련된 질문이면 아래 참고 문서 내용을 바탕으로 답하되, 사용자의 현재 조리 상황과 대화를 우선해.
---
[참고 문서 내용]
{rag_context}
---
"""


class GenerationCancelled(Exception):
    pass


class CancelStoppingCriteria(StoppingCriteria):
    def __init__(self, cancel_event: threading.Event):
        self.cancel_event = cancel_event

    def __call__(self, input_ids, scores, **kwargs) -> bool:
        return self.cancel_event.is_set()


def set_generation_active(active: bool) -> None:
    global generation_active
    with generation_state_lock:
        generation_active = active


def is_generation_active() -> bool:
    with generation_state_lock:
        return generation_active


def generate_llm_answer(prompt: str) -> str:
    if pipe is None:
        raise RuntimeError("LLM model is not loaded yet.")

    if not generation_lock.acquire(blocking=False):
        raise RuntimeError("이미 답변을 생성하는 중입니다. 먼저 중단하거나 잠시 기다려주세요.")

    generation_cancel_event.clear()
    set_generation_active(True)
    try:
        outputs = pipe(
            prompt,
            max_new_tokens=240,
            do_sample=True,
            temperature=0.62,
            repetition_penalty=1.08,
            eos_token_id=pipe.tokenizer.eos_token_id,
            pad_token_id=pipe.tokenizer.pad_token_id,
            stopping_criteria=StoppingCriteriaList([CancelStoppingCriteria(generation_cancel_event)]),
        )
        if generation_cancel_event.is_set():
            raise GenerationCancelled()
        full_text = outputs[0]["generated_text"]
        return full_text.split("<|im_start|>assistant\n")[-1].strip()
    finally:
        set_generation_active(False)
        generation_lock.release()

def has_hf_hub_cache(repo_id: str) -> bool:
    """
    예: skt/A.X-4.0-Light -> UI/.hf_cache/hub/models--skt--A.X-4.0-Light
    """
    if "/" not in repo_id:
        return False

    namespace, model_name = repo_id.split("/", 1)
    cache_dir = DEFAULT_HF_HUB_CACHE / f"models--{namespace}--{model_name}"
    return cache_dir.exists()

def has_local_model(model_dir: str) -> bool:
    path = Path(model_dir)
    if not path.exists() or not path.is_dir():
        return False

    has_config = (path / "config.json").exists()
    has_weights = any(path.glob("*.safetensors")) or any(path.glob("*.bin"))
    return has_config and has_weights


def get_hf_token(required: bool) -> Optional[str]:
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
    if not token and required:
        token = getpass("Hugging Face token을 입력하세요: ").strip()

    if required and not token:
        raise ValueError("로컬 모델이 없어 다운로드가 필요합니다. HF_TOKEN을 입력해주세요.")

    if token:
        login(token=token, add_to_git_credential=False)
        os.environ["HF_TOKEN"] = token

    return token


def resolve_model_source() -> str:
    local_model_dir = os.getenv("LLM_LOCAL_MODEL_DIR", str(DEFAULT_LOCAL_MODEL_DIR))

    # 1. 직접 풀린 로컬 모델 폴더가 있으면 그걸 사용
    if has_local_model(local_model_dir):
        print(f"📦 로컬 A.X 모델 사용: {local_model_dir}")
        get_hf_token(required=False)
        return local_model_dir

    # 2. HuggingFace hub 캐시가 있으면 repo_id로 불러오되, 캐시 폴더를 사용
    if has_hf_hub_cache(LLM_MODEL_ID):
        print(f"📦 HuggingFace 캐시 모델 사용: {DEFAULT_HF_HUB_CACHE}")
        get_hf_token(required=False)
        return LLM_MODEL_ID

    # 3. 둘 다 없으면 다운로드 필요
    print(f"📦 로컬 모델 없음: {local_model_dir}")
    print(f"⬇️ Hugging Face 캐시에 {LLM_MODEL_ID} 다운로드를 시작합니다.")
    get_hf_token(required=True)
    return LLM_MODEL_ID


def build_quantization_config():
    global loaded_quantization

    if not LLM_LOAD_IN_8BIT:
        loaded_quantization = "none"
        return None

    if not torch.cuda.is_available():
        print("⚠️ 8bit 양자화는 CUDA 환경에서만 사용하도록 설정했습니다. 일반 로드로 전환합니다.")
        loaded_quantization = "none"
        return None

    try:
        from transformers import BitsAndBytesConfig
    except ImportError:
        print("⚠️ bitsandbytes가 없어 8bit 양자화를 적용하지 못했습니다. 일반 로드로 전환합니다.")
        loaded_quantization = "none"
        return None

    loaded_quantization = "8bit"
    return BitsAndBytesConfig(load_in_8bit=True)


def load_llm_pipeline(model_source: str):
    quantization_config = build_quantization_config()
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    # 모델 소스가 repo_id이면 HF hub 캐시를 사용
    use_hf_repo_id = "/" in model_source

    tokenizer = AutoTokenizer.from_pretrained(
        model_source,
        trust_remote_code=True,
        cache_dir=str(DEFAULT_HF_HUB_CACHE) if use_hf_repo_id else None,
        token=os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN"),
    )

    model_kwargs = {
        "device_map": "auto",
        "trust_remote_code": True,
    }

    if use_hf_repo_id:
        model_kwargs["cache_dir"] = str(DEFAULT_HF_HUB_CACHE)
        model_kwargs["token"] = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

    if quantization_config is not None:
        model_kwargs["quantization_config"] = quantization_config
    else:
        model_kwargs["torch_dtype"] = torch_dtype

    model = AutoModelForCausalLM.from_pretrained(
        model_source,
        **model_kwargs,
    )

    if tokenizer.pad_token_id is None:
        tokenizer.pad_token_id = tokenizer.eos_token_id

    return pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 실행
    global pipe, vectorstore, recipe_documents, loaded_model_source, rag_error, rag_mode, yolo_model
    print("🚀 서버 시작...")

    # LLM 모델 로드 (SKIP_LLM=1 이면 건너뜀)
    skip_llm = os.getenv("SKIP_LLM", "0").strip().lower() in {"1", "true", "yes"}
    if skip_llm:
        print("⚠️ LLM 스킵 모드 — /ask 엔드포인트 비활성화")
    else:
        loaded_model_source = resolve_model_source()
        print(f"🧠 A.X 로딩 중... source={loaded_model_source}")
        pipe = load_llm_pipeline(loaded_model_source)
        print(f"✅ A.X 모델 준비 완료! quantization={loaded_quantization}")

    # RAG 벡터 저장소 로드 또는 생성
    chroma_path = CHROMA_PATH

    book_docs = load_recipes(BOOK_RECIPES_FILE, source_type="Baek_Book")
    trending_docs = load_recipes(TRENDING_RECIPES_FILE, source_type="trending")
    recipe_documents = book_docs + trending_docs

    try:
        vectorstore = build_vectorstore(recipe_documents, chroma_path)
        rag_error = None
        rag_mode = "vector"
        print("✅ RAG 벡터 검색 준비 완료")
    except Exception as exc:
        vectorstore = None
        rag_error = str(exc)
        rag_mode = "fallback" if recipe_documents else "none"
        print(f"⚠️ RAG 벡터 초기화 실패. JSON fallback 검색으로 계속 실행합니다: {exc}")

    # YOLO 모델 로드
    if _yolo_available:
        if YOLO_MODEL_PATH.exists():
            try:
                yolo_model = YOLODetector(str(YOLO_MODEL_PATH))
                print(f"✅ YOLO 모델 준비 완료: {YOLO_MODEL_PATH}")
            except Exception as e:
                print(f"⚠️ YOLO 모델 로드 실패: {e}")
        else:
            print(f"⚠️ YOLO 모델 파일 없음: {YOLO_MODEL_PATH}")

    yield
    # 서버 종료 시 실행 (여기서는 특별한 정리 작업 없음)
    print("🌙 서버 종료...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_ingredients = []
pending_ingredients = []
cached_rag_context = "없음"
chat_history = []
cached_rag_matches = []
community_posts: list[dict] = []
yolo_model = None
YOLO_MODEL_PATH = Path(os.getenv("YOLO_MODEL_PATH", str(VISIONCHEF_ROOT / "CV" / "model" / "best.pt")))
FRONTEND_BUILD_DIR = PROJECT_DIR / "Frontend" / "build"

# 레퍼런스 이미지 캐시 (서버 시작 시 1회 로드)
_ref_image_contents: list[dict] = []
for _p, _m in [
    (VISIONCHEF_ROOT / "WEB" / "food1.jpg", "image/jpeg"),
    (VISIONCHEF_ROOT / "WEB" / "food2.png", "image/png"),
]:
    if _p.exists():
        with open(_p, "rb") as _f:
            _b64 = base64.b64encode(_f.read()).decode()
        _ref_image_contents.append({"inline_data": {"mime_type": _m, "data": _b64}})
print(f"✅ 레퍼런스 이미지 {len(_ref_image_contents)}장 캐시 완료")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_loaded": pipe is not None,
        "rag_loaded": vectorstore is not None or bool(recipe_documents),
        "rag_mode": rag_mode,
        "rag_error": rag_error,
        "youtube_enabled": bool(get_runtime_env("YOUTUBE_API_KEY")),
        "llm_generating": is_generation_active(),
        "model_source": loaded_model_source,
        "quantization": loaded_quantization,
        "current_ingredients": current_ingredients,
        "pending_ingredients": pending_ingredients,
    }

# ==========================================
# 🔊 TTS 재생 함수
# ==========================================
def play_tts(text: str):
    clean_text = re.sub(r'[^\w\s가-힣?.!]', '', text)
    if not clean_text:
        return

    filename = os.path.join(
        tempfile.gettempdir(),
        f"cooking_agent_voice_{os.getpid()}_{time.time_ns()}.mp3",
    )
    mixer_initialized = False
    try:
        with tts_lock:
            tts = gTTS(text=clean_text, lang='ko')
            tts.save(filename)
            pygame.mixer.init()
            mixer_initialized = True
            pygame.mixer.music.load(filename)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
    except Exception as e:
        print(f"⚠️ [TTS] 재생 실패: {e}")
    finally:
        if mixer_initialized:
            pygame.mixer.quit()
        if os.path.exists(filename):
            os.remove(filename)


def queue_tts(background_tasks: BackgroundTasks, text: str) -> None:
    if SERVER_TTS_ENABLED:
        background_tasks.add_task(play_tts, text)

# ==========================================
# 🌐 API 엔드포인트
# ==========================================
class VisionData(BaseModel):
    ingredients: list[str] = Field(default_factory=list)
    action: str = "update"


class STTData(BaseModel):
    user_text: str
    ingredients: list[str] = Field(default_factory=list)


class CommunityPostData(BaseModel):
    author: str
    title: str
    content: str


class TTSData(BaseModel):
    text: str


def _clean_ingredients(ingredients: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    for ingredient in ingredients:
        item = str(ingredient).strip()
        if not item or item in seen:
            continue
        cleaned.append(item)
        seen.add(item)
    return cleaned


def _cache_recipe_context(recipes: list[dict]) -> str:
    context_lines = []
    for i, recipe in enumerate(recipes):
        context_lines.append(f"추천요리 {i+1}: {recipe['title']}")
        context_lines.append(f"  - 전체 재료: {recipe['ingredients']}")
        context_lines.append(f"  - 요리 방법: {recipe['steps']}")
    return "\n".join(context_lines)


def _search_recipes_fallback(user_ingredients: list[str], top_k: int = 2) -> list[dict]:
    normalized_user = {
        normalize_ingredient(ingredient)
        for ingredient in user_ingredients
        if str(ingredient).strip()
    }
    if not normalized_user:
        return []

    ranked = []
    for doc in recipe_documents:
        raw_ingredients = doc.metadata.get("normalized_ingredients", "")
        recipe_ingredients = {
            item.strip()
            for item in raw_ingredients.split(",")
            if item.strip()
        }
        if not recipe_ingredients:
            continue

        missing = recipe_ingredients - normalized_user
        if missing:
            continue

        coverage = len(recipe_ingredients & normalized_user) / len(recipe_ingredients)
        if coverage < 0.9:
            continue

        ranked.append((-len(recipe_ingredients), -coverage, doc))

    ranked.sort(key=lambda item: (item[0], item[1], item[2].metadata.get("title", "")))
    recipes = []
    for _, _, doc in ranked[:top_k]:
        recipes.append({
            "title": doc.metadata["title"],
            "ingredients": doc.metadata["ingredients"],
            "steps": doc.metadata["steps"],
            "source_type": doc.metadata["source_type"],
            "similarity": 1.0,
        })
    return recipes


def _search_available_recipes(user_ingredients: list[str], top_k: int = 2) -> list[dict]:
    if not user_ingredients or (not vectorstore and not recipe_documents):
        return []
    if vectorstore:
        return search_recipes(vectorstore, user_ingredients, top_k=top_k, min_score=0.9)
    return _search_recipes_fallback(user_ingredients, top_k=top_k)


def _refresh_cached_rag_for_ingredients(ingredients: list[str]) -> list[dict]:
    global current_ingredients, cached_rag_context, cached_rag_matches

    current_ingredients = _clean_ingredients(ingredients)
    recipes = _search_available_recipes(current_ingredients, top_k=2)
    if recipes:
        cached_rag_context = _cache_recipe_context(recipes)
        cached_rag_matches = [
            {
                "title": recipe["title"],
                "similarity": recipe.get("similarity", 0),
                "source_type": recipe.get("source_type", ""),
            }
            for recipe in recipes
        ]
    else:
        cached_rag_context = (
            "RAG 검색 결과 없음. 모델의 일반 요리 지식으로 답하되, "
            "현재 인식된 재료 안에서 만들 수 있는 음식만 제안할 것."
        )
        cached_rag_matches = []
    return recipes


def _llm_wants_youtube_video(user_text: str) -> tuple[bool, str]:
    if is_cooking_video_query(user_text):
        return True, "rule"

    if pipe is None:
        return False, "none"

    classifier_prompt = (
        "<|im_start|>system\n"
        "너는 사용자의 요청이 유튜브 요리 영상 추천을 필요로 하는지 판단한다. "
        "사용자가 영상, 유튜브, 시연, 화면으로 보기, 조리법을 실제로 보고 싶다는 의도를 보이면 YES만 답해. "
        "일반적인 요리 질문이나 텍스트 설명만 원하는 질문이면 NO만 답해."
        "<|im_end|>\n"
        f"<|im_start|>user\n{user_text}<|im_end|>\n"
        "<|im_start|>assistant\n"
    )

    try:
        outputs = pipe(
            classifier_prompt,
            max_new_tokens=8,
            do_sample=False,
            eos_token_id=pipe.tokenizer.eos_token_id,
            pad_token_id=pipe.tokenizer.pad_token_id,
        )
    except Exception as exc:
        print(f"⚠️ [YouTube] 영상 의도 판단 실패: {exc}")
        return False, "error"

    generated = outputs[0]["generated_text"]
    decision = generated.split("<|im_start|>assistant\n")[-1].strip().upper()
    return decision.startswith("YES"), "llm"


def _handle_confirmed_ingredients(
    ingredients: list[str],
    background_tasks: BackgroundTasks,
) -> dict:
    global current_ingredients, cached_rag_context, cached_rag_matches, chat_history

    current_ingredients = _clean_ingredients(ingredients)
    print(f"👁️ [Vision]: {current_ingredients}")

    if not current_ingredients:
        cached_rag_context = "없음"
        cached_rag_matches = []
        return {
            "status": "success",
            "recipes_found": 0,
            "rag_loaded": vectorstore is not None or bool(recipe_documents),
            "rag_mode": rag_mode,
            "rag_matches": cached_rag_matches,
            "message": "인식된 재료가 없습니다.",
        }

    if not vectorstore and not recipe_documents:
        cached_rag_context = "없음"
        cached_rag_matches = []
        return {
            "status": "success",
            "recipes_found": 0,
            "rag_loaded": False,
            "rag_matches": cached_rag_matches,
            "message": "RAG가 아직 준비되지 않았습니다.",
        }

    # 1. RAG 검색
    print(f"🔍 RAG 검색 (재료 기반): {current_ingredients}")
    rag_recipes = _search_available_recipes(current_ingredients, top_k=4)
    print(f"📚 RAG에서 {len(rag_recipes)}개 레시피 발견")

    # 2. 부족한 만큼 LLM으로 생성 (총 4개 채우기)
    ai_recipes = []
    needed_count = max(0, 4 - len(rag_recipes))
    if pipe and needed_count > 0:
        ing_str = ", ".join(current_ingredients)
        print(f"🪄 LLM으로 {needed_count}개 레시피 추가 생성 중...")
        ax_prompt = (
            f"<|im_start|>system\n너는 창의적이고 엄격한 전문 요리사야.\n"
            f"제한 조건:\n"
            f"1. 반드시 사용자가 제공한 재료 리스트에 포함된 재료들만 사용해.\n"
            f"2. 리스트에 없는 재료는 절대 포함하지 마.\n"
            f"3. 주어진 재료만으로 요리가 불가능하면 가장 간단한 요리라도 제안해.\n"
            f"4. 답변은 반드시 JSON 리스트 형식으로만 해: "
            f'[{{"title": "..", "ingredients": "..", "steps": ".."}}, ...]\n'
            f"5. 모든 텍스트는 한국어로 작성해.<|im_end|>\n"
            f"<|im_start|>user\n재료 리스트: {ing_str}\n"
            f"이 재료들만 사용해서 만들 수 있는 요리 {needed_count}개를 추천해줘.<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )
        try:
            out = pipe(ax_prompt, max_new_tokens=500, do_sample=False)
            raw = out[0]["generated_text"].split("<|im_start|>assistant\n")[-1].split("<|im_end|>")[0].strip()
            match = re.search(r"\[.*\]", raw, re.DOTALL)
            if match:
                parsed = json.loads(match.group().replace("'", '"'))
                for r in parsed[:needed_count]:
                    r["source_type"] = "AI_Chef"
                    r["similarity"] = 0.0
                    ai_recipes.append(r)
                print(f"✨ LLM 생성 완료: {[r['title'] for r in ai_recipes]}")
        except Exception as e:
            print(f"⚠️ LLM 레시피 생성 실패: {e}")

    # 3. 합치기 (RAG 우선, AI로 나머지 채움)
    recipes = (rag_recipes + ai_recipes)[:4]

    if recipes:
        cached_rag_context = _cache_recipe_context(recipes)
        cached_rag_matches = [
            {
                "title": r["title"],
                "similarity": r.get("similarity", 0),
                "source_type": r.get("source_type", ""),
            }
            for r in recipes
        ]
        print(f"  -> 총 {len(recipes)}개 레시피 캐싱 (RAG {len(rag_recipes)}개 + AI {len(ai_recipes)}개)")
        titles = ", ".join(r["title"] for r in recipes)
        opening_line = f"재료로 만들 수 있는 요리 {len(recipes)}가지를 찾았어요! {titles} — 어떤 걸 만들어볼까요?"
    else:
        cached_rag_context = (
            "RAG 및 LLM 검색 결과 없음. 모델의 일반 요리 지식으로 답하되, "
            "현재 인식된 재료 안에서 만들 수 있는 음식만 제안할 것."
        )
        cached_rag_matches = []
        opening_line = "가진 재료로 만들 수 있는 요리를 함께 찾아볼게요. 어떤 요리가 드시고 싶으세요?"

    print(f"🗣️ [A.X Chef]: {opening_line}")
    queue_tts(background_tasks, opening_line)
    chat_history.append({"role": "assistant", "content": opening_line})

    return {
        "status": "success",
        "recipes_found": len(recipes),
        "rag_loaded": True,
        "rag_mode": rag_mode,
        "rag_matches": cached_rag_matches,
        "recipes": recipes,
        "message": opening_line,
    }

@app.post("/vision")
async def update_vision(data: VisionData, background_tasks: BackgroundTasks):
    global current_ingredients, pending_ingredients, cached_rag_context, cached_rag_matches

    action = (data.action or "update").strip().lower()
    ingredients = _clean_ingredients(data.ingredients)

    if action == "ask_confirmation":
        pending_ingredients = ingredients
        if not pending_ingredients:
            return {"status": "ignored", "reason": "no_ingredients"}

        ingredient_text = ", ".join(pending_ingredients)
        confirmation_line = f"{ingredient_text} 재료가 맞나요? 맞으면 엄지척, 아니면 주먹을 보여주세요."
        print(f"🗣️ [A.X Chef]: {confirmation_line}")
        queue_tts(background_tasks, confirmation_line)
        return {
            "status": "waiting_confirmation",
            "ingredients": pending_ingredients,
            "message": confirmation_line,
        }

    if action == "confirm":
        confirmed = ingredients or pending_ingredients
        pending_ingredients = []
        return _handle_confirmed_ingredients(confirmed, background_tasks)

    if action == "reject":
        current_ingredients = []
        pending_ingredients = []
        cached_rag_context = "없음"
        cached_rag_matches = []
        rejection_line = "알겠습니다. 재료를 다시 인식해볼게요."
        print(f"🗣️ [A.X Chef]: {rejection_line}")
        queue_tts(background_tasks, rejection_line)
        return {"status": "rejected", "message": rejection_line}

    pending_ingredients = []
    return _handle_confirmed_ingredients(ingredients, background_tasks)


@app.get("/youtube-preview")
async def youtube_preview(query: str = ""):
    text = query.strip()
    youtube_api_key = get_runtime_env("YOUTUBE_API_KEY")
    wants_youtube = is_cooking_video_query(text) if text else False
    youtube_status = {
        "requested": wants_youtube,
        "intent_source": "rule" if wants_youtube else "none",
        "enabled": bool(youtube_api_key),
        "message": "",
    }

    if not text or not wants_youtube:
        return {
            "requested": wants_youtube,
            "video_recommendation": None,
            "youtube_status": youtube_status,
        }

    if not youtube_api_key:
        youtube_status["message"] = "YouTube API 키가 설정되지 않아 영상을 가져오지 못했습니다."
        return {
            "requested": True,
            "video_recommendation": None,
            "youtube_status": youtube_status,
        }

    try:
        video_recommendation = await run_in_threadpool(
            find_best_youtube_segment,
            text,
            youtube_api_key,
        )
        if video_recommendation:
            youtube_status["message"] = "관련 유튜브 영상을 찾았습니다."
        else:
            youtube_error = get_last_youtube_error()
            youtube_status["message"] = (
                f"YouTube API 호출 실패: {youtube_error}"
                if youtube_error
                else "유튜브에서 관련 영상을 찾지 못했습니다."
            )
        return {
            "requested": True,
            "video_recommendation": video_recommendation,
            "youtube_status": youtube_status,
        }
    except Exception as e:
        print(f"⚠️ [YouTube] 프리뷰 생성 실패: {e}")
        youtube_status["message"] = f"YouTube 프리뷰 생성 실패: {e}"
        return {
            "requested": True,
            "video_recommendation": None,
            "youtube_status": youtube_status,
        }


@app.post("/cancel")
async def cancel_generation():
    was_active = is_generation_active()
    generation_cancel_event.set()
    try:
        if pygame.mixer.get_init():
            pygame.mixer.music.stop()
    except Exception as exc:
        print(f"⚠️ [Cancel] TTS 중단 실패: {exc}")
    return {
        "status": "cancelling" if was_active else "idle",
        "was_active": was_active,
    }


def shutdown_llm_process() -> None:
    time.sleep(0.5)
    os._exit(0)


@app.post("/shutdown")
async def shutdown_llm():
    generation_cancel_event.set()
    try:
        if pygame.mixer.get_init():
            pygame.mixer.music.stop()
    except Exception as exc:
        print(f"⚠️ [Shutdown] TTS 중단 실패: {exc}")
    threading.Thread(target=shutdown_llm_process, daemon=True).start()
    return {"status": "shutting_down"}


@app.post("/ask")
async def ask_chef(data: STTData, background_tasks: BackgroundTasks):
    global chat_history, cached_rag_context
    if pipe is None:
        raise HTTPException(status_code=503, detail="LLM model is not loaded yet.")

    payload_ingredients = _clean_ingredients(data.ingredients)
    if payload_ingredients and set(payload_ingredients) != set(current_ingredients):
        _refresh_cached_rag_for_ingredients(payload_ingredients)

    youtube_api_key = get_runtime_env("YOUTUBE_API_KEY")
    wants_youtube, youtube_intent_source = _llm_wants_youtube_video(data.user_text)
    
    # 💡 저장된 RAG 검색 결과를 가져와 사용합니다.
    rag_context = cached_rag_context

    effective_ingredients = payload_ingredients or current_ingredients
    ing_str = ", ".join(effective_ingredients) if effective_ingredients else "없음"
    
    # 프롬프트 구성
    prompt_template = SYSTEM_PROMPT.format(rag_context=rag_context)
    youtube_instruction = ""
    if wants_youtube:
        youtube_instruction = (
            "\n사용자가 유튜브 영상 또는 시연 영상을 요청했습니다. "
            "시스템이 별도로 유튜브 영상을 검색해서 화면에 붙일 예정이니, "
            "절대 '영상은 제공할 수 없습니다'라고 말하지 마세요. "
            "사람 셰프처럼 자연스럽게 지금 필요한 조리 포인트 한 단계만 설명하고 '아래 영상도 같이 확인해보세요'라고 말하세요."
        )

    prompt = (
        f"<|im_start|>system\n{prompt_template}\n"
        f"현재 사용 가능한 재료: {ing_str}\n"
        "위 재료 목록에 없는 식재료는 추천하거나 조리 단계에 넣지 마세요."
        f"{youtube_instruction}<|im_end|>\n"
    )
    
    # 이전 대화 추가
    for hist in chat_history[-4:]:
        prompt += f"<|im_start|>{hist['role']}\n{hist['content']}<|im_end|>\n"
    
    # 현재 질문 추가
    prompt += f"<|im_start|>user\n{data.user_text}<|im_end|>\n<|im_start|>assistant\n"
    
    try:
        llm_answer = await run_in_threadpool(generate_llm_answer, prompt)
    except GenerationCancelled:
        return {
            "answer": "응답 생성을 중단했습니다.",
            "cancelled": True,
            "video_recommendation": None,
            "youtube_status": {
                "requested": wants_youtube,
                "intent_source": youtube_intent_source,
                "enabled": bool(youtube_api_key),
                "message": "",
            },
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if wants_youtube and any(
        phrase in llm_answer
        for phrase in (
            "영상은 제공할 수 없습니다",
            "영상을 제공할 수 없습니다",
            "동영상은 제공할 수 없습니다",
            "동영상을 제공할 수 없습니다",
        )
    ):
        llm_answer = "요청하신 조리 영상도 같이 찾아볼게요. 아래 영상이 뜨면 같이 확인해보세요. 다 하셨으면 말씀해 주세요."
    
    # 대화 기록 업데이트
    chat_history.append({"role": "user", "content": data.user_text})
    chat_history.append({"role": "assistant", "content": llm_answer})

    print(f"🔥 [A.X Chef]: {llm_answer}")
    queue_tts(background_tasks, llm_answer)

    youtube_status = {
        "requested": wants_youtube,
        "intent_source": youtube_intent_source,
        "enabled": bool(youtube_api_key),
        "message": "",
    }
    video_recommendation = None

    if wants_youtube and not youtube_api_key:
        youtube_status["message"] = "YouTube API 키가 설정되지 않아 영상을 가져오지 못했습니다."

    if wants_youtube and youtube_api_key:
        try:
            video_recommendation = await run_in_threadpool(
                find_best_youtube_segment,
                data.user_text,
                youtube_api_key,
            )
            if video_recommendation:
                youtube_status["message"] = "관련 유튜브 영상을 찾았습니다."
            else:
                youtube_error = get_last_youtube_error()
                youtube_status["message"] = (
                    f"YouTube API 호출 실패: {youtube_error}"
                    if youtube_error
                    else "유튜브에서 관련 영상을 찾지 못했습니다."
                )
        except Exception as e:
            print(f"⚠️ [YouTube] 추천 생성 실패: {e}")
            youtube_status["message"] = f"YouTube 추천 생성 실패: {e}"

    return {
        "answer": llm_answer,
        "rag_matches": cached_rag_matches,
        "video_recommendation": video_recommendation,
        "youtube_status": youtube_status,
    }


@app.post("/tts")
async def synthesize_speech(data: TTSData):
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어있습니다.")
    clean = re.sub(r"[^\w\s가-힣?.!,]", " ", text)[:300].strip()
    if not clean:
        raise HTTPException(status_code=400, detail="유효한 텍스트가 없습니다.")

    def _make_mp3():
        tts = gTTS(text=clean, lang="ko", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()

    audio_bytes = await run_in_threadpool(_make_mp3)
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/gesture")
async def detect_gesture(file: UploadFile = File(...)):
    if not _mediapipe_available:
        return {"gesture": "NONE"}
    image_bytes = await file.read()
    gesture = await run_in_threadpool(detect_hand_gesture, image_bytes)
    return {"gesture": gesture}


@app.post("/detect")
async def detect_ingredients_from_image(file: UploadFile = File(...)):
    if not _yolo_available:
        raise HTTPException(status_code=503, detail="YOLO 라이브러리가 설치되지 않았습니다.")
    if yolo_model is None:
        raise HTTPException(status_code=503, detail="YOLO 모델이 로드되지 않았습니다. best.pt 파일을 확인하세요.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="이미지를 읽을 수 없습니다.")

    results = await run_in_threadpool(lambda: yolo_model(img, verbose=False))

    detected = []
    seen = set()
    for box in results[0].boxes:
        confidence = float(box.conf[0])
        if confidence > 0.4:
            class_id = int(box.cls[0])
            class_name = yolo_model.names[class_id]
            if class_name not in seen:
                detected.append(class_name)
                seen.add(class_name)

    print(f"📸 [YOLO] 인식된 재료: {detected}")
    return {"ingredients": detected, "count": len(detected)}


@app.get("/community")
async def get_community_posts():
    return {"posts": community_posts}


@app.post("/community")
async def create_community_post(data: CommunityPostData):
    new_post = {
        "id": int(time.time() * 1000),
        "author": data.author.strip() or "익명",
        "title": data.title.strip(),
        "content": data.content.strip(),
        "likes": 0,
    }
    community_posts.insert(0, new_post)
    return new_post


@app.post("/community/{post_id}/like")
async def like_community_post(post_id: int):
    for post in community_posts:
        if post["id"] == post_id:
            post["likes"] += 1
            return post
    raise HTTPException(status_code=404, detail="Post not found")


@app.get("/generate-image")
async def generate_recipe_image(recipe: str = Query(...)):
    from google import genai as _genai

    gemini_api_key = get_runtime_env("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY가 설정되지 않았습니다.")

    g_client = _genai.Client(api_key=gemini_api_key)
    contents = [{"text": (
        f"A highly realistic, crisp corporate food photography of {recipe}. "
        "Consistent composition: always shot from a 45-degree overhead angle, food perfectly centered and filling 65% of the frame. "
        "High-end DSLR camera with a 50mm lens, f/2.8, showcasing vivid textures and natural glossy sheen of the food. "
        "Natural studio softbox lighting, clean micro-details, warm color temperature, subtle depth of field with a softly blurred neutral background. "
        "Every image must use the exact same framing, angle, and lighting style. No text, no people, no hands, no props."
    )}]

    try:
        resp = await run_in_threadpool(
            lambda: g_client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=contents,
            )
        )
        for part in resp.parts:
            if part.inline_data is not None:
                b64 = base64.b64encode(part.inline_data.data).decode()
                mime = part.inline_data.mime_type or "image/jpeg"
                return {"image_url": f"data:{mime};base64,{b64}"}
        return {"image_url": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# React 빌드 파일 서빙 (npm run build 후 사용)
_static_dir = FRONTEND_BUILD_DIR / "static"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="react-static")

if FRONTEND_BUILD_DIR.exists():
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        target = FRONTEND_BUILD_DIR / full_path
        if target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(FRONTEND_BUILD_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("LLM_HOST", "0.0.0.0")
    port = int(os.getenv("LLM_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
