import { useEffect, useState, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import axios from "axios";
import Webcam from "react-webcam";
import "./App.css";
import logoImg from "./로고.jpg";

const API_BASE = process.env.REACT_APP_API_URL ?? "";
const topSlideImage = "/top-slide.png";
const bottomSlideImage = "/bottom-slide.png";

const tasteOptions = [
  "매운맛",
  "담백한 맛",
  "다이어트",
  "고단백",
  "한식",
  "간편식",
  "저칼로리",
  "자취생 메뉴",
];

const recommendedRecipes = [
  {
    id: 1,
    name: "양파 계란 볶음밥",
    time: "15분",
    level: "쉬움",
    type: "한식 / 자취생 메뉴",
    ingredients: ["양파", "계란", "밥", "간장", "식용유"],
    steps: [
      { text: "양파를 잘게 썰어 팬에 넣고 2분간 볶습니다.", minutes: 2 },
      { text: "계란을 풀어 스크램블처럼 1분간 익힙니다.", minutes: 1 },
      { text: "밥을 넣고 간장으로 간을 맞춘 뒤 3분간 볶습니다.", minutes: 3 },
      { text: "마지막에 후추와 참기름을 살짝 넣어 마무리합니다.", minutes: 0 },
    ],
    videoGuide: [
      "팬을 중불로 예열한 뒤 식용유를 두릅니다.",
      "양파가 투명해질 때까지 먼저 볶습니다.",
      "계란은 팬 한쪽에서 익힌 뒤 밥과 섞습니다.",
      "밥알이 뭉치지 않게 주걱으로 눌러가며 볶습니다.",
    ],
    cautions: [
      "간장은 한 번에 많이 넣지 말고 조금씩 조절하세요.",
      "계란을 너무 오래 익히면 식감이 퍽퍽해질 수 있습니다.",
      "양파를 태우지 않도록 중불을 유지하세요.",
    ],
  },
  {
    id: 2,
    name: "삼겹살 고추장 덮밥",
    time: "20분",
    level: "보통",
    type: "매운맛 / 든든한 한 끼",
    ingredients: ["삼겹살", "고추장", "양파", "밥", "간장"],
    steps: [
      { text: "삼겹살을 한입 크기로 자릅니다.", minutes: 0 },
      { text: "팬에 삼겹살을 올리고 5분간 노릇하게 굽습니다.", minutes: 5 },
      { text: "양파와 고추장 양념을 넣고 3분간 볶습니다.", minutes: 3 },
      { text: "밥 위에 올려 덮밥 형태로 완성합니다.", minutes: 0 },
    ],
    videoGuide: [
      "삼겹살은 노릇해질 때까지 충분히 굽습니다.",
      "고추장을 넣기 전 불을 살짝 줄입니다.",
      "양념이 탈 수 있으니 물을 한두 숟가락 넣어 농도를 맞춥니다.",
    ],
    cautions: [
      "고추장은 쉽게 타므로 센 불에서 오래 볶지 마세요.",
      "삼겹살 기름이 너무 많으면 느끼할 수 있으니 일부 제거하세요.",
      "매운맛을 줄이고 싶으면 설탕을 조금 넣어도 됩니다.",
    ],
  },
  {
    id: 3,
    name: "계란 양파 간장덮밥",
    time: "10분",
    level: "매우 쉬움",
    type: "초간단 / 냉장고 털이",
    ingredients: ["계란", "양파", "밥", "간장"],
    steps: [
      { text: "양파를 얇게 썰어 팬에 넣고 2분간 볶습니다.", minutes: 2 },
      { text: "간장과 물을 조금 넣어 양파를 부드럽게 익힙니다.", minutes: 1 },
      { text: "계란을 넣고 1분간 반숙으로 익힙니다.", minutes: 1 },
      { text: "밥 위에 올려 간단한 덮밥으로 완성합니다.", minutes: 0 },
    ],
    videoGuide: [
      "양파는 얇게 썰수록 빠르게 익습니다.",
      "간장은 물과 함께 넣어 짠맛을 조절합니다.",
      "계란은 완전히 섞지 말고 살짝만 익히면 부드럽습니다.",
    ],
    cautions: [
      "간장을 한 번에 많이 넣지 마세요.",
      "계란 반숙이 부담스럽다면 완전히 익혀도 됩니다.",
      "밥이 차갑다면 전자레인지에 데운 뒤 사용하세요.",
    ],
  },
  {
    id: 4,
    name: "새우 마늘 파스타",
    time: "25분",
    level: "보통",
    type: "양식 / 간편식",
    ingredients: ["새우", "마늘", "파스타면", "올리브유"],
    steps: [
      { text: "파스타면을 끓는 물에 8분간 삶습니다.", minutes: 8 },
      { text: "팬에 올리브유와 마늘을 넣고 2분간 약불에서 볶습니다.", minutes: 2 },
      { text: "새우를 넣어 3분간 익힙니다.", minutes: 3 },
      { text: "삶은 면을 넣고 소금과 후추로 간을 맞춰 완성합니다.", minutes: 0 },
    ],
    videoGuide: [
      "마늘은 약불에서 천천히 볶아 향을 냅니다.",
      "새우는 너무 오래 익히면 질겨질 수 있습니다.",
      "면수는 조금 남겨 소스 농도를 맞출 때 사용합니다.",
    ],
    cautions: [
      "새우 알레르기가 있다면 해당 레시피는 피하세요.",
      "마늘은 쉽게 탈 수 있으니 약불을 유지하세요.",
      "면은 너무 오래 삶지 않도록 시간을 확인하세요.",
    ],
  },
];

const recipeImageQueries = [
  "korean-fried-rice",
  "spicy-rice-bowl",
  "egg-rice-bowl",
  "shrimp-garlic-pasta",
];

const homeFoodSlides = [
  { image: topSlideImage },
  { image: topSlideImage },
  { image: topSlideImage },
];

const homeBrandSlides = [
  { image: bottomSlideImage },
  { image: bottomSlideImage },
  { image: bottomSlideImage },
];

const globalIngredientList = [
  { name: "가리비", category: "해산물", note: "구이, 찜, 파스타에 잘 맞는 조개류" },
  { name: "가지", category: "채소", note: "볶음, 구이, 무침에 쓰는 보라색 채소" },
  { name: "감자", category: "채소", note: "전분이 많아 찜, 볶음, 수프에 활용" },
  { name: "강황", category: "향신료", note: "카레와 밥 색을 내는 노란 향신료" },
  { name: "계란", category: "단백질", note: "볶음밥, 찜, 부침에 두루 쓰는 기본 재료" },
  { name: "고구마", category: "채소", note: "단맛이 강한 구황작물" },
  { name: "고수", category: "허브", note: "동남아, 멕시코 요리에 쓰는 향채" },
  { name: "고추", category: "채소", note: "매운맛과 향을 더하는 재료" },
  { name: "고추장", category: "소스", note: "한국식 매운 양념장" },
  { name: "귀리", category: "곡물", note: "오트밀, 죽, 베이킹에 활용" },
  { name: "김", category: "해조류", note: "밥, 국수, 주먹밥에 곁들이는 해조류" },
  { name: "김치", category: "발효식품", note: "찌개, 볶음밥, 면 요리에 활용" },
  { name: "깻잎", category: "채소", note: "쌈, 절임, 튀김에 좋은 향채" },
  { name: "꿀", category: "감미료", note: "소스, 차, 디저트에 단맛을 더함" },
  { name: "낫토", category: "발효식품", note: "일본식 발효 콩 식품" },
  { name: "냉이", category: "채소", note: "국과 무침에 쓰는 봄나물" },
  { name: "녹두", category: "콩류", note: "빈대떡, 죽, 숙주 재배에 활용" },
  { name: "느타리버섯", category: "버섯", note: "볶음, 전골, 국에 쓰기 좋은 버섯" },
  { name: "다시마", category: "해조류", note: "육수 감칠맛을 내는 해조류" },
  { name: "단호박", category: "채소", note: "찜, 수프, 샐러드에 좋은 단맛 재료" },
  { name: "달래", category: "채소", note: "양념장과 무침에 쓰는 봄나물" },
  { name: "닭고기", category: "육류", note: "구이, 볶음, 찜, 국물 요리에 활용" },
  { name: "당근", category: "채소", note: "단맛과 색을 더하는 기본 채소" },
  { name: "대구", category: "해산물", note: "탕, 찜, 구이에 쓰는 흰살생선" },
  { name: "대파", category: "채소", note: "향을 내는 한국 요리 기본 재료" },
  { name: "된장", category: "소스", note: "찌개, 무침, 양념에 쓰는 발효장" },
  { name: "두부", category: "단백질", note: "찌개, 부침, 샐러드에 좋은 콩 식품" },
  { name: "딜", category: "허브", note: "생선, 피클, 요거트 소스에 잘 맞음" },
  { name: "땅콩", category: "견과류", note: "소스, 볶음, 디저트에 활용" },
  { name: "라임", category: "과일", note: "산미와 향을 더하는 감귤류" },
  { name: "렌틸콩", category: "콩류", note: "수프, 커리, 샐러드에 좋은 콩" },
  { name: "로즈마리", category: "허브", note: "고기, 감자, 구이에 잘 맞는 허브" },
  { name: "리코타치즈", category: "유제품", note: "샐러드, 파스타, 디저트에 활용" },
  { name: "마늘", category: "채소", note: "향과 감칠맛을 내는 핵심 향신채" },
  { name: "마요네즈", category: "소스", note: "샐러드, 샌드위치, 소스 베이스" },
  { name: "망고", category: "과일", note: "디저트, 샐러드, 소스에 활용" },
  { name: "메밀", category: "곡물", note: "국수, 전병, 죽에 쓰는 곡물" },
  { name: "멸치", category: "해산물", note: "육수와 볶음에 쓰는 작은 생선" },
  { name: "모차렐라치즈", category: "유제품", note: "피자, 오븐 요리에 녹여 쓰기 좋음" },
  { name: "무", category: "채소", note: "국, 조림, 김치, 생채에 활용" },
  { name: "문어", category: "해산물", note: "숙회, 볶음, 샐러드에 활용" },
  { name: "미나리", category: "채소", note: "탕, 무침, 전골에 향을 더함" },
  { name: "바나나", category: "과일", note: "스무디, 베이킹, 간식에 활용" },
  { name: "바질", category: "허브", note: "파스타, 피자, 페스토에 쓰는 허브" },
  { name: "밥", category: "곡물", note: "볶음밥, 덮밥, 주먹밥의 기본" },
  { name: "배추", category: "채소", note: "김치, 국, 찜에 쓰는 잎채소" },
  { name: "버터", category: "유제품", note: "구이, 베이킹, 소스에 풍미를 더함" },
  { name: "베이컨", category: "육류", note: "훈연 향과 짠맛을 더하는 가공육" },
  { name: "병아리콩", category: "콩류", note: "후무스, 샐러드, 커리에 활용" },
  { name: "보리", category: "곡물", note: "밥, 차, 죽에 활용하는 곡물" },
  { name: "복숭아", category: "과일", note: "디저트, 샐러드, 소스에 활용" },
  { name: "브로콜리", category: "채소", note: "데침, 볶음, 수프에 좋은 녹색 채소" },
  { name: "사과", category: "과일", note: "샐러드, 소스, 디저트에 활용" },
  { name: "삼겹살", category: "육류", note: "구이와 볶음에 쓰는 돼지고기 부위" },
  { name: "상추", category: "채소", note: "쌈, 샐러드에 쓰는 잎채소" },
  { name: "새우", category: "해산물", note: "볶음, 튀김, 파스타에 활용" },
  { name: "생강", category: "향신료", note: "잡내 제거와 향을 위한 뿌리 향신료" },
  { name: "소고기", category: "육류", note: "구이, 국, 볶음, 스튜에 활용" },
  { name: "소금", category: "조미료", note: "간을 맞추는 가장 기본 조미료" },
  { name: "숙주", category: "채소", note: "볶음, 쌀국수, 무침에 쓰는 아삭한 채소" },
  { name: "시금치", category: "채소", note: "무침, 국, 파스타에 활용" },
  { name: "드레싱", category: "조미료", note: "샐러드에 곁들이는 소스" },
  { name: "식용유", category: "오일", note: "볶음과 튀김에 쓰는 기본 기름" },
  { name: "쌀", category: "곡물", note: "밥, 죽, 떡의 기본 곡물" },
  { name: "아보카도", category: "과일", note: "샐러드, 토스트, 과카몰리에 활용" },
  { name: "애호박", category: "채소", note: "찌개, 볶음, 전 요리에 활용" },
  { name: "양배추", category: "채소", note: "샐러드, 볶음, 찜에 활용" },
  { name: "양상추", category: "채소", note: "샐러드와 샌드위치용 잎채소" },
  { name: "양송이버섯", category: "버섯", note: "수프, 볶음, 구이에 쓰는 버섯" },
  { name: "양파", category: "채소", note: "단맛과 향을 내는 기본 채소" },
  { name: "연어", category: "해산물", note: "구이, 회, 샐러드에 활용" },
  { name: "오레가노", category: "허브", note: "피자, 토마토 소스에 잘 맞는 허브" },
  { name: "오이", category: "채소", note: "샐러드, 냉국, 피클에 활용" },
  { name: "오징어", category: "해산물", note: "볶음, 튀김, 무침에 활용" },
  { name: "올리브유", category: "오일", note: "파스타, 샐러드, 구이에 활용" },
  { name: "우유", category: "유제품", note: "소스, 수프, 베이킹에 활용" },
  { name: "월계수잎", category: "허브", note: "스튜와 육수에 향을 더함" },
  { name: "유자", category: "과일", note: "청, 소스, 드레싱에 향을 더함" },
  { name: "잣", category: "견과류", note: "죽, 소스, 고명에 활용" },
  { name: "전복", category: "해산물", note: "죽, 구이, 찜에 활용하는 조개류" },
  { name: "조개", category: "해산물", note: "탕, 찜, 파스타에 감칠맛을 더함" },
  { name: "참기름", category: "오일", note: "고소한 향을 더하는 한국식 기름" },
  { name: "청경채", category: "채소", note: "볶음, 국물 요리에 쓰는 잎채소" },
  { name: "치킨스톡", category: "조미료", note: "국물과 소스의 감칠맛 베이스" },
  { name: "카레가루", category: "향신료", note: "카레와 볶음 요리에 쓰는 혼합 향신료" },
  { name: "코코넛밀크", category: "소스", note: "커리, 수프, 디저트에 활용" },
  { name: "콩나물", category: "채소", note: "국, 무침, 찜에 쓰는 콩 싹" },
  { name: "퀴노아", category: "곡물", note: "샐러드, 밥 대체식에 활용" },
  { name: "타임", category: "허브", note: "고기, 스튜, 구이에 향을 더함" },
  { name: "토마토", category: "채소", note: "소스, 샐러드, 스튜에 활용" },
  { name: "파", category: "채소", note: "향을 내는 기본 채소" },
  { name: "파르메산치즈", category: "유제품", note: "파스타, 샐러드에 감칠맛을 더함" },
  { name: "파스타면", category: "곡물", note: "이탈리아식 면 요리 기본 재료" },
  { name: "파프리카", category: "채소", note: "단맛과 색감을 더하는 채소" },
  { name: "팥", category: "콩류", note: "죽, 앙금, 떡에 활용" },
  { name: "표고버섯", category: "버섯", note: "육수, 볶음, 조림에 감칠맛을 더함" },
  { name: "피망", category: "채소", note: "볶음, 피자, 샐러드에 활용" },
  { name: "피스타치오", category: "견과류", note: "디저트, 샐러드, 소스에 활용" },
  { name: "한천", category: "가공식품", note: "젤리와 디저트 응고제로 활용" },
  { name: "호두", category: "견과류", note: "베이킹, 샐러드, 소스에 활용" },
  { name: "호박씨", category: "견과류", note: "샐러드, 그래놀라, 고명에 활용" },
  { name: "홍합", category: "해산물", note: "탕, 찜, 파스타에 활용" },
  { name: "후추", category: "향신료", note: "매운 향을 더하는 기본 향신료" },
].sort((a, b) => a.name.localeCompare(b.name, "ko"));

const ingredientCategories = ["전체", ...Array.from(new Set(globalIngredientList.map((item) => item.category))).sort((a, b) => a.localeCompare(b, "ko"))];
const ingredientInitials = [
  "전체",
  "가",
  "나",
  "다",
  "라",
  "마",
  "바",
  "사",
  "아",
  "자",
  "차",
  "카",
  "타",
  "파",
  "하",
];

const getKoreanInitialGroup = (text = "") => {
  const char = text.charCodeAt(0);
  if (char < 0xac00 || char > 0xd7a3) return text[0] || "";
  const initials = ["가", "까", "나", "다", "따", "라", "마", "바", "빠", "사", "싸", "아", "자", "짜", "차", "카", "타", "파", "하"];
  const initial = initials[Math.floor((char - 0xac00) / 588)];
  if (["까"].includes(initial)) return "가";
  if (["따"].includes(initial)) return "다";
  if (["빠"].includes(initial)) return "바";
  if (["싸"].includes(initial)) return "사";
  if (["짜"].includes(initial)) return "자";
  return initial;
};

const getIngredientBuyLinks = (name) => {
  const q = encodeURIComponent(name);
  return [
    { label: "네이버쇼핑", url: `https://search.shopping.naver.com/search/all?query=${q}` },
    { label: "쿠팡", url: `https://www.coupang.com/np/search?q=${q}` },
    { label: "마켓컬리", url: `https://www.kurly.com/search?sword=${q}` },
    { label: "SSG", url: `https://www.ssg.com/search.ssg?target=all&query=${q}` },
  ];
};

const getRecipeImageUrl = (recipe, index = 0) => {
  if (recipe.image) return recipe.image;

  const searchableText = [
    recipe.name,
    recipe.type,
    ...(recipe.ingredients || []),
  ]
    .join(" ")
    .toLowerCase();

  let query = recipeImageQueries[index % recipeImageQueries.length];
  if (searchableText.includes("pasta") || searchableText.includes("파스타")) {
    query = "shrimp-garlic-pasta";
  } else if (searchableText.includes("rice") || searchableText.includes("밥")) {
    query = "korean-rice-bowl";
  } else if (searchableText.includes("egg") || searchableText.includes("계란")) {
    query = "egg-rice-bowl";
  } else if (searchableText.includes("shrimp") || searchableText.includes("새우")) {
    query = "shrimp-dish";
  }

  return `https://source.unsplash.com/640x420/?${query},food`;
};

const initialFavoriteRecipes = [
  { ...recommendedRecipes[0], savedAt: "기본 저장" },
  { ...recommendedRecipes[1], savedAt: "기본 저장" },
];

const initialRecentRecipes = [
  { ...recommendedRecipes[0], viewedAt: "최근 추천" },
  { ...recommendedRecipes[1], viewedAt: "어제" },
  { ...recommendedRecipes[3], viewedAt: "3일 전" },
];

const initialCommunityPosts = [
  {
    id: 1,
    author: "자취요리왕",
    title: "남은 양파로 만드는 초간단 계란덮밥",
    content:
      "양파를 먼저 충분히 볶고 계란을 마지막에 넣으면 달달하고 부드러운 덮밥이 됩니다. 간장은 조금씩 넣는 게 좋아요.",
    likes: 12,
  },
  {
    id: 2,
    author: "냉장고털이러",
    title: "고추장 하나로 삼겹살 덮밥 맛내기",
    content:
      "삼겹살 기름을 조금만 남긴 뒤 고추장, 간장, 설탕을 넣고 볶으면 자취생용 덮밥 소스로 충분합니다.",
    likes: 8,
  },
];

const stepperSteps = [
  { id: 1, title: "STEP 1. 사용자 정보" },
  { id: 2, title: "STEP 2. 재료 입력" },
  { id: 3, title: "STEP 3. 레시피 추천" },
];


function transformBackendRecipe(recipe, index) {
  const ingredientsList =
    typeof recipe.ingredients === "string"
      ? recipe.ingredients.split(",").map((i) => i.trim()).filter(Boolean)
      : Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];

  const stepsRaw = typeof recipe.steps === "string" ? recipe.steps : "";
  // 줄바꿈으로 먼저 나누고, 한 줄이면 "1. ... 2. ..." 형식으로 재분리
  let rawLines = stepsRaw.split(/\n+/).filter(Boolean);
  if (rawLines.length <= 1 && stepsRaw) {
    rawLines = stepsRaw.split(/(?=\d+[.)]\s)/).filter(Boolean);
  }
  const stepsList = rawLines
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean)
    .map((text) => ({ text, minutes: 0 }));

  return {
    id: index + 1,
    name: recipe.title || recipe.name || "레시피",
    time: recipe.time || "약 20분",
    level: recipe.level || "보통",
    type:
      recipe.source_type === "AI_Chef"
        ? "AI 생성 레시피"
        : recipe.source_type || "추천 레시피",
    ingredients: ingredientsList,
    steps:
      stepsList.length > 0
        ? stepsList
        : [{ text: recipe.steps || "조리 방법을 확인하세요.", minutes: 0 }],
    videoGuide: recipe.videoGuide || [],
    cautions: recipe.cautions || [],
  };
}

function Stepper({ currentStep }) {
  const activeStep = Math.min(Math.max(currentStep, 1), stepperSteps.length);

  return (
    <div className="silver-stepper">
      <div className="silver-stepper-inner">
        <div className="silver-stepper-line-bg" />
        <div
          className="silver-stepper-line-active"
          style={{
            width: `${((activeStep - 1) / (stepperSteps.length - 1)) * 100}%`,
          }}
        />

        {stepperSteps.map((step) => {
          const isDone = activeStep > step.id;
          const isActive = activeStep === step.id;
          const isUnlocked = activeStep >= step.id;

          return (
            <div key={step.id} className="silver-step">
              <div
                className={
                  isUnlocked ? "silver-step-circle active" : "silver-step-circle"
                }
              >
                <span>{step.id}</span>
              </div>

              <div className="silver-step-text">
                <span
                  className={
                    isUnlocked ? "silver-step-status active" : "silver-step-status"
                  }
                >
                  {isActive ? "IN PROGRESS" : isDone ? "COMPLETED" : "LOCKED"}
                </span>
                <span
                  className={
                    isUnlocked ? "silver-step-title active" : "silver-step-title"
                  }
                >
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimerBox({ minutes, label }) {
  const initialSeconds = minutes * 60;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    setSeconds(initialSeconds);
    setRunning(false);
  }, [initialSeconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="timer-box">
      <div>
        <p className="timer-label">{label}</p>
        <h4>
          {mm}:{ss}
        </h4>
      </div>

      <div className="timer-actions">
        <button onClick={() => setRunning(true)}>시작</button>
        <button onClick={() => setRunning(false)}>일시정지</button>
        <button
          onClick={() => {
            setRunning(false);
            setSeconds(initialSeconds);
          }}
        >
          초기화
        </button>
      </div>
    </div>
  );
}

function SimpleTimer({ minutes = 1, setMinutes = () => {}, label = "타이머" }) {
  const [inputMinutes, setInputMinutesLocal] = useState(minutes);
  const initialSeconds = Math.max(0, Number(inputMinutes) || 0) * 60;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    setSeconds(initialSeconds);
    setRunning(false);
  }, [initialSeconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="timer-box">
      <div>
        <p className="timer-label">{label}</p>
        <h4>
          {mm}:{ss}
        </h4>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        <div style={{display: 'flex', gap: 8}}>
          <input
            type="number"
            min={0}
            value={inputMinutes}
            onChange={(e) => setInputMinutesLocal(Number(e.target.value))}
            style={{width: 72, padding: 6, borderRadius: 8, border: '1px solid #ddd'}}
          />
          <button
            onClick={() => {
              setMinutes(Number(inputMinutes) || 0);
              setSeconds((Number(inputMinutes) || 0) * 60);
            }}
            className="toolbar-btn"
          >
            설정
          </button>
        </div>

        <div className="timer-actions">
          <button onClick={() => setRunning(true)}>시작</button>
          <button onClick={() => setRunning(false)}>일시정지</button>
          <button
            onClick={() => {
              setRunning(false);
              setSeconds((Number(inputMinutes) || 0) * 60);
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [splashPhase, setSplashPhase] = useState('show');

  useEffect(() => {
    const t1 = setTimeout(() => setSplashPhase('logo-exit'),     2200);
    const t2 = setTimeout(() => setSplashPhase('loading'),       2600);
    const t3 = setTimeout(() => setSplashPhase('screen-exit'),   4600);
    const t4 = setTimeout(() => setSplashPhase('done'),          5100);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const [selectedTastes, setSelectedTastes] = useState([]);
  const [allergy, setAllergy] = useState("");
  const [dietGoal, setDietGoal] = useState("");
  const [textIngredients, setTextIngredients] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [ingredientExpiries, setIngredientExpiries] = useState({});
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [yoloIngredients, setYoloIngredients] = useState(new Set());
  const [checkedBasicIngredients, setCheckedBasicIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [showRecognizedList, setShowRecognizedList] = useState(false);
  const [page, setPage] = useState("home");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const [recentRecipeList, setRecentRecipeList] = useState(initialRecentRecipes);
  const [selectedRecentRecipe, setSelectedRecentRecipe] = useState(null);

  const [favoriteRecipeList, setFavoriteRecipeList] =
    useState(initialFavoriteRecipes);
  const [selectedFavoriteRecipe, setSelectedFavoriteRecipe] = useState(null);

  const [todayMenu, setTodayMenu] = useState(
    () => recommendedRecipes[Math.floor(Math.random() * recommendedRecipes.length)]
  );

  const [communityPosts, setCommunityPosts] = useState(initialCommunityPosts);
  const [postAuthor, setPostAuthor] = useState("testuser");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientCategory, setIngredientCategory] = useState("전체");
  const [ingredientInitial, setIngredientInitial] = useState("전체");

  const [recognitionStatus, setRecognitionStatus] = useState(
    "AI 셰프가 설계 중입니다..."
  );
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [recipeInteractionInput, setRecipeInteractionInput] = useState("");
  const [recipeVoicePreview, setRecipeVoicePreview] = useState("");
  const [recipeInteractionMessages, setRecipeInteractionMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "추천받은 레시피나 재료에 대해 궁금한 점을 물어보세요.",
    },
  ]);
  const [currentCookingStep, setCurrentCookingStep] = useState(0);
  const [showFavoritePrompt, setShowFavoritePrompt] = useState(false);

  const [homeHelpOpen, setHomeHelpOpen] = useState(false);

  const [backendRecipes, setBackendRecipes] = useState([]);
  const [recipeImages, setRecipeImages] = useState({});
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecipeInteractionLoading, setIsRecipeInteractionLoading] = useState(false);

  const [videoRecommendation, setVideoRecommendation] = useState(null);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(2);
  const [isListening, setIsListening] = useState(false);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [inputGestureLabel, setInputGestureLabel] = useState("대기중");
  const [inputCountdown, setInputCountdown] = useState(null);

  const webcamGestureRef = useRef(null);
  const inputCameraRef = useRef(null);
  const gestureActionRef = useRef(null);
  const inputGestureBusyRef = useRef(false);
  const fetchingImagesRef = useRef({});
  const recipeInteractionChatRef = useRef(null);
  const chatBottomRef = useRef(null);
  const generationIdRef = useRef(0);
  const inputGestureCooldownRef = useRef({});
  const handleGetRecipesRef = useRef(null);
  const currentIngredientsRef = useRef([]);
  const gestureCooldownRef = useRef({});
  const gestureBusyRef = useRef(false);
  const cameraDetectBusyRef = useRef(false);
  const fileInputRef = useRef(null);
  const youtubeRef = useRef(null);

  const fetchRecipeImage = async (recipeName) => {
    if (recipeImages[recipeName] || fetchingImagesRef.current[recipeName]) return;
    fetchingImagesRef.current[recipeName] = true;
    try {
      const res = await axios.get(`${API_BASE}/generate-image`, { params: { recipe: recipeName } });
      if (res.data.image_url) {
        setRecipeImages(prev => ({ ...prev, [recipeName]: res.data.image_url }));
      }
    } catch {} finally {
      delete fetchingImagesRef.current[recipeName];
    }
  };
  const speechRecRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const ttsAbortRef = useRef(null);
  const bgmRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ttsSourceRef = useRef(null);
  const ttsSeqRef = useRef(0);

  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      audioCtxRef.current.resume().catch(() => {});
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  useEffect(() => {
    if (page === "recipeLoading") {
      const audio = new Audio("/cooking_bgm.wav");
      audio.loop = true;
      audio.volume = 0.5;
      bgmRef.current = audio;
      audio.play().catch(() => {});
    } else {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    }
  }, [page]);

  useEffect(() => {
    if (!selectedRecipe) return;

    setCurrentCookingStep(0);
    setChatMessages([
      {
        id: 1,
        role: "assistant",
        text: `${selectedRecipe.name} 조리를 시작할게요. 현재 1단계는 "${selectedRecipe.steps[0]?.text}" 입니다. 궁금한 점을 물어보세요.`,
      },
    ]);
  }, [selectedRecipe]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/community`)
      .then((res) => setCommunityPosts(res.data.posts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  }, [recipeInteractionMessages]);

  useEffect(() => {
    if ((page === "recipeDetail" || page === "recipe") && selectedRecipe) {
      setIsGestureActive(true);
    } else {
      setIsGestureActive(false);
      setCurrentGesture(null);
    }
  }, [page, selectedRecipe]);


  // inputChoice 제스처 폴링
  useEffect(() => {
    if (page !== "inputChoice") return;
    inputGestureBusyRef.current = false;
    inputGestureCooldownRef.current = {};
    const canvas = document.createElement("canvas");
    let timeoutId;
    const gestureIcons = { PEACE: "✌️ 인식중", OPEN_HAND: "🖐 대기중", NONE: "대기중" };
    const canTrigger = (name) => {
      const now = Date.now();
      if ((now - (inputGestureCooldownRef.current[name] || 0)) < 2500) return false;
      inputGestureCooldownRef.current[name] = now;
      return true;
    };
    const startCountdown = (cb) => {
      let count = 3;
      setInputCountdown(count);
      const timer = setInterval(() => {
        count--;
        if (count <= 0) { clearInterval(timer); setInputCountdown(null); cb(); }
        else setInputCountdown(count);
      }, 1000);
    };
    const poll = async () => {
      const video = inputCameraRef.current?.video;
      if (!inputGestureBusyRef.current && video && video.readyState >= 2 && video.srcObject) {
        inputGestureBusyRef.current = true;
        try {
          canvas.width = 320; canvas.height = 240;
          canvas.getContext("2d").drawImage(video, 0, 0, 320, 240);
          const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.5));
          const form = new FormData();
          form.append("file", blob, "gesture.jpg");
          const res = await fetch(`${API_BASE}/gesture`, { method: "POST", body: form });
          const data = await res.json();
          const g = data.gesture || "NONE";
          setInputGestureLabel(gestureIcons[g] || "대기중");
          if (g === "PEACE" && canTrigger("detect")) {
            startCountdown(async () => {
              const v = inputCameraRef.current?.video;
              if (!v) return;
              const c = document.createElement("canvas");
              c.width = 640; c.height = 480;
              c.getContext("2d").drawImage(v, 0, 0, 640, 480);
              c.toBlob(async (b) => {
                if (!b) return;
                const fd = new FormData(); fd.append("file", b, "snap.jpg");
                try {
                  const r = await fetch(`${API_BASE}/detect`, { method: "POST", body: fd });
                  const d = await r.json();
                  const newIngs = d.ingredients || [];
                  setDetectedIngredients(prev => Array.from(new Set([...prev, ...newIngs])));
                  setYoloIngredients(prev => new Set([...prev, ...newIngs]));
                } catch {}
              }, "image/jpeg", 0.85);
            });
          }
        } catch {}
        inputGestureBusyRef.current = false;
      }
      timeoutId = setTimeout(poll, 400);
    };
    timeoutId = setTimeout(poll, 400);
    return () => { clearTimeout(timeoutId); setInputGestureLabel("대기중"); setInputCountdown(null); };
  }, [page]);


  // vision_worker.py 폴링
  const _visionIngKeyRef = useRef("");
  useEffect(() => {
    const earlyPages = ["home", "userInfo", "inputChoice"];
    if (!earlyPages.includes(page)) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/health`);
        const ings = res.data.current_ingredients || [];
        const key = [...ings].sort().join(",");
        if (ings.length > 0 && key !== _visionIngKeyRef.current) {
          _visionIngKeyRef.current = key;
          setDetectedIngredients(ings);
          setIsRecipeLoading(true);
          const genId = ++generationIdRef.current;
          goPage("recipeLoading");
          try {
            const r = await axios.post(`${API_BASE}/vision`, { ingredients: ings, action: "confirm" });
            if (generationIdRef.current !== genId) return;
            const raw = r.data.recipes || [];
            if (raw.length > 0) {
              const transformed = raw.map(transformBackendRecipe);
              setBackendRecipes(transformed);
              transformed.forEach(recipe => fetchRecipeImage(recipe.name));
            }
          } catch {}
          if (generationIdRef.current !== genId) return;
          setIsRecipeLoading(false);
          goPage("recognition");
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [page]);

  useEffect(() => {
    // YOLO 자동 폴링 비활성화 (SE 흐름: PEACE 제스처로만 실행)
    if (page !== "inputChoice") return;
    return;

    const canvas = document.createElement("canvas");
    let timeoutId;

    const pollCameraIngredients = async () => {
      const video = inputCameraRef.current?.video;
      if (
        !cameraDetectBusyRef.current &&
        video?.readyState === 4 &&
        video.videoWidth > 0
      ) {
        cameraDetectBusyRef.current = true;
        try {
          canvas.width = 640;
          canvas.height = 480;
          canvas.getContext("2d").drawImage(video, 0, 0, 640, 480);
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.7)
          );

          if (blob) {
            const form = new FormData();
            form.append("file", blob, "camera-frame.jpg");
            const res = await fetch(`${API_BASE}/detect`, {
              method: "POST",
              body: form,
            });

            if (res.ok) {
              const data = await res.json();
              const nextIngredients = data.ingredients || [];
              if (nextIngredients.length > 0) {
                setDetectedIngredients((prev) =>
                  Array.from(new Set([...prev, ...nextIngredients]))
                );
              }
            }
          }
        } catch (err) {
          console.error("camera ingredient detection failed:", err);
        } finally {
          cameraDetectBusyRef.current = false;
        }
      }

      timeoutId = setTimeout(pollCameraIngredients, 1600);
    };

    timeoutId = setTimeout(pollCameraIngredients, 1000);
    return () => clearTimeout(timeoutId);
  }, [page]);

  const speakText = useCallback(async (text) => {
    if (!isTTSEnabled || !text?.trim()) return;

    // 이전 재생 중단
    if (ttsSourceRef.current) {
      try { ttsSourceRef.current.stop(); } catch {}
      ttsSourceRef.current = null;
    }

    const mySeq = ++ttsSeqRef.current;

    try {
      const res = await axios.post(`${API_BASE}/tts`, { text }, { responseType: "arraybuffer" });
      if (mySeq !== ttsSeqRef.current) return; // 더 최신 요청 있으면 무시

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      await audioCtxRef.current.resume();

      const buffer = await audioCtxRef.current.decodeAudioData(res.data.slice(0));
      if (mySeq !== ttsSeqRef.current) return;

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1.3;
      source.connect(audioCtxRef.current.destination);
      ttsSourceRef.current = source;
      source.onended = () => { if (ttsSourceRef.current === source) ttsSourceRef.current = null; };
      source.start(0);
    } catch (err) {
      console.error("TTS play failed:", err);
    }
  }, [isTTSEnabled]);

  const pauseYoutube = () => {
    youtubeRef.current?.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
  };

  const toggleListening = () => {
    if (isListening) { speechRecRef.current?.abort(); setIsListening(false); return; }
    pauseYoutube();
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { alert("음성 인식을 지원하지 않는 브라우저입니다."); return; }
    const rec = new SpeechRec();
    rec.lang = "ko-KR"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      handleSendCookingChat(text);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    speechRecRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  const toggleRecipeInteractionListening = () => {
    if (isListening) {
      speechRecRef.current?.abort();
      setIsListening(false);
      return;
    }
    pauseYoutube();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("음성 인식을 지원하지 않는 브라우저입니다.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      setRecipeVoicePreview(text);
      if (result.isFinal) {
        setRecipeVoicePreview("");
        handleSendRecipeInteractionChat(text);
      }
    };
    rec.onend = () => {
      setRecipeVoicePreview("");
      setIsListening(false);
    };
    rec.onerror = () => {
      setRecipeVoicePreview("");
      setIsListening(false);
    };
    speechRecRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  useEffect(() => {
    if (!isGestureActive) {
      setCurrentGesture(null);
      return;
    }
    gestureBusyRef.current = false;
    gestureCooldownRef.current = {};
    const canvas = document.createElement("canvas");

    const canAct = (name) => {
      const now = Date.now();
      if ((now - (gestureCooldownRef.current[name] || 0)) < 2500) return false;
      gestureCooldownRef.current[name] = now;
      return true;
    };

    let timeoutId;
    const poll = async () => {
      const video = webcamGestureRef.current?.video;
      if (!gestureBusyRef.current && video?.readyState === 4 && video.videoWidth > 0) {
        gestureBusyRef.current = true;
        try {
          canvas.width = 320;
          canvas.height = 240;
          canvas.getContext("2d").drawImage(video, 0, 0, 320, 240);
          const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.5));
          const form = new FormData();
          form.append("file", blob, "gesture.jpg");
          const res = await fetch(`${API_BASE}/gesture`, { method: "POST", body: form });
          const data = await res.json();
          const g = data.gesture;
          setCurrentGesture(g && g !== "NONE" ? g : null);
          if (g && g !== "NONE" && canAct(g)) {
            gestureActionRef.current?.(g);
          }
        } catch {}
        gestureBusyRef.current = false;
      }
      timeoutId = setTimeout(poll, 400);
    };

    timeoutId = setTimeout(poll, 400);
    return () => clearTimeout(timeoutId);
  }, [isGestureActive]);

  const getCurrentStep = () => {
    if (page === "userInfo") return 1;
    if (page === "inputChoice" || page === "recognizing" || page === "recognition")
      return 2;
    if (page === "recipe" || page === "recipeDetail") return 3;
    return 1;
  };

  const showStepper = [
    "recipeDetail",
  ].includes(page);

  const stopTTS = () => {
    if (ttsSourceRef.current) {
      try { ttsSourceRef.current.stop(); } catch {}
      ttsSourceRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      if (ttsAudioRef.current._url) URL.revokeObjectURL(ttsAudioRef.current._url);
      ttsAudioRef.current = null;
    }
  };

  const goPage = (nextPage) => {
    setHomeHelpOpen(false);
    stopTTS();
    if (nextPage === "home") {
      setDetectedIngredients([]);
      setYoloIngredients(new Set());
      setCheckedBasicIngredients([]);
      setBackendRecipes([]);
      setTextIngredients("");
      setImagePreview(null);
      setSelectedRecipe(null);
      setChatMessages([]);
      setRecipeInteractionMessages([{ id: 1, role: "assistant", text: "추천받은 레시피나 재료에 대해 궁금한 점을 물어보세요." }]);
      setVideoRecommendation(null);
      generationIdRef.current += 1;
      _visionIngKeyRef.current = "";
      axios.post(`${API_BASE}/reset`).catch(() => {});
    }
    setPage(nextPage);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      const mainEl = document.querySelector(".main");
      if (mainEl) {
        mainEl.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 0);
  };

  const handleCameraDone = () => {
    try {
      console.log("[UI] camera done clicked");
    } catch {}
    goPage("confirmFavorite");
  };

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const startRecognitionFlow = ({ preview = null, items = [] }) => {
    setBackendRecipes([]);
    setImagePreview(preview);
    setDetectedIngredients(items);
    goPage("recognition");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBackendRecipes([]);
    inputGestureBusyRef.current = true;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE}/detect`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const found = res.data.ingredients || [];
      setDetectedIngredients(prev => Array.from(new Set([...prev, ...found])));
      setYoloIngredients(new Set(found));
    } catch (err) {
      console.error("재료 인식 실패:", err);
    } finally {
      inputGestureBusyRef.current = false;
    }
  };

  const textIngredientList = textIngredients
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const currentIngredientClasses = Array.from(
    new Set([...detectedIngredients, ...textIngredientList])
  );
  currentIngredientsRef.current = currentIngredientClasses;

  const recognitionRecommendedRecipes = (
    backendRecipes
  ).slice(0, 4);

  const activeInteractionRecipe =
    selectedRecipe || recognitionRecommendedRecipes[0] || recommendedRecipes[0];
  const filteredIngredientList = globalIngredientList.filter((ingredient) => {
    const matchesCategory =
      ingredientCategory === "전체" || ingredient.category === ingredientCategory;
    const matchesInitial =
      ingredientInitial === "전체" ||
      getKoreanInitialGroup(ingredient.name) === ingredientInitial;
    const query = ingredientSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      ingredient.name.toLowerCase().includes(query) ||
      ingredient.category.toLowerCase().includes(query) ||
      ingredient.note.toLowerCase().includes(query);
    return matchesCategory && matchesInitial && matchesSearch;
  });

  const handleExpiryChange = (ingredient, value) => {
    setIngredientExpiries((prev) => ({
      ...prev,
      [ingredient]: value,
    }));
  };

  const handleAddIngredient = () => {
    const trimmed = newIngredient.trim();
    if (!trimmed) return;

    if (!detectedIngredients.includes(trimmed)) {
      setDetectedIngredients((prev) => [...prev, trimmed]);
    }

    setNewIngredient("");
  };

  const handleDeleteIngredient = (ingredient) => {
    setDetectedIngredients((prev) => prev.filter((item) => item !== ingredient));

    setIngredientExpiries((prev) => {
      const copied = { ...prev };
      delete copied[ingredient];
      return copied;
    });
  };

  const handleTextIngredientNext = () => {
    const parsed = textIngredients
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (parsed.length === 0) return;

    startRecognitionFlow({
      preview: null,
      items: parsed,
    });
  };

  const addToRecentHistory = (recipe) => {
    const historyItem = { ...recipe, viewedAt: "방금 전" };

    setRecentRecipeList((prev) => {
      const filtered = prev.filter((item) => item.name !== recipe.name);
      return [historyItem, ...filtered].slice(0, 5);
    });
  };

  const addToFavorites = (recipe) => {
    const favoriteItem = { ...recipe, savedAt: "방금 저장" };

    setFavoriteRecipeList((prev) => {
      const exists = prev.some((item) => item.name === recipe.name);
      if (exists) return prev;
      return [favoriteItem, ...prev].slice(0, 8);
    });
  };

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    addToRecentHistory(recipe);
    goPage("recipeDetail");
  };

  const handleStartRecipeInteraction = (recipe) => {
    setSelectedRecipe(recipe);
    setCurrentCookingStep(0);
    addToRecentHistory(recipe);
    const firstStep = recipe.steps?.[0]?.text || "";
    const initialText = firstStep
      ? `${recipe.name} 조리를 시작할게요. 먼저 1단계부터 해볼게요. ${firstStep}`
      : `${recipe.name} 조리를 시작할게요. 궁금한 점은 음성으로 물어보세요.`;
    setRecipeInteractionMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: initialText,
      },
    ]);
    goPage("recipe");
    speakText(stripMarkdown(initialText));
  };

  const handleOpenRecentRecipe = (recipe) => {
    setSelectedRecentRecipe(recipe);
    goPage("recentDetail");
  };

  const handleOpenFavoriteRecipe = (recipe) => {
    setSelectedFavoriteRecipe(recipe);
    goPage("favoriteDetail");
  };

  const handleOpenRecipeGuide = (recipe) => {
    setSelectedRecipe(recipe);
    addToRecentHistory(recipe);
    goPage("recipeDetail");
  };

  const handleShuffleTodayMenu = () => {
    const candidates = recommendedRecipes.filter(
      (recipe) => recipe.name !== todayMenu.name
    );

    const next =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      recommendedRecipes[0];

    setTodayMenu(next);
  };

  const isCompletionPhrase = (text) => {
    const normalized = text
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\./g, "");
    const completionWords = [
      "완료",
      "완성",
      "다했어",
      "다 했어",
      "종료",
      "그만",
      "끝",
      "끝났어",
      "끝냈어",
      "finish",
      "done",
      "complete",
      "finished",
    ];
    return completionWords.some((word) => normalized.includes(word));
  };

  const handleGetRecipes = async () => {
    const ings = currentIngredientsRef.current;
    if (ings.length === 0) return;
    setIsRecipeLoading(true);
    const genId = ++generationIdRef.current;
    goPage("recipeLoading");
    try {
      const res = await axios.post(`${API_BASE}/vision`, {
        ingredients: ings,
        action: "confirm",
        allergy: allergy || "",
        diet_goal: dietGoal || "",
        tastes: selectedTastes || [],
      });
      if (generationIdRef.current !== genId) return;
      const raw = res.data.recipes || [];
      if (raw.length > 0) {
        const transformed = raw.map(transformBackendRecipe);
        setBackendRecipes(transformed);
        const imageResults = await Promise.all(
          transformed.map(async (r) => {
            try {
              const res = await axios.get(`${API_BASE}/generate-image`, { params: { recipe: r.name } });
              return { name: r.name, url: res.data.image_url || null };
            } catch {
              return { name: r.name, url: null };
            }
          })
        );
        const imageMap = {};
        imageResults.forEach(({ name, url }) => { if (url) imageMap[name] = url; });
        flushSync(() => setRecipeImages(prev => ({ ...prev, ...imageMap })));
      }
    } catch (err) {
      console.error("레시피 요청 실패:", err);
    } finally {
      if (generationIdRef.current === genId) {
        setIsRecipeLoading(false);
        goPage("recognition");
      }
    }
  };
  handleGetRecipesRef.current = handleGetRecipes;

  const isNextStepText = (text) => /(다음|넘어가|계속|그다음|next)/i.test(text);
  const stripMarkdown = (text) => text.replace(/[*#\-_`>]/g, "").replace(/\n{2,}/g, "\n").trim();

  const handleSendRecipeInteractionChat = async (presetQuestion = "") => {
    if (isRecipeInteractionLoading) return;

    const question = (presetQuestion || recipeInteractionInput).trim();
    if (!question) return;

    setRecipeInteractionMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: question },
    ]);
    setRecipeInteractionInput("");

    // SE 로직: "다음" 음성 명령 → 단계 진행
    if (selectedRecipe && isNextStepText(question)) {
      const nextStep = Math.min(currentCookingStep + 1, selectedRecipe.steps.length - 1);
      if (nextStep !== currentCookingStep) {
        setCurrentCookingStep(nextStep);
        const stepText = selectedRecipe.steps[nextStep].text;
        const msg = `${nextStep + 1}단계입니다. ${stepText}`;
        setRecipeInteractionMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "assistant", text: msg },
        ]);
        speakText(msg);
      } else {
        const doneMsg = "마지막 단계입니다. 맛있게 드세요!";
        setRecipeInteractionMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "assistant", text: doneMsg },
        ]);
        speakText(doneMsg);
      }
      return;
    }

    setIsRecipeInteractionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ask`, {
        user_text: question,
        ingredients: currentIngredientClasses,
        current_step: currentCookingStep + 1,
        total_steps: selectedRecipe?.steps?.length || 0,
        recipe_name: selectedRecipe?.name || "",
      });
      const rawAnswer = res.data.answer || "응답을 받지 못했습니다.";
      const answer = stripMarkdown(rawAnswer);
      const video = res.data.video_recommendation || null;
      setRecipeInteractionMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: answer, video },
      ]);
      speakText(answer);
    } catch {
      setRecipeInteractionMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "AI와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsRecipeInteractionLoading(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const res = await axios.post(`${API_BASE}/community/${postId}/like`);
      setCommunityPosts((prev) =>
        prev.map((item) => (item.id === postId ? res.data : item))
      );
    } catch {
      setCommunityPosts((prev) =>
        prev.map((item) =>
          item.id === postId ? { ...item, likes: item.likes + 1 } : item
        )
      );
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) return;

    const postData = {
      author: postAuthor.trim() || "익명",
      title: postTitle.trim(),
      content: postContent.trim(),
    };

    try {
      const res = await axios.post(`${API_BASE}/community`, postData);
      setCommunityPosts((prev) => [res.data, ...prev]);
    } catch {
      setCommunityPosts((prev) => [
        { id: Date.now(), ...postData, likes: 0 },
        ...prev,
      ]);
    }
    setPostTitle("");
    setPostContent("");
  };

  const generateCookingReply = (question, recipe, stepIndex) => {
    const q = question.toLowerCase();
    const currentStepText =
      recipe.steps[stepIndex]?.text || "현재 단계를 확인 중입니다.";

    if (q.includes("현재") || q.includes("지금")) {
      return `현재는 ${stepIndex + 1}단계입니다. ${currentStepText}`;
    }

    if (q.includes("다음")) {
      if (stepIndex >= recipe.steps.length - 1) {
        return `지금 단계가 마지막 단계입니다. ${currentStepText}`;
      }
      return `다음은 ${stepIndex + 2}단계입니다. ${
        recipe.steps[stepIndex + 1].text
      }`;
    }

    if (q.includes("이전")) {
      if (stepIndex <= 0) {
        return `지금은 첫 단계예요. ${currentStepText}`;
      }
      return `이전 단계는 ${stepIndex}단계입니다. ${
        recipe.steps[stepIndex - 1].text
      }`;
    }

    if (q.includes("재료")) {
      return `이 요리에 필요한 재료는 ${recipe.ingredients.join(", ")} 입니다.`;
    }

    if (q.includes("시간") || q.includes("몇 분")) {
      return `전체 예상 시간은 ${recipe.time} 정도예요. 타이머가 필요한 단계는 화면의 타이머를 활용하면 됩니다.`;
    }

    if (q.includes("주의") || q.includes("조심")) {
      return `주의사항은 ${recipe.cautions.join(" / ")} 입니다.`;
    }

    if (q.includes("팁") || q.includes("방법") || q.includes("영상")) {
      return `요리 팁을 알려드릴게요. ${
        recipe.videoGuide[Math.min(stepIndex, recipe.videoGuide.length - 1)]
      }`;
    }

    return `좋아요. 현재 ${stepIndex + 1}단계 진행 중입니다. "${currentStepText}"를 먼저 해보세요. 필요하면 "다음 단계", "재료", "주의사항"처럼 물어보세요.`;
  };

  const handleSendCookingChat = async (presetQuestion = "") => {
    if (!selectedRecipe || isChatLoading) return;

    const question = (presetQuestion || chatInput).trim();
    if (!question) return;

    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: question },
    ]);
    setChatInput("");

    if (isCompletionPhrase(question)) {
      setShowFavoritePrompt(true);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "요리를 마치셨나요? 완료 후에 이 레시피를 즐겨찾기에 추가할 수 있어요.",
        },
      ]);
      return;
    }

    setIsChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/ask`, {
        user_text: question,
        ingredients: selectedRecipe.ingredients || [],
      });
      const answer = res.data.answer || "응답을 받지 못했습니다.";
      const video = res.data.video_recommendation || null;
      if (video) setVideoRecommendation(video);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: answer, video },
      ]);
      speakText(answer);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: "AI 셰프에 연결할 수 없습니다. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleMoveCookingStep = (direction) => {
    if (!selectedRecipe) return;

    const nextStep = Math.max(
      0,
      Math.min(currentCookingStep + direction, selectedRecipe.steps.length - 1)
    );

    if (nextStep === currentCookingStep) return;

    setCurrentCookingStep(nextStep);
    const stepText = selectedRecipe.steps[nextStep].text;
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "assistant", text: `${nextStep + 1}단계로 안내할게요. ${stepText}` },
    ]);
    speakText(`${nextStep + 1}단계입니다. ${stepText}`);
  };

  gestureActionRef.current = (gesture) => {
    if (gesture === "OPEN_HAND") {
      stopTTS();
      if (page === "recipe") toggleRecipeInteractionListening();
      else if (page === "recipeDetail") toggleListening();
    }
    else if (gesture === "THUMBS_UP") handleMoveCookingStep(1);
    else if (gesture === "PEACE") {
      const text = selectedRecipe?.steps[currentCookingStep]?.text;
      if (text) speakText(text);
    }
  };

  return (
    <>
    {splashPhase !== 'done' && (
      <div className={`splash-screen${splashPhase === 'screen-exit' ? ' splash-exiting' : ''}`}>
        {(splashPhase === 'show' || splashPhase === 'logo-exit') && (
          <div className={`splash-content${splashPhase === 'logo-exit' ? ' splash-exiting' : ''}`}>
            <div className="splash-coin">
              <img src={logoImg} alt="VisionChef" className="splash-logo-img" />
            </div>
            <div className="splash-title">VISIONCHEF</div>
            <div className="splash-sub">AI 요리 가이드</div>
            <div className="splash-bar"><div className="splash-bar-fill" /></div>
          </div>
        )}

        
        {(splashPhase === 'loading' || splashPhase === 'screen-exit') && (
          <div className="loading-content">
            <div className="loading-text">로딩 중...</div>
          </div>
        )}
      </div>
    )}
    <div className={`app app-single page-${page}`}>
      <main className="main">
        {showStepper && <Stepper currentStep={getCurrentStep()} />}

        {page === "home" && (
          <section className="hero-section home-only-hero">
            <div className="hero-marquee-top">
              <div className="marquee-track marquee-track-right">
                {homeFoodSlides.concat(homeFoodSlides).map((slide, index) => (
                  <div
                    className="marquee-item"
                    key={`${slide.title}-${index}`}
                    style={{ backgroundImage: `url(${slide.image})` }}
                  />
                ))}
              </div>
            </div>

            <div className="hero-copy hero-copy-centered">
              <div className="hero-buttons hero-main-button-only">
                <button
                  className="primary-btn hero-start-btn"
                  onClick={() => goPage("userInfo")}
                >
                  AI 레시피 추천 시작
                </button>
              </div>
            </div>

            <div className="hero-marquee-bottom">
              <div className="brand-marquee-track marquee-track-right slow">
                {homeBrandSlides.concat(homeBrandSlides).map((item, index) => (
                  <div
                    className="brand-marquee-item"
                    key={`${item.label}-${index}`}
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                ))}
              </div>
            </div>

            <div
              className="home-help-menu"
              onMouseLeave={() => setHomeHelpOpen(false)}
            >
              <button
                className="home-help-circle"
                onClick={() => setHomeHelpOpen((prev) => !prev)}
                aria-label="도움말 메뉴 열기"
              >
                ?
              </button>

              <div
                className="home-help-dropdown"
                style={{ display: homeHelpOpen ? "flex" : undefined }}
              >
                <button onClick={() => goPage("service")}>
                  서비스 소개 보기
                </button>
                <button onClick={() => goPage("gesture")}>
                  제스처 기능 보기
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "userInfo" && (
          <section className="user-info-page glass-card readable-card">
            <div className="recognition-header">
              <div>
                <p className="sub-title">USER INFO</p>
                <h2>체크 항목</h2>
                <p>
                  사용자의 식습관, 선호도, 알레르기 정보를 바탕으로 더 적합한
                  레시피를 추천합니다.
                </p>
              </div>
            </div>

            <div className="user-info-layout">
              <div className="basic-ingredient-check">
                <div className="basic-section-head">
                  <p className="sub-title">BASIC INGREDIENTS</p>
                  <h3>기본 재료 체크</h3>
                  <p>
                    요리 시작 전, 아래 기본 재료가 준비되었는지 확인하세요.
                    부족한 재료가 있으면 먼저 준비한 뒤 다음 단계로 이동합니다.
                  </p>
                </div>
                <div className="ingredient-check-list">
                  {["진간장", "국간장", "설탕", "소금", "후추", "참기름", "드레싱", "밥", "식용유", "깨"].map(item => (
                    <label className="ingredient-check-item" key={item}>
                      <input
                        type="checkbox"
                        checked={checkedBasicIngredients.includes(item)}
                        onChange={(e) => {
                          if (e.target.checked) setCheckedBasicIngredients(prev => [...prev, item]);
                          else setCheckedBasicIngredients(prev => prev.filter(i => i !== item));
                        }}
                      /> {item}
                    </label>
                  ))}
                </div>
              </div>

              <div className="user-info-form">
                <label className="input-label">선호 및 목표</label>
                <input
                  className="dark-input"
                  placeholder="예: 다이어트, 근육 증가, 간단한 요리"
                  value={dietGoal}
                  onChange={(e) => setDietGoal(e.target.value)}
                />

                <label className="input-label">알레르기 정보</label>
                <input
                  className="dark-input"
                  placeholder="예: 새우, 땅콩, 우유"
                  value={allergy}
                  onChange={(e) => setAllergy(e.target.value)}
                />

                <label className="input-label">선호 취향</label>
                <div className="chip-list">
                  {tasteOptions.map((taste) => (
                    <button
                      key={taste}
                      className={selectedTastes.includes(taste) ? "chip active" : "chip"}
                      onClick={() =>
                        toggleItem(taste, selectedTastes, setSelectedTastes)
                      }
                    >
                      {taste}
                    </button>
                  ))}
                </div>

                <div className="button-row user-info-actions">
                  <button className="outline-btn" onClick={() => goPage("home")}>
                    이전
                  </button>
                  <button className="primary-btn" onClick={() => {
                    if (checkedBasicIngredients.length > 0) {
                      setDetectedIngredients(prev => Array.from(new Set([...prev, ...checkedBasicIngredients])));
                    }
                    goPage("inputChoice");
                  }}>
                    다음 단계로 이동
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {page === "inputChoice" && (
          <section className="input-choice-page glass-card readable-card">
            <div className="recognition-header">
              <div>
                <p className="sub-title">INGREDIENT INPUT</p>
                <h2>재료 인식</h2>
                <p>
                  카메라, 이미지 업로드, 텍스트로 재료를 추가하고 아래에서
                  인식된 재료를 확인하세요.
                </p>
              </div>

              <button
                className="outline-btn small-btn"
                onClick={() => goPage("userInfo")}
              >
                이전으로 돌아가기
              </button>
            </div>

            <div className="input-choice-page">
              <div className="camera-section">
                <h3>카메라 화면</h3>
                <div className="camera-preview-box-large">
                  <Webcam
                    ref={inputCameraRef}
                    className="input-camera-webcam"
                    audio={false}
                    mirrored={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "environment" }}
                  />

                  {inputCountdown !== null && (
                    <div className="gesture-countdown">{inputCountdown}</div>
                  )}
                  <div className="camera-detected-layer">
                    <span className="camera-live-pill">{inputGestureLabel}</span>
                    <div className="camera-chip-list">
                      {currentIngredientClasses.length > 0 ? (
                        currentIngredientClasses.map((ingredient) => (
                          <button
                            className={`camera-ingredient-chip${yoloIngredients.has(ingredient) ? ' yolo-detected' : ''}`}
                            key={ingredient}
                            onClick={() => handleDeleteIngredient(ingredient)}
                            title="삭제"
                          >
                            {ingredient}
                          </button>
                        ))
                      ) : (
                        <span className="camera-empty-chip">
                          재료를 비추면 인식 결과가 표시됩니다
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="input-choice-nav-buttons">
                    <button className="outline-btn" onClick={() => goPage("userInfo")}>
                      이전
                    </button>
                    <button className="primary-btn" onClick={handleGetRecipes}>
                      다음 단계로 이동
                    </button>
                  </div>
                </div>

              </div>

              <div className="camera-bottom-controls">
                <label className="mode-action-btn">
                  이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
                <div className="mode-text-entry">
                  <input
                    className="dark-input"
                    placeholder="재료 직접 입력"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddIngredient();
                    }}
                  />
                  <button className="mode-add-btn" onClick={handleAddIngredient}>
                    추가
                  </button>
                </div>
              </div>

              <div className="input-choice-bottom-bar">
                <label className="small-action-btn">
                  이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                  />
                </label>

                <label className="small-action-btn">
                  카메라 열기
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>

                <button
                  className={`small-action-btn recognized-toggle ${showRecognizedList ? 'active' : ''}`}
                  onClick={() => setShowRecognizedList(!showRecognizedList)}
                >
                  인식된 재료
                  {currentIngredientClasses.length > 0 && (
                    <span className="ingredient-badge">{currentIngredientClasses.length}</span>
                  )}
                </button>
              </div>

              <div className="text-input-section">
                <div className="text-input-group">
                  <input
                    className="dark-input"
                    placeholder="직접 추가할 재료 입력"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddIngredient();
                      }
                    }}
                  />
                  <button className="primary-btn" onClick={handleAddIngredient}>
                    추가
                  </button>
                </div>
              </div>

              {showRecognizedList && (
                <div className="recognized-modal-overlay">
                  <div className="recognized-modal">
                    <div className="modal-header">
                      <h3>인식된 재료</h3>
                      <button className="close-btn" onClick={() => setShowRecognizedList(false)}>
                        ✕
                      </button>
                    </div>
                    <div className="modal-content">
                      {currentIngredientClasses.length > 0 ? (
                        <div className="modal-ingredients-list">
                          {currentIngredientClasses.map((ingredient) => (
                            <div className="modal-ingredient-item" key={ingredient}>
                              <div className="ingredient-info">
                                <strong>{ingredient}</strong>
                                <span>유통기한: {ingredientExpiries[ingredient] || "미정"}</span>
                              </div>
                              <button
                                className="delete-btn-modal"
                                onClick={() => handleDeleteIngredient(ingredient)}
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          아직 등록된 재료가 없습니다.
                        </div>
                      )}
                    </div>
                    <div className="modal-actions">
                      <button className="outline-btn" onClick={() => setShowRecognizedList(false)}>
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {page === "recipeLoading" && (
          <section className="recognizing-page">
            <div className="recognizing-overlay-card">
              <div className="loading-orbit" style={{marginBottom: '28px'}}>
                <div className="loading-emoji e1">🥕</div>
                <div className="loading-emoji e2">🧅</div>
                <div className="loading-emoji e3">🥩</div>
                <div className="loading-emoji e4">🫑</div>
                <div className="loading-emoji e5">🧄</div>
                <div className="loading-emoji e6">🍅</div>
                <div className="loading-emoji e7">🥦</div>
              </div>
              <h2>지글지글 맛있는 레시피 생성중</h2>
              <span>잠시만 기다려주세요...</span>
            </div>
          </section>
        )}


                {page === "service" && (
          <section className="service-detail glass-card readable-card">
            <div className="service-detail-header">
              <div>
                <p className="sub-title">GUIDE</p>
                <h2>가이드 메뉴</h2>
                <p className="service-main-desc">
                  서비스 소개와 제스처 기능을 각각 선택하여 자세한 안내를
                  확인할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="guide-menu-grid">
              <button className="guide-menu-card" onClick={() => goPage("serviceIntro") }>
                <div className="guide-menu-icon">💡</div>
                <h3>서비스 소개</h3>
                <p>AI 레시피 추천 서비스가 어떤 과정을 거쳐 동작하는지 확인합니다.</p>
              </button>

              <button className="guide-menu-card" onClick={() => goPage("gesture") }>
                <div className="guide-menu-icon">🖐️</div>
                <h3>제스처 기능</h3>
                <p>손 제스처로 요리 단계를 제어하는 방법과 사용 예시를 확인합니다.</p>
              </button>
            </div>
          </section>
        )}

        {page === "serviceIntro" && (
          <section className="service-detail glass-card readable-card">
            <div className="service-detail-header">
              <div>
                <p className="sub-title">SERVICE INTRO</p>
                <h2>서비스 소개</h2>
                <p className="service-main-desc">
                  이 서비스는 자취생이나 바쁜 사용자가 냉장고 속 재료만으로
                  오늘 만들 수 있는 요리를 빠르게 찾을 수 있도록 돕는 AI 레시피
                  추천 웹 서비스입니다.
                </p>
              </div>

              <button className="outline-btn small-btn" onClick={() => goPage("service") }>
                가이드 메뉴로 돌아가기
              </button>
            </div>

            <div className="service-flow">
              <div className="flow-step">사용자 정보 입력</div>
              <div className="flow-line" />
              <div className="flow-step">재료 입력</div>
              <div className="flow-line" />
              <div className="flow-step">맞춤 레시피 추천</div>
            </div>

            <div className="gesture-actions">
              <button className="primary-btn" onClick={() => goPage("service") }>
                제스처 기능 보기
              </button>
              <button className="primary-btn" onClick={() => goPage("userInfo")}>
                AI ?덉떆??異붿쿇 ?쒖옉
              </button>
              <button className="outline-btn" onClick={() => goPage("home") }>
                홈으로 돌아가기
              </button>
            </div>
          </section>
        )}

        {page === "gesture" && (

          <section className="gesture-page glass-card readable-card">
            <div className="gesture-header">
              <div>
                <p className="sub-title">GESTURE INTERACTION</p>
                <h2>손 제스처 기반 요리 상호작용</h2>
                <p>
                  요리 중 손이 젖거나 더러워져 화면을 직접 터치하기 어려운
                  상황을 고려하여, 카메라 기반 손 제스처 인식으로 조리 과정을
                  제어할 수 있도록 설계했습니다.
                </p>
              </div>

            </div>

            <div className="gesture-intro-card">
              <div className="gesture-logo-box">
                <div className="gesture-logo-mark">M</div>
                <h3>MediaPipe</h3>
                <p>
                  손 관절 랜드마크를 실시간으로 추출하여 사용자의 손동작을
                  인식합니다.
                </p>
              </div>

              <div className="gesture-desc-box">
                <p className="sub-title">WHY GESTURE?</p>
                <h3>요리 중 비접촉 조작</h3>
                <p>
                  조리 중에는 손에 물, 기름, 양념이 묻기 때문에 화면 터치가
                  불편합니다. 제스처 인식을 사용하면 사용자는 손동작만으로 다음
                  단계 이동, 현재 단계 확인, 조리 가이드 제어를 수행할 수
                  있습니다.
                </p>
              </div>
            </div>

            <div className="gesture-flow-grid">
              <div className="gesture-step-card">
                <div className="gesture-step-number">01</div>
                <div className="gesture-image-placeholder peace">
                  <span>✌️</span>
                  <strong>PEACE</strong>
                </div>
                <h3>CV 모델 호출</h3>
                <p>
                  카메라 화면에서 손을 감지하고, 손가락 관절 좌표를 기반으로
                  제스처를 분류합니다.
                </p>
              </div>

              <div className="gesture-step-card">
                <div className="gesture-step-number">02</div>
                <div className="gesture-image-placeholder thumbs">
                  <span>👍</span>
                  <strong>THUMBS UP</strong>
                </div>
                <h3>제스처 명령 변환</h3>
                <p>
                  인식된 제스처를 “다음 단계”, “확인”, “일시정지” 같은 조리
                  명령으로 변환합니다.
                </p>
              </div>

              <div className="gesture-step-card">
                <div className="gesture-step-number">03</div>
                <div className="gesture-image-placeholder palm">
                  <span>🖐️</span>
                  <strong>OPEN PALM</strong>
                </div>
                <h3>AI 조리 가이드 제어</h3>
                <p>
                  변환된 명령을 조리 가이드와 LLM 상호작용 영역에 전달하여
                  사용자가 화면을 만지지 않고 요리를 진행할 수 있게 합니다.
                </p>
              </div>
            </div>

            <div className="gesture-command-table">
              <h3>제스처별 기능 예시</h3>

              <div className="gesture-command-row">
                <strong>✌️ Peace</strong>
                <span>현재 단계 다시 안내</span>
              </div>

              <div className="gesture-command-row">
                <strong>👍 Thumbs Up</strong>
                <span>다음 조리 단계로 이동</span>
              </div>

              <div className="gesture-command-row">
                <strong>🖐️ Open Palm</strong>
                <span>타이머 일시정지 또는 대기</span>
              </div>
            </div>

            <div className="gesture-actions">
              <button className="outline-btn" onClick={() => goPage("service")}>
                서비스 소개 보기
              </button>
              <button className="primary-btn" onClick={() => goPage("userInfo")}>
                AI 레시피 추천 시작
              </button>
            </div>
          </section>
        )}

        {page === "recognition" && (
          <section className="recognition-page glass-card readable-card">
            <div className="recognition-header">
              <div>
                <p className="sub-title">INGREDIENT RECOGNITION</p>
                <h2>추천레시피</h2>
                <p>
                  인식된 재료를 바탕으로 지금 만들 수 있는 추천레시피 4가지를
                  확인하고 바로 조리를 시작할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="recognition-recipe-grid">
              {recognitionRecommendedRecipes.map((recipe, index) => (
                <div className="recognition-recipe-card" key={recipe.id || recipe.name}>
                  <div className="recognition-recipe-image">
                    {recipeImages[recipe.name] ? (
                      <img src={recipeImages[recipe.name]} alt={recipe.name} loading="lazy" />
                    ) : (
                      <img src={getRecipeImageUrl(recipe, index)} alt={recipe.name} loading="lazy" />
                    )}
                  </div>
                  <div className="recipe-rank">TOP {index + 1}</div>
                  <h3>{recipe.name}</h3>
                  <div className="recognition-recipe-meta">
                    <span>{recipe.time}</span>
                    <span>{recipe.level}</span>
                  </div>
                  <p className="recognition-recipe-type">{recipe.type}</p>
                  <div className="recognition-recipe-section">
                    <strong>사용 재료</strong>
                    <p>{recipe.ingredients.join(", ")}</p>
                  </div>
                  <div className="recipe-card-actions">
                    <button
                      className="recipe-select-btn"
                      onClick={() => handleStartRecipeInteraction(recipe)}
                    >
                      레시피로 요리하기
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="recommendation-bottom-nav">
              <button className="outline-btn" onClick={() => goPage("inputChoice")}>
                이전
              </button>
            </div>

            <div className="recognition-layout">
              <div className="recognition-image-card">
                <div className="circle-title">인식 이미지</div>

                <div className="image-circle">
                  {imagePreview ? (
                    <img src={imagePreview} alt="uploaded ingredient" />
                  ) : (
                    <div className="image-placeholder">
                      <span>NO IMAGE</span>
                      <p>이미지 없이 텍스트 재료로 진행 중입니다.</p>
                    </div>
                  )}
                </div>

                <button
                  className="outline-btn full"
                  onClick={() => goPage("inputChoice")}
                >
                  재료 다시 입력하기
                </button>
              </div>

              <div className="recognition-list-card">
                <div className="circle-title">인식 재료 리스트</div>

                <div className="recognized-list">
                  {currentIngredientClasses.length === 0 ? (
                    <p className="expiry-empty">
                      아직 인식된 재료가 없습니다. 이미지를 업로드하거나 텍스트로
                      재료를 입력해 주세요.
                    </p>
                  ) : (
                    currentIngredientClasses.map((ingredient) => (
                      <div className="recognized-item" key={ingredient}>
                        <div>
                          <strong>{ingredient}</strong>
                          <span>인식된 재료</span>
                        </div>

                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteIngredient(ingredient)}
                        >
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="ingredient-edit-box">
                  <p className="edit-title">재료 추가</p>
                  <div className="add-row">
                    <input
                      className="dark-input"
                      placeholder="예: 양파, 계란, 두부"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddIngredient();
                      }}
                    />
                    <button className="primary-btn" onClick={handleAddIngredient}>
                      추가
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="recognition-bottom">
              <div className="expiry-panel">
                <div className="panel-header mini-header">
                  <div>
                    <p className="sub-title">EXPIRY DATE</p>
                    <h2>재료별 유통기한 입력</h2>
                  </div>
                </div>

                {currentIngredientClasses.length === 0 ? (
                  <p className="expiry-empty">
                    인식된 재료가 생기면 재료별 유통기한을 입력할 수 있습니다.
                  </p>
                ) : (
                  <div className="expiry-list recognition-expiry-list">
                    {currentIngredientClasses.map((ingredient) => (
                      <div className="expiry-item" key={ingredient}>
                        <span>{ingredient}</span>
                        <input
                          className="dark-input expiry-input"
                          type="date"
                          value={ingredientExpiries[ingredient] || ""}
                          onChange={(e) =>
                            handleExpiryChange(ingredient, e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="recipe-action-panel">
                <p className="sub-title">NEXT STEP</p>
                <h2>레시피 추천받기</h2>
                <p>
                  인식된 재료, 선호 취향, 알레르기, 유통기한 정보를 바탕으로
                  만들 수 있는 요리를 추천합니다.
                </p>

                <button
                  className="primary-btn full recommend-btn"
                  onClick={handleGetRecipes}
                  disabled={isRecipeLoading || currentIngredientClasses.length === 0}
                >
                  {isRecipeLoading ? "레시피 검색 중..." : "AI 레시피 추천받기"}
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "confirmFavorite" && (
          <section className="confirm-fav-page glass-card readable-card">
            <div className="recognition-header">
              <div>
                <p className="sub-title">CONFIRM</p>
                <h2>요리 완료</h2>
                <p>
                  {selectedRecipe
                    ? `${selectedRecipe.name}을(를) 즐겨찾기에 추가할까요?`
                    : `현재 보고 계신 내용을 즐겨찾기에 추가할까요?`}
                </p>
              </div>
            </div>

            <div className="confirm-fav-actions">
              <button
                className="primary-btn"
                onClick={() => {
                  if (selectedRecipe) addToFavorites(selectedRecipe);
                  goPage("home");
                }}
              >
                YES
              </button>

              <button
                className="outline-btn"
                onClick={() => goPage("home")}
              >
                NO
              </button>

              <button
                className="outline-btn"
                onClick={() => goPage("home")}
              >
                홈으로 가기
              </button>
            </div>
          </section>
        )}

        {page === "today" && (
          <section className="today-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">TODAY AI PICK</p>
                <h2>오늘의 요리 추천</h2>
                <p>
                  AI가 오늘 만들기 좋은 메뉴를 임의로 추천합니다. 마음에 들지
                  않으면 다른 메뉴를 다시 추천받을 수 있습니다.
                </p>
              </div>

            </div>

            <div className="today-main-card">
              <p className="today-menu-kicker">AI RANDOM PICK</p>
              <h3>{todayMenu.name}</h3>
              <p className="today-main-desc">{todayMenu.type}</p>

              <div className="today-main-meta">
                <span>{todayMenu.time}</span>
                <span>{todayMenu.level}</span>
              </div>

              <div className="today-main-section">
                <h4>사용 재료</h4>
                <p>{todayMenu.ingredients.join(", ")}</p>
              </div>

              <div className="today-main-section">
                <h4>간단 조리 흐름</h4>
                <ol>
                  {todayMenu.steps.map((step, index) => (
                    <li key={index}>{step.text}</li>
                  ))}
                </ol>
              </div>

              <div className="today-main-actions">
                <button className="outline-btn" onClick={handleShuffleTodayMenu}>
                  다른 메뉴 추천받기
                </button>

                <button
                  className="primary-btn"
                  onClick={() => handleOpenRecipeGuide(todayMenu)}
                >
                  이 메뉴로 요리하기
                </button>

                <button className="outline-btn" onClick={() => addToFavorites(todayMenu)}>
                  즐겨찾기 저장
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "recipe" && (
          <section className="recipe-page recipe-page-bright">
            <div className="recipe-interaction-screen">
              <button
                className="interaction-back-btn"
                onClick={() => goPage("recognition")}
              >
                이전 단계
              </button>

              <div className="recipe-live-camera">
                <Webcam
                  ref={webcamGestureRef}
                  className="recipe-live-webcam"
                  audio={false}
                  mirrored={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                />
                <div className="recipe-gesture-hint">
                  {currentGesture === "OPEN_HAND" ? "🎤 듣는 중..." : "🖐 손바닥 = 음성 입력"}
                </div>
              </div>

              <div className="recipe-ai-chat-panel">
                  <div className="recipe-ai-chat-head">
                    <div>
                      <p className="sub-title">AI COOKING CHAT</p>
                      <h2>AI 상호작용</h2>
                    </div>

                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                      <button
                        className={`toolbar-btn${isTTSEnabled ? " active" : ""}`}
                        onClick={() => setIsTTSEnabled((prev) => !prev)}
                        title={isTTSEnabled ? "음성 출력 끄기" : "음성 출력 켜기"}
                        aria-label={isTTSEnabled ? "음성 출력 켜짐" : "음성 출력 꺼짐"}
                      >
                        {isTTSEnabled ? "🔊" : "🔇"}
                      </button>

                      <button
                        className={`toolbar-btn${showTimer ? " active" : ""}`}
                        onClick={() => setShowTimer((v) => !v)}
                        title="타이머 열기"
                      >
                        타이머
                      </button>
                    </div>
                  </div>

                {showTimer && (
                  <div style={{marginTop: 10}}>
                    <SimpleTimer
                      minutes={timerMinutes}
                      setMinutes={(m) => setTimerMinutes(m)}
                      label={timerMinutes > 0 ? `${timerMinutes}분 타이머` : "타이머"}
                    />
                  </div>
                )}

                <div className="chat-message-list recipe-interaction-messages" ref={recipeInteractionChatRef}>
                  {recipeInteractionMessages.map((message) => (
                    <div key={message.id} className={`chat-bubble ${message.role}`}>
                      {message.video?.embed_url ? (
                        <div className="chat-video-card">
                          <iframe
                            src={`${message.video.embed_url}${message.video.embed_url.includes('?') ? '&' : '?'}autoplay=1&playsinline=1&enablejsapi=1`}
                            title={message.video.title || "YouTube 영상"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                          <a href={message.video.url} target="_blank" rel="noreferrer">
                            {message.video.title || "YouTube 영상 보기"}
                          </a>
                        </div>
                      ) : (
                        <div>{message.text}</div>
                      )}
                    </div>
                  ))}
                  {isRecipeInteractionLoading && (
                    <div className="chat-bubble assistant">AI가 응답 중입니다...</div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {isListening && (
                  <div className="voice-live-preview">
                    <div className="voice-wave-mini" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <span>{recipeVoicePreview || "음성을 듣고 있습니다..."}</span>
                  </div>
                )}

                <div className="recipe-composer-row">
                  <button
                    className={`mic-btn${isListening ? " listening" : ""}`}
                    onClick={toggleRecipeInteractionListening}
                    title="음성으로 질문"
                  >
                    {isListening ? "●" : "🎤"}
                  </button>
                  <input
                    className="dark-input"
                    placeholder="추천 레시피, 재료, 조리 방법을 물어보세요"
                    value={recipeInteractionInput}
                    onChange={(e) => setRecipeInteractionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendRecipeInteractionChat();
                    }}
                  />
                  <button
                    className="primary-btn"
                    onClick={() => handleSendRecipeInteractionChat()}
                    disabled={isRecipeInteractionLoading}
                  >
                    전송
                  </button>
                </div>
              </div>
            </div>

            <div className="recipe-header">
              <div>
                <p className="sub-title">RECIPE RECOMMENDATION</p>
                <h2>레시피 추천 화면</h2>
                <p>
                  인식된 재료와 사용자의 취향 정보를 기반으로 지금 만들 수 있는
                  레시피를 추천합니다.
                </p>
              </div>

              <button
                className="outline-btn small-btn"
                onClick={() => goPage("recognition")}
              >
                재료 화면으로 돌아가기
              </button>
            </div>

            <div className="recipe-paper">
              <div className="recipe-paper-title">레시피</div>

              <div className="recipe-summary-list">
                {(backendRecipes).map((recipe) => (
                  <div className="recipe-summary-item" key={recipe.id}>
                    <div className="recipe-rank">TOP {recipe.id}</div>

                    <div className="recipe-main-info">
                      <h3>{recipe.name}</h3>
                      <ul>
                        <li>
                          <strong>음식명</strong>
                          <span>{recipe.name}</span>
                        </li>
                        <li>
                          <strong>조리시간</strong>
                          <span>{recipe.time}</span>
                        </li>
                        <li>
                          <strong>난이도</strong>
                          <span>{recipe.level}</span>
                        </li>
                        <li>
                          <strong>종류</strong>
                          <span>{recipe.type}</span>
                        </li>
                      </ul>

                      <div className="recipe-card-actions">
                        <button
                          className="recipe-select-btn"
                          onClick={() => handleSelectRecipe(recipe)}
                        >
                          이 레시피로 요리하기
                        </button>
                      </div>
                    </div>

                    <div className="recipe-detail-box">
                      <div>
                        <h4>사용 재료</h4>
                        <p>{recipe.ingredients.join(", ")}</p>
                      </div>

                      <div>
                        <h4>간단 조리법</h4>
                        <ol>
                          {recipe.steps.map((step, index) => (
                            <li key={index}>{step.text}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="recipe-bottom-actions">
              <button className="outline-btn" onClick={() => goPage("home")}>
                홈으로 가기
              </button>
            </div>
          </section>
        )}

        {page === "recipeDetail" && selectedRecipe && (
          <section className="recipe-detail-page recipe-page-bright">
            <div className="recipe-detail-page-header">
              <div>
                <p className="sub-title">COOKING GUIDE</p>
                <h2>{selectedRecipe.name}</h2>
                <p>
                  선택한 레시피의 실제 조리 단계입니다. 타이머가 필요한 단계는
                  바로 시간을 재면서 요리할 수 있고, 아래 실시간 질문/응답
                  영역에서 AI와 상호작용할 수 있습니다.
                </p>
              </div>

              <div className="recipe-detail-toolbar">
                <button
                  className={`toolbar-btn${isTTSEnabled ? " active" : ""}`}
                  onClick={() => setIsTTSEnabled((v) => !v)}
                  title="AI 음성 안내"
                >
                  {isTTSEnabled ? "🔊 음성 켜짐" : "🔇 음성 꺼짐"}
                </button>
              </div>
              <button className="outline-btn small-btn" onClick={() => goPage("recipe")}>
                레시피 목록으로 돌아가기
              </button>
            </div>

            <div className="current-step-banner">
              <p>현재 진행 단계</p>
              <h3>
                STEP {currentCookingStep + 1} / {selectedRecipe.steps.length}
              </h3>
              <span>{selectedRecipe.steps[currentCookingStep]?.text}</span>

              <div className="current-step-controls">
                <button className="outline-btn" onClick={() => handleMoveCookingStep(-1)}>
                  이전 단계
                </button>
                <button className="primary-btn" onClick={() => handleMoveCookingStep(1)}>
                  다음 단계
                </button>
              </div>
            </div>

            <div className="cooking-guide-layout">
              <div className="guide-column">
                <div className="guide-column-title">방법</div>
                <div className="guide-content-list">
                  {selectedRecipe.steps.map((step, index) => (
                    <div
                      className={`guide-content-item ${
                        index === currentCookingStep ? "active-step" : ""
                      }`}
                      key={index}
                    >
                      <span>{index + 1}</span>
                      <div>
                        <p>{step.text}</p>
                        {step.minutes > 0 && (
                          <TimerBox
                            minutes={step.minutes}
                            label={`${step.minutes}분 타이머`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="guide-column">
                <div className="guide-column-title">영상방법 / 요리 가이드</div>
                <div className="guide-content-list">
                  {selectedRecipe.videoGuide.map((guide, index) => (
                    <div className="guide-content-item" key={index}>
                      <span>{index + 1}</span>
                      <p>{guide}</p>
                    </div>
                  ))}
                </div>

                {videoRecommendation ? (
                  <div className="youtube-embed-box">
                    <div className="youtube-embed-title">{videoRecommendation.title}</div>
                    <iframe
                      ref={youtubeRef}
                      src={`${videoRecommendation.embed_url}${videoRecommendation.embed_url.includes('?') ? '&' : '?'}autoplay=1&playsinline=1&enablejsapi=1`}
                      title={videoRecommendation.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="video-placeholder-box">
                    <div className="play-icon">▶</div>
                    <p>요리 관련 유튜브 영상을 보고 싶으면 채팅에서 "영상 보여줘"라고 입력하세요.</p>
                  </div>
                )}
              </div>

              <div className="guide-column caution-column">
                <div className="guide-column-title">주의사항</div>
                <div className="guide-content-list">
                  {selectedRecipe.cautions.map((caution, index) => (
                    <div className="guide-content-item caution-item" key={index}>
                      <span>!</span>
                      <p>{caution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cooking-chat-panel">
              <div className="cooking-chat-header">
                <div>
                  <p className="sub-title">LIVE COOKING ASSISTANT</p>
                  <h3>실시간 질문 / 응답</h3>
                  <p>
                    요리 중 궁금한 점을 물어보면 AI가 현재 단계 기준으로 바로
                    응답합니다.
                  </p>
                </div>
              </div>

              <div className="quick-question-row">
                <button onClick={() => handleSendCookingChat("현재 단계 알려줘")}>
                  현재 단계
                </button>
                <button onClick={() => handleSendCookingChat("다음 단계 알려줘")}>
                  다음 단계
                </button>
                <button onClick={() => handleSendCookingChat("주의사항 알려줘")}>
                  주의사항
                </button>
                <button onClick={() => handleSendCookingChat("재료 알려줘")}>
                  재료 확인
                </button>
              </div>

              <div className="chat-message-list">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`chat-bubble ${message.role}`}>
                    <div>{message.text}</div>
                    {message.video?.embed_url && (
                      <div className="chat-video-card">
                        <iframe
                          src={`${message.video.embed_url}?autoplay=1&mute=1`}
                          title={message.video.title || "YouTube 영상"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <a href={message.video.url} target="_blank" rel="noreferrer">
                          {message.video.title || "YouTube 영상"}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="chat-bubble assistant">
                    AI 셰프가 답변 중입니다...
                  </div>
                )}
              </div>

              <div className="chat-input-row">
                <button
                  className={`mic-btn${isListening ? " listening" : ""}`}
                  onClick={toggleListening}
                  title="음성으로 질문"
                >
                  {isListening ? "🔴" : "🎤"}
                </button>
                <input
                  className="dark-input"
                  placeholder="예: 지금 뭐 하면 돼?, 다음 단계 알려줘, 주의사항은?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendCookingChat();
                  }}
                />
                <button
                  className="primary-btn"
                  onClick={() => handleSendCookingChat()}
                  disabled={isChatLoading}
                >
                  {isChatLoading ? "답변 중..." : "전송"}
                </button>
              </div>
            </div>

            <div className="cooking-guide-actions">
              <button className="outline-btn" onClick={() => goPage("recipe")}>
                다른 레시피 보기
              </button>
              <button
                className="outline-btn"
                onClick={() => {
                  if (selectedRecipe) {
                    addToFavorites(selectedRecipe);
                  }
                  goPage("home");
                }}
              >
                완료 후 즐겨찾기
              </button>
              <button className="primary-btn" onClick={() => goPage("home")}>
                요리 완료
              </button>
            </div>

            <div className="gesture-overlay">
              <Webcam
                ref={webcamGestureRef}
                className="gesture-webcam"
                mirrored
                videoConstraints={{ facingMode: "user", width: 240, height: 180 }}
              />
              <div className={`gesture-label${currentGesture ? " detected" : ""}`}>
                {currentGesture === "THUMBS_UP" && "👍 다음 단계"}
                {currentGesture === "PEACE" && "✌️ 다시 읽기"}
                {!currentGesture && "제스처 대기 중..."}
              </div>
            </div>
          </section>
        )}

        {page === "recent" && (
          <section className="recent-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">RECENT HISTORY</p>
                <h2>최근 기록</h2>
                <p>이전에 추천받았거나 확인했던 레시피를 다시 볼 수 있습니다.</p>
              </div>

            </div>

            <div className="recent-grid">
              {recentRecipeList.map((recipe) => (
                <button
                  key={recipe.name}
                  className="recent-card"
                  onClick={() => handleOpenRecentRecipe(recipe)}
                >
                  <div>
                    <p className="recent-card-label">{recipe.viewedAt}</p>
                    <h3>{recipe.name}</h3>
                    <p>{recipe.type}</p>
                  </div>

                  <div className="recent-card-meta">
                    <span>{recipe.time}</span>
                    <span>{recipe.level}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === "recentDetail" && selectedRecentRecipe && (
          <section className="recent-detail-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">RECENT RECIPE</p>
                <h2>{selectedRecentRecipe.name}</h2>
                <p>최근 기록에서 다시 불러온 레시피입니다.</p>
              </div>

              <button className="outline-btn small-btn" onClick={() => goPage("recent")}>
                최근 기록 목록
              </button>
            </div>

            <div className="recent-detail-card">
              <div className="recent-detail-main">
                <h3>{selectedRecentRecipe.name}</h3>

                <ul>
                  <li>
                    <strong>조리시간</strong>
                    <span>{selectedRecentRecipe.time}</span>
                  </li>
                  <li>
                    <strong>난이도</strong>
                    <span>{selectedRecentRecipe.level}</span>
                  </li>
                  <li>
                    <strong>종류</strong>
                    <span>{selectedRecentRecipe.type}</span>
                  </li>
                  <li>
                    <strong>사용 재료</strong>
                    <span>{selectedRecentRecipe.ingredients.join(", ")}</span>
                  </li>
                </ul>
              </div>

              <div className="recent-detail-actions">
                <button
                  className="primary-btn"
                  onClick={() => handleOpenRecipeGuide(selectedRecentRecipe)}
                >
                  이 레시피 조리 가이드 보기
                </button>

                <button
                  className="outline-btn"
                  onClick={() => addToFavorites(selectedRecentRecipe)}
                >
                  즐겨찾기 저장
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "favorite" && (
          <section className="favorite-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">FAVORITE RECIPES</p>
                <h2>즐겨찾기</h2>
                <p>저장해 둔 레시피를 다시 확인하고 바로 조리할 수 있습니다.</p>
              </div>

            </div>

            <div className="recent-grid">
              {favoriteRecipeList.length === 0 ? (
                <div className="empty-favorite-box">
                  <h3>저장된 즐겨찾기가 없습니다.</h3>
                  <p>레시피 추천 화면에서 마음에 드는 레시피를 저장해보세요.</p>
                  <button className="primary-btn" onClick={() => goPage("recipe")}>
                    추천 레시피 보러가기
                  </button>
                </div>
              ) : (
                favoriteRecipeList.map((recipe) => (
                  <button
                    key={recipe.name}
                    className="recent-card favorite-card"
                    onClick={() => handleOpenFavoriteRecipe(recipe)}
                  >
                    <div>
                      <p className="recent-card-label">❤️ {recipe.savedAt}</p>
                      <h3>{recipe.name}</h3>
                      <p>{recipe.type}</p>
                    </div>

                    <div className="recent-card-meta">
                      <span>{recipe.time}</span>
                      <span>{recipe.level}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        {page === "ingredientLibrary" && (
          <section className="ingredient-library-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">INGREDIENT LIBRARY</p>
                <h2>재료 도감</h2>
                <p>
                  세계 요리에 자주 쓰이는 재료를 가나다 순으로 확인하고,
                  구매가 필요하면 주요 장보기 사이트 검색 링크로 바로 이동할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="ingredient-library-tools">
              <input
                className="dark-input"
                placeholder="재료명, 카테고리, 설명 검색"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
              />
              <div className="ingredient-category-row">
                {ingredientCategories.map((category) => (
                  <button
                    key={category}
                    className={ingredientCategory === category ? "active" : ""}
                    onClick={() => setIngredientCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="ingredient-initial-row">
                {ingredientInitials.map((initial) => (
                  <button
                    key={initial}
                    className={ingredientInitial === initial ? "active" : ""}
                    onClick={() => setIngredientInitial(initial)}
                  >
                    {initial}
                  </button>
                ))}
              </div>
            </div>

            <div className="ingredient-library-summary">
              <strong>{filteredIngredientList.length}</strong>
              <span>개 재료 표시 중</span>
            </div>

            <div className="ingredient-library-list">
              {filteredIngredientList.map((ingredient) => (
                <article className="ingredient-library-card" key={ingredient.name}>
                  <div>
                    <span className="ingredient-letter">{ingredient.name[0]}</span>
                    <h3>{ingredient.name}</h3>
                    <p>{ingredient.note}</p>
                  </div>
                  <span className="ingredient-category-pill">{ingredient.category}</span>
                  <div className="ingredient-buy-links">
                    {getIngredientBuyLinks(ingredient.name).map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {page === "favoriteDetail" && selectedFavoriteRecipe && (
          <section className="favorite-detail-page recipe-page-bright">
            <div className="recent-page-header">
              <div>
                <p className="sub-title">FAVORITE RECIPE</p>
                <h2>{selectedFavoriteRecipe.name}</h2>
                <p>즐겨찾기에서 불러온 레시피입니다.</p>
              </div>

              <button
                className="outline-btn small-btn"
                onClick={() => goPage("favorite")}
              >
                즐겨찾기 목록
              </button>
            </div>

            <div className="recent-detail-card">
              <div className="recent-detail-main">
                <h3>{selectedFavoriteRecipe.name}</h3>

                <ul>
                  <li>
                    <strong>조리시간</strong>
                    <span>{selectedFavoriteRecipe.time}</span>
                  </li>
                  <li>
                    <strong>난이도</strong>
                    <span>{selectedFavoriteRecipe.level}</span>
                  </li>
                  <li>
                    <strong>종류</strong>
                    <span>{selectedFavoriteRecipe.type}</span>
                  </li>
                  <li>
                    <strong>사용 재료</strong>
                    <span>{selectedFavoriteRecipe.ingredients.join(", ")}</span>
                  </li>
                </ul>
              </div>

              <div className="recent-detail-actions">
                <button
                  className="primary-btn"
                  onClick={() => handleOpenRecipeGuide(selectedFavoriteRecipe)}
                >
                  이 레시피 조리 가이드 보기
                </button>

                <button
                  className="outline-btn"
                  onClick={() =>
                    setFavoriteRecipeList((prev) =>
                      prev.filter(
                        (item) => item.name !== selectedFavoriteRecipe.name
                      )
                    )
                  }
                >
                  즐겨찾기 삭제
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "community" && (
          <section className="community-page recipe-page-bright">
            <div className="community-header">
              <div>
                <p className="sub-title">COOKING COMMUNITY</p>
                <h2>요리 공유 게시판</h2>
                <p>
                  내가 만든 요리법을 올리고 다른 사람의 자취 레시피를 참고할 수
                  있는 공간입니다.
                </p>
              </div>

            </div>

            <div className="community-layout">
              <div className="post-form-card">
                <p className="sub-title">WRITE POST</p>
                <h3>나만의 요리법 올리기</h3>

                <label className="input-label">작성자</label>
                <input
                  className="dark-input"
                  value={postAuthor}
                  onChange={(e) => setPostAuthor(e.target.value)}
                  placeholder="작성자 이름"
                />

                <label className="input-label">제목</label>
                <input
                  className="dark-input"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="예: 남은 계란으로 만드는 초간단 덮밥"
                />

                <label className="input-label">요리법 내용</label>
                <textarea
                  className="text-area post-textarea"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="재료, 조리 순서, 팁 등을 자유롭게 작성하세요."
                />

                <button className="primary-btn full" onClick={handleCreatePost}>
                  게시글 등록하기
                </button>
              </div>

              <div className="post-list-card">
                <p className="sub-title">SHARED RECIPES</p>
                <h3>공유된 요리법</h3>

                <div className="post-list">
                  {communityPosts.map((post) => (
                    <article className="post-card" key={post.id}>
                      <div className="post-card-header">
                        <div>
                          <h4>{post.title}</h4>
                          <p>by {post.author}</p>
                        </div>
                        <button onClick={() => handleLikePost(post.id)}>
                          ❤️ {post.likes}
                        </button>
                      </div>

                      <p className="post-content">{post.content}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-bottom-nav">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => goPage("home")}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </span>
          <span className="nav-label">홈</span>
        </button>

        <button
          className={page === "ingredientLibrary" ? "nav-active" : ""}
          onClick={() => goPage("ingredientLibrary")}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {/* 스크롤 외곽 */}
              <path d="M6 4h12a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"/>
              <path d="M4 7c-1 0-2 .5-2 1.5S3 10 4 10"/>
              <path d="M4 10c-1 0-2 .5-2 1.5S3 13 4 13"/>
              {/* 리스트 점 + 줄 */}
              <circle cx="8" cy="9" r="0.8" fill="currentColor"/>
              <line x1="10.5" y1="9" x2="17" y2="9"/>
              <circle cx="8" cy="12.5" r="0.8" fill="currentColor"/>
              <line x1="10.5" y1="12.5" x2="17" y2="12.5"/>
              <circle cx="8" cy="16" r="0.8" fill="currentColor"/>
              <line x1="10.5" y1="16" x2="17" y2="16"/>
            </svg>
          </span>
          <span className="nav-label">재료</span>
        </button>

        <button
          className={["favorite","favoriteDetail"].includes(page) ? "nav-active" : ""}
          onClick={() => goPage("favorite")}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/>
            </svg>
          </span>
          <span className="nav-label">즐겨찾기</span>
        </button>

        <button
          className={["service","serviceIntro","gesture"].includes(page) ? "nav-active" : ""}
          onClick={() => goPage("service")}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </span>
          <span className="nav-label">가이드</span>
        </button>
      </nav>

      {showFavoritePrompt && (
        <div className="recognized-modal-overlay">
          <div className="recognized-modal">
            <div className="modal-header">
              <h3>요리 완료 확인</h3>
              <button
                className="close-btn"
                onClick={() => setShowFavoritePrompt(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>요리를 완료하셨나요? 완료 후 이 레시피를 즐겨찾기에 추가할 수 있습니다.</p>
              <p>원하시면 바로 즐겨찾기에 저장하거나, 저장 없이 종료할 수 있어요.</p>
            </div>
            <div className="modal-actions">
              <button
                className="outline-btn"
                onClick={() => {
                  setShowFavoritePrompt(false);
                  goPage("home");
                }}
              >
                완료만 하기
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  if (selectedRecipe) {
                    addToFavorites(selectedRecipe);
                  }
                  setShowFavoritePrompt(false);
                  goPage("home");
                }}
              >
                즐겨찾기 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {isListening && (
        <div className="listening-overlay">
          <div className="listening-card">
            <div className="listening-ear">👂</div>
            <div className="listening-title">듣고 있어요</div>
            <div className="listening-hint">말씀해 주세요 ✨</div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
