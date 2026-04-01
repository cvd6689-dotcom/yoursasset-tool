import React, { useEffect, useMemo, useState } from "react";
import { insurers } from "./data/insurers";
import {
  comparisonTemplates,
  consultationPurposes,
  existingCoverageOptions,
  interestOptions,
  productCatalog,
} from "./data/products";

const STORAGE_KEY = "yoursasset_portal_customers_v3";

const STATUS_OPTIONS = [
  { value: "신규", color: "#2563eb" },
  { value: "상담중", color: "#f59e0b" },
  { value: "제안완료", color: "#8b5cf6" },
  { value: "계약완료", color: "#16a34a" },
  { value: "보류", color: "#64748b" },
];

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowISOString() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "-";
  return Number(value).toLocaleString("ko-KR");
}

function statusColor(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || "#64748b";
}

function insurerById(id) {
  return insurers.find((x) => x.id === id);
}

function getAgeGroup(age) {
  const a = Number(age || 0);
  if (a < 30) return "20대";
  if (a < 40) return "30대";
  if (a < 50) return "40대";
  if (a < 60) return "50대";
  return "60대";
}

function normalizeFeatureLabel(label) {
  return label.replace(/\s/g, "");
}

function loadCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("고객 데이터 로드 실패:", error);
    return [];
  }
}

function saveCustomers(customers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error("고객 데이터 저장 실패:", error);
  }
}

const DEFAULT_FORM = {
  id: null,
  customerName: "",
  gender: "남성",
  age: "",
  job: "",
  maritalStatus: "미혼",
  hasChildren: "없음",
  driving: "아니오",
  consultationPurpose: "보장분석",
  interests: [],
  existingCoverage: {
    realLoss: false,
    cancer: false,
    brainHeart: false,
    surgery: false,
    driver: false,
    accident: false,
    child: false,
    care: false,
    fire: false,
  },
  budget: "",
  status: "신규",
  consultDate: todayString(),
  nextContactDate: "",
  memo: "",
  lastModifiedAt: null,
  createdAt: null,
};

function deriveRecommendations(form) {
  const ageGroup = getAgeGroup(form.age);
  const budget = Number(form.budget || 0);

  const scores = {
    health: 0,
    cancer: 0,
    driver: 0,
    accident: 0,
    child: 0,
    dementia: 0,
    fire: 0,
  };

  const gaps = [];
  const consultPoints = [];
  const budgetSuggestions = [];
  const matchedReasons = [];

  if (form.consultationPurpose === "보장분석") scores.health += 3;
  if (form.consultationPurpose === "신규가입") scores.health += 2;
  if (form.consultationPurpose === "기존보험 리모델링") scores.health += 3;
  if (form.consultationPurpose === "암 대비") scores.cancer += 5;
  if (form.consultationPurpose === "건강종합 대비") scores.health += 5;
  if (form.consultationPurpose === "운전자 대비") scores.driver += 5;
  if (form.consultationPurpose === "자녀보험 상담") scores.child += 5;
  if (form.consultationPurpose === "부모님 간병/치매 대비") scores.dementia += 5;
  if (form.consultationPurpose === "화재/생활보장 상담") scores.fire += 5;

  if (form.interests.includes("암")) scores.cancer += 4;
  if (form.interests.includes("뇌/심장")) scores.health += 4;
  if (form.interests.includes("수술비")) scores.health += 3;
  if (form.interests.includes("입원일당")) scores.health += 2;
  if (form.interests.includes("운전자")) scores.driver += 4;
  if (form.interests.includes("상해")) scores.accident += 4;
  if (form.interests.includes("어린이")) scores.child += 4;
  if (form.interests.includes("간병/치매")) scores.dementia += 4;
  if (form.interests.includes("화재/누수")) scores.fire += 4;

  if (!form.existingCoverage.realLoss) {
    scores.health += 3;
    gaps.push("실손/기초 의료보장 점검 필요");
  }
  if (!form.existingCoverage.cancer) {
    scores.cancer += 4;
    gaps.push("암 진단비/치료비 보완 필요");
  }
  if (!form.existingCoverage.brainHeart) {
    scores.health += 3;
    gaps.push("뇌/심장 핵심진단비 점검 필요");
  }
  if (!form.existingCoverage.surgery) {
    scores.health += 2;
    gaps.push("수술비/입원일당 계열 보완 필요");
  }
  if (form.driving === "예" && !form.existingCoverage.driver) {
    scores.driver += 5;
    gaps.push("운전자 핵심비용 보완 필요");
  }
  if (
    !form.existingCoverage.accident &&
    ["건설", "제조", "운송", "자영업"].some((k) => (form.job || "").includes(k))
  ) {
    scores.accident += 4;
    gaps.push("직업 특성상 상해 보장 보완 필요");
  }
  if (form.hasChildren === "있음" && !form.existingCoverage.child) {
    scores.child += 3;
    gaps.push("자녀 관련 보장 상담 니즈 가능");
  }
  if (Number(form.age || 0) >= 50 && !form.existingCoverage.care) {
    scores.dementia += 4;
    gaps.push("50대 이상 간병/치매 대비 필요");
  }
  if (!form.existingCoverage.fire && (form.maritalStatus === "기혼" || form.hasChildren === "있음")) {
    scores.fire += 2;
    gaps.push("가정 단위 화재/생활배상 점검 필요");
  }

  if (form.maritalStatus === "기혼") {
    scores.health += 1;
    scores.fire += 1;
    matchedReasons.push("가정 단위 보장 점검 필요");
  }
  if (form.hasChildren === "있음") {
    scores.child += 2;
    matchedReasons.push("자녀 관련 상담 확장 가능");
  }
  if (Number(form.age || 0) >= 45) {
    scores.cancer += 1;
    scores.health += 1;
    matchedReasons.push("중대질환 대비 필요도 상승");
  }

  const categoryNameMap = {
    health: "건강종합",
    cancer: "암",
    driver: "운전자",
    accident: "상해",
    child: "자녀보험",
    dementia: "간병/치매",
    fire: "화재/생활보장",
  };

  const categoryEntries = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0);

  const recommendedCategories = categoryEntries.slice(0, 3).map(([key]) => key);
  const recommendedCategoryLabels = recommendedCategories.map((key) => categoryNameMap[key] || key);
  const primaryCategory = recommendedCategories[0] || "health";
  const comparisonItems = comparisonTemplates[primaryCategory] || comparisonTemplates.health;

  const scoredProducts = productCatalog
    .filter((p) => recommendedCategories.includes(p.category))
    .map((p) => {
      let score = 0;
      if (p.target.includes(ageGroup)) score += 2;
      if (form.driving === "예" && p.category === "driver") score += 3;
      if (form.hasChildren === "있음" && p.category === "child") score += 3;
      if (form.maritalStatus === "기혼" && ["health", "fire", "child"].includes(p.category)) score += 1;
      if (budget && budget >= p.minBudget && budget <= p.maxBudget) score += 4;
      if (budget && budget < p.minBudget) score -= 2;
      if (budget && budget > p.maxBudget) score += 1;
      if (p.category === primaryCategory) score += 2;
      score += (p.strengths?.length || 0) * 0.4;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);

  const recommendedInsurerProducts = [];
  const usedInsurers = new Set();

  for (const item of scoredProducts) {
    if (!usedInsurers.has(item.insurerId)) {
      usedInsurers.add(item.insurerId);
      recommendedInsurerProducts.push(item);
    }
    if (recommendedInsurerProducts.length >= 3) break;
  }

  const insurerCompareRows = recommendedInsurerProducts.map((product) => {
    const company = insurerById(product.insurerId);
    return {
      insurerId: product.insurerId,
      insurerName: company?.name || product.insurerId,
      insurerLogo: company?.logo || "",
      insurerColor: company?.color || "#0f172a",
      productName: product.productName,
      note: company?.note || "",
      features: comparisonItems.reduce((acc, item) => {
        const matched = Object.entries(product.features || {}).find(
          ([key]) => normalizeFeatureLabel(key) === normalizeFeatureLabel(item)
        );
        acc[item] = matched?.[1] || "-";
        return acc;
      }, {}),
    };
  });

  if (budget) {
    if (budget < 30000) {
      budgetSuggestions.push("예산이 낮아 핵심담보 우선형 설계가 적합합니다.");
      budgetSuggestions.push("운전자/화재/상해 등 단독 실속형 제안이 유리합니다.");
    } else if (budget < 70000) {
      budgetSuggestions.push("1순위 부족담보 중심으로 1~2개 상품군 압축 제안이 적합합니다.");
    } else if (budget < 120000) {
      budgetSuggestions.push("건강종합 + 암 또는 건강종합 + 운전자 조합 제안이 적합합니다.");
    } else {
      budgetSuggestions.push("종합보장형 설계와 부족담보 보완을 함께 제안하기 좋습니다.");
      budgetSuggestions.push("비교표 중심 상담으로 원수사별 강점을 명확히 보여주기 좋습니다.");
    }
  } else {
    budgetSuggestions.push("예산 미입력 상태이므로 핵심담보 우선순위부터 상담하는 것이 좋습니다.");
  }

  if (recommendedCategories.includes("health")) {
    consultPoints.push("실손 유무와 함께 암/뇌/심장 진단비 및 수술비 밸런스를 점검하세요.");
  }
  if (recommendedCategories.includes("cancer")) {
    consultPoints.push("암 진단비만이 아니라 항암/표적항암/재진단암 연결 구조를 보여주세요.");
  }
  if (recommendedCategories.includes("driver")) {
    consultPoints.push("운전자보험은 처리지원금, 변호사선임비, 벌금 구조를 중심으로 설명하세요.");
  }
  if (recommendedCategories.includes("child")) {
    consultPoints.push("부모는 질병·상해·성장기 위험을 한 번에 정리해주는 설계를 선호합니다.");
  }
  if (recommendedCategories.includes("dementia")) {
    consultPoints.push("치매진단비보다 실제 간병비 흐름과 재가/시설 활용성을 같이 설명하세요.");
  }
  if (recommendedCategories.includes("fire")) {
    consultPoints.push("화재/누수/배상책임은 생활밀착형 보장으로 체감도가 높습니다.");
  }
  if (recommendedCategories.includes("accident")) {
    consultPoints.push("직업/생활패턴에 따른 상해빈도 차이를 먼저 공감해주는 접근이 좋습니다.");
  }

  const safeGaps = gaps.length ? gaps : ["기존 보장 범위/금액 재점검 권장"];

  const script = [
    `${form.customerName || "고객"}님 기준으로 현재 가장 먼저 점검할 부분은 ${safeGaps.slice(0, 2).join(", ")} 입니다.`,
    `상담 목적과 예산을 반영했을 때 ${recommendedCategoryLabels.join(", ")} 중심으로 설계 방향을 잡는 것이 적합합니다.`,
    recommendedInsurerProducts.length
      ? `원수사는 ${recommendedInsurerProducts.map((x) => insurerById(x.insurerId)?.name).join(", ")} 순으로 비교 제안드리면 좋습니다.`
      : "",
    budgetSuggestions[0] || "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ageGroup,
    primaryCategory,
    comparisonItems,
    recommendedCategories,
    recommendedCategoryLabels,
    recommendedInsurerProducts,
    recommendedInsurerNames: recommendedInsurerProducts.map((x) => insurerById(x.insurerId)?.name).filter(Boolean),
    insurerCompareRows,
    gaps: safeGaps,
    consultPoints,
    budgetSuggestions,
    matchedReasons,
    script,
  };
}

function buildConsultReportHtml(record, recommendation) {
  const gapItems = (recommendation.gaps || []).map((x) => `<li>${x}</li>`).join("");
  const pointItems = (recommendation.consultPoints || []).map((x) => `<li>${x}</li>`).join("");
  const budgetItems = (recommendation.budgetSuggestions || []).map((x) => `<li>${x}</li>`).join("");
  const compareHead = (recommendation.comparisonItems || []).map((item) => `<th>${item}</th>`).join("");
  const compareBody = (recommendation.insurerCompareRows || [])
    .map(
      (row) => `
        <tr>
          <td>
            <div style="font-weight:700;">${row.insurerName}</div>
            <div style="font-size:12px;color:#64748b;">${row.productName}</div>
          </td>
          ${(recommendation.comparisonItems || [])
            .map((item) => `<td>${row.features?.[item] || "-"}</td>`)
            .join("")}
        </tr>
      `
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>유어즈에셋 상담 리포트</title>
      <style>
        body {
          font-family: Arial, "Noto Sans KR", sans-serif;
          color: #0f172a;
          padding: 28px;
          background: #ffffff;
        }
        .top {
          display:flex;
          justify-content:space-between;
          align-items:center;
          border-bottom:2px solid #dbeafe;
          padding-bottom:14px;
          margin-bottom:22px;
        }
        .title {
          font-size:28px;
          font-weight:800;
        }
        .sub {
          font-size:13px;
          color:#64748b;
          margin-top:6px;
        }
        .logo {
          height:44px;
          object-fit:contain;
        }
        .grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
          margin-bottom:16px;
        }
        .card {
          border:1px solid #e2e8f0;
          border-radius:14px;
          padding:16px;
          background:#fff;
        }
        .card h3 {
          margin:0 0 12px;
          font-size:16px;
        }
        .kv {
          display:grid;
          grid-template-columns:110px 1fr;
          row-gap:8px;
          column-gap:10px;
          font-size:14px;
        }
        .kv div:nth-child(odd) {
          color:#64748b;
        }
        .section {
          margin-top:16px;
        }
        ul {
          margin:0;
          padding-left:18px;
        }
        li {
          margin:5px 0;
          line-height:1.5;
        }
        .script, .memo {
          white-space:pre-wrap;
          line-height:1.7;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:12px;
          padding:14px;
        }
        table {
          width:100%;
          border-collapse:collapse;
          font-size:13px;
          margin-top:10px;
        }
        th, td {
          border:1px solid #e2e8f0;
          padding:10px;
          text-align:center;
        }
        th {
          background:#eff6ff;
        }
        .badge {
          display:inline-block;
          padding:6px 10px;
          border-radius:999px;
          background:#eff6ff;
          border:1px solid #dbeafe;
          font-size:12px;
          font-weight:700;
        }
        @media print {
          body { padding: 14px; }
          .card, table, tr, td, th { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="top">
        <div>
          <div class="title">유어즈에셋 상담 요약 리포트</div>
          <div class="sub">출력일 ${todayString()}</div>
        </div>
        <img src="/logo.png" class="logo" />
      </div>

      <div class="grid">
        <div class="card">
          <h3>고객 기본정보</h3>
          <div class="kv">
            <div>고객명</div><div>${record.customerName || "-"}</div>
            <div>성별 / 나이</div><div>${record.gender || "-"} / ${record.age || "-"}</div>
            <div>직업</div><div>${record.job || "-"}</div>
            <div>결혼 / 자녀</div><div>${record.maritalStatus || "-"} / ${record.hasChildren || "-"}</div>
            <div>운전 여부</div><div>${record.driving || "-"}</div>
            <div>상담 목적</div><div>${record.consultationPurpose || "-"}</div>
            <div>월 예산</div><div>${record.budget ? `${formatNumber(record.budget)}원` : "-"}</div>
            <div>진행상태</div><div><span class="badge">${record.status || "-"}</span></div>
          </div>
        </div>

        <div class="card">
          <h3>상담 일정 / 추천 요약</h3>
          <div class="kv">
            <div>상담일자</div><div>${record.consultDate || "-"}</div>
            <div>다음 연락일</div><div>${record.nextContactDate || "-"}</div>
            <div>관심 보장</div><div>${(record.interests || []).join(", ") || "-"}</div>
            <div>추천 상품군</div><div>${(recommendation.recommendedCategoryLabels || []).join(", ") || "-"}</div>
            <div>추천 원수사</div><div>${(recommendation.recommendedInsurerNames || []).join(", ") || "-"}</div>
          </div>
        </div>
      </div>

      <div class="card section">
        <h3>부족 담보</h3>
        <ul>${gapItems || "<li>없음</li>"}</ul>
      </div>

      <div class="card section">
        <h3>상담 포인트</h3>
        <ul>${pointItems || "<li>없음</li>"}</ul>
      </div>

      <div class="card section">
        <h3>예산 맞춤 제안</h3>
        <ul>${budgetItems || "<li>없음</li>"}</ul>
      </div>

      <div class="card section">
        <h3>자동 상담 멘트</h3>
        <div class="script">${recommendation.script || "-"}</div>
      </div>

      <div class="card section">
        <h3>원수사 비교표</h3>
        <table>
          <thead>
            <tr>
              <th>원수사 / 상품</th>
              ${compareHead}
            </tr>
          </thead>
          <tbody>
            ${compareBody || `<tr><td colspan="${(recommendation.comparisonItems || []).length + 1}">비교 데이터 없음</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="card section">
        <h3>상담 메모</h3>
        <div class="memo">${record.memo || "메모 없음"}</div>
      </div>
    </body>
  </html>
  `;
}

function printConsultReport(record, recommendation) {
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) {
    alert("팝업이 차단되어 있습니다. 팝업 허용 후 다시 시도해주세요.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildConsultReportHtml(record, recommendation));
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setRecords(loadCustomers());
  }, []);

  useEffect(() => {
    saveCustomers(records);
  }, [records]);

  const recommendations = useMemo(() => deriveRecommendations(form), [form]);

  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((item) => {
        const keyword = search.trim().toLowerCase();
        const matchedKeyword =
          !keyword ||
          item.customerName?.toLowerCase().includes(keyword) ||
          item.job?.toLowerCase().includes(keyword) ||
          item.consultationPurpose?.toLowerCase().includes(keyword) ||
          item.memo?.toLowerCase().includes(keyword);

        const matchedStatus = statusFilter === "전체" || item.status === statusFilter;
        return matchedKeyword && matchedStatus;
      })
      .sort((a, b) => new Date(b.lastModifiedAt || b.createdAt || 0) - new Date(a.lastModifiedAt || a.createdAt || 0));
  }, [records, search, statusFilter]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(value) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter((x) => x !== value)
        : [...prev.interests, value],
    }));
  }

  function toggleCoverage(key) {
    setForm((prev) => ({
      ...prev,
      existingCoverage: {
        ...prev.existingCoverage,
        [key]: !prev.existingCoverage[key],
      },
    }));
  }

  function resetForm() {
    setForm({
      ...DEFAULT_FORM,
      consultDate: todayString(),
    });
    setEditingId(null);
  }

  function saveRecord() {
    if (!form.customerName.trim()) {
      alert("고객명을 입력해주세요.");
      return;
    }

    const duplicate = records.find(
      (item) => item.customerName.trim() === form.customerName.trim() && item.id !== editingId
    );

    if (duplicate && !editingId) {
      const shouldEdit = window.confirm("같은 고객명이 이미 저장되어 있습니다.\n기존 저장건을 수정하시겠습니까?");
      if (!shouldEdit) return;

      const updated = {
        ...duplicate,
        ...form,
        id: duplicate.id,
        createdAt: duplicate.createdAt || nowISOString(),
        lastModifiedAt: nowISOString(),
      };

      setRecords((prev) => prev.map((item) => (item.id === duplicate.id ? updated : item)));
      setForm(updated);
      setEditingId(duplicate.id);
      alert("기존 고객 저장건을 수정했습니다.");
      return;
    }

    if (editingId) {
      const updated = {
        ...form,
        id: editingId,
        createdAt: form.createdAt || nowISOString(),
        lastModifiedAt: nowISOString(),
      };
      setRecords((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      setForm(updated);
      alert("저장건을 수정했습니다.");
      return;
    }

    const newRecord = {
      ...form,
      id: uid(),
      createdAt: nowISOString(),
      lastModifiedAt: nowISOString(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    setForm(newRecord);
    setEditingId(newRecord.id);
    alert("상담결과를 저장했습니다.");
  }

  function loadRecord(record) {
    setForm({
      ...DEFAULT_FORM,
      ...record,
      interests: Array.isArray(record.interests) ? record.interests : [],
      existingCoverage: {
        ...DEFAULT_FORM.existingCoverage,
        ...(record.existingCoverage || {}),
      },
    });
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteRecord(id) {
    const ok = window.confirm("이 저장건을 삭제하시겠습니까?");
    if (!ok) return;
    setRecords((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  const completedCount = records.filter((x) => x.status === "계약완료").length;
  const progressingCount = records.filter((x) => x.status === "상담중").length;

  return (
    <div className="ya-wrap">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f7fb; color: #0f172a; font-family: "Noto Sans KR", Arial, sans-serif; }
        .ya-wrap {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(29, 78, 216, 0.08), transparent 26%),
            linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%);
          padding: 20px;
        }
        .container { max-width: 1500px; margin: 0 auto; }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%);
          color: white;
          border-radius: 22px;
          padding: 22px;
          display:flex;
          justify-content:space-between;
          gap:20px;
          align-items:center;
          box-shadow: 0 20px 50px rgba(15,23,42,0.18);
        }
        .header-left { display:flex; align-items:center; gap:16px; }
        .logo-box {
          width:64px; height:64px; background:rgba(255,255,255,0.12);
          border:1px solid rgba(255,255,255,0.18);
          border-radius:18px; display:flex; align-items:center; justify-content:center; overflow:hidden;
        }
        .logo-box img { width:100%; height:100%; object-fit:contain; padding:10px; }
        .title { font-size:28px; font-weight:900; margin-bottom:6px; }
        .subtitle { font-size:14px; opacity:0.88; }
        .stat-grid { display:grid; grid-template-columns: repeat(3, minmax(120px,1fr)); gap:12px; min-width: 350px; }
        .stat-card {
          background: rgba(255,255,255,0.12);
          border:1px solid rgba(255,255,255,0.14);
          border-radius:16px;
          padding:14px;
        }
        .stat-label { font-size:12px; opacity:0.86; margin-bottom:6px; }
        .stat-value { font-size:24px; font-weight:800; }
        .main-grid { display:grid; grid-template-columns: 1.08fr 0.92fr; gap:18px; margin-top:18px; }
        .card {
          background:#fff; border:1px solid #e2e8f0; border-radius:20px; padding:18px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.05);
        }
        .card-title {
          font-size:18px; font-weight:800; margin-bottom:14px;
          display:flex; align-items:center; justify-content:space-between; gap:12px;
        }
        .section-title { font-size:15px; font-weight:800; margin:18px 0 10px; color:#0f172a; }
        .form-grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { font-size:13px; font-weight:700; color:#334155; }
        .input, .select, .textarea {
          width:100%;
          border:1px solid #dbe3ef;
          border-radius:14px;
          background:#fff;
          padding:12px 14px;
          font-size:14px;
          outline:none;
        }
        .input:focus, .select:focus, .textarea:focus {
          border-color:#3b82f6;
          box-shadow:0 0 0 4px rgba(59,130,246,0.12);
        }
        .textarea { min-height:120px; resize:vertical; }
        .chips { display:flex; flex-wrap:wrap; gap:8px; }
        .chip {
          border:1px solid #dbe3ef;
          background:#f8fafc;
          color:#334155;
          border-radius:999px;
          padding:9px 12px;
          font-size:13px;
          font-weight:700;
          cursor:pointer;
        }
        .chip.active { background:#dbeafe; color:#1d4ed8; border-color:#93c5fd; }
        .badge {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:7px 11px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          color:#0f172a;
          background:#eff6ff;
          border:1px solid #dbeafe;
        }
        .status-badge {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:74px;
          padding:7px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          color:#fff;
        }
        .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
        .btn {
          border:none;
          border-radius:14px;
          padding:12px 16px;
          font-size:14px;
          font-weight:800;
          cursor:pointer;
        }
        .btn-primary { background:linear-gradient(135deg, #1d4ed8, #2563eb); color:#fff; }
        .btn-dark { background:#0f172a; color:#fff; }
        .btn-soft { background:#eff6ff; color:#1d4ed8; }
        .summary-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px; }
        .summary-box {
          border:1px solid #e2e8f0;
          border-radius:18px;
          padding:14px;
          background:linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .summary-box h4 { margin:0 0 10px; font-size:14px; }
        .summary-box ul { margin:0; padding-left:18px; }
        .summary-box li { margin:6px 0; font-size:14px; color:#334155; }
        .table-wrap { overflow:auto; border:1px solid #e2e8f0; border-radius:18px; }
        table { width:100%; border-collapse:collapse; min-width:900px; }
        th, td { padding:12px 10px; border-bottom:1px solid #eef2f7; text-align:center; font-size:13px; }
        th { background:#eff6ff; color:#1e3a8a; font-weight:800; }
        .list-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:14px; }
        .list { display:grid; gap:12px; max-height:920px; overflow:auto; padding-right:4px; }
        .customer-item {
          border:1px solid #e2e8f0;
          border-radius:18px;
          padding:14px;
          background:#fff;
        }
        .customer-name { font-size:17px; font-weight:800; margin-bottom:4px; }
        .customer-meta { font-size:13px; color:#64748b; line-height:1.6; }
        .customer-tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
        .highlight-complete {
          border:2px solid rgba(22,163,74,0.22);
          background:linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
        }
        .highlight-progress {
          border:2px solid rgba(245,158,11,0.20);
          background:linear-gradient(180deg, #ffffff 0%, #fffaf0 100%);
        }
        .small-actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .tiny-btn {
          border:none;
          border-radius:12px;
          padding:8px 10px;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }
        .tiny-soft { background:#eff6ff; color:#1d4ed8; }
        .tiny-danger { background:#fef2f2; color:#dc2626; }
        .inline-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; }
        .kpi-card {
          border:1px solid #e2e8f0;
          border-radius:16px;
          padding:12px;
          background:#fff;
        }
        .kpi-label { font-size:12px; color:#64748b; margin-bottom:6px; }
        .kpi-value { font-size:20px; font-weight:800; }
        .recommend-head { display:flex; flex-wrap:wrap; gap:8px; }
        .company-cell { display:flex; align-items:center; gap:10px; justify-content:flex-start; min-width:170px; }
        .company-logo {
          width:34px; height:34px; border-radius:10px; border:1px solid #e2e8f0;
          object-fit:contain; background:#fff; padding:4px;
        }
        .script-box {
          white-space:pre-wrap;
          line-height:1.8;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:16px;
          padding:14px;
          font-size:14px;
        }
        .muted { color:#64748b; font-size:13px; }
        .empty {
          padding:24px;
          text-align:center;
          color:#64748b;
          border:1px dashed #cbd5e1;
          border-radius:18px;
          background:#fafcff;
        }
        @media (max-width: 1200px) {
          .main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .ya-wrap { padding:12px; }
          .header { flex-direction:column; align-items:flex-start; }
          .form-grid-3, .summary-grid, .inline-grid { grid-template-columns: 1fr; }
          .title { font-size:22px; }
          .stat-grid { grid-template-columns: 1fr 1fr; min-width:auto; width:100%; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-left">
            <div className="logo-box">
              <img src="/logo.png" alt="유어즈에셋 로고" />
            </div>
            <div>
              <div className="title">유어즈에셋 설계사 포털</div>
              <div className="subtitle">CRM · 고객추천 · 비교실 · 상담 리포트 출력</div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">전체 고객</div>
              <div className="stat-value">{records.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">상담중</div>
              <div className="stat-value">{progressingCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">계약완료</div>
              <div className="stat-value">{completedCount}</div>
            </div>
          </div>
        </div>

        <div className="main-grid">
          <div>
            <div className="card">
              <div className="card-title">
                <span>고객 입력 / 상담 관리</span>
                <div className="badge">{editingId ? "수정 모드" : "신규 입력"}</div>
              </div>

              <div className="section-title">기본 정보</div>
              <div className="form-grid-3">
                <div className="field">
                  <label>고객명</label>
                  <input className="input" value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} />
                </div>
                <div className="field">
                  <label>성별</label>
                  <select className="select" value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
                    <option>남성</option>
                    <option>여성</option>
                  </select>
                </div>
                <div className="field">
                  <label>나이</label>
                  <input className="input" type="number" value={form.age} onChange={(e) => updateField("age", e.target.value)} />
                </div>
              </div>

              <div className="form-grid-3" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>직업</label>
                  <input className="input" value={form.job} onChange={(e) => updateField("job", e.target.value)} />
                </div>
                <div className="field">
                  <label>결혼 여부</label>
                  <select className="select" value={form.maritalStatus} onChange={(e) => updateField("maritalStatus", e.target.value)}>
                    <option>미혼</option>
                    <option>기혼</option>
                  </select>
                </div>
                <div className="field">
                  <label>자녀 여부</label>
                  <select className="select" value={form.hasChildren} onChange={(e) => updateField("hasChildren", e.target.value)}>
                    <option>없음</option>
                    <option>있음</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-3" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>운전 여부</label>
                  <select className="select" value={form.driving} onChange={(e) => updateField("driving", e.target.value)}>
                    <option>아니오</option>
                    <option>예</option>
                  </select>
                </div>
                <div className="field">
                  <label>상담 목적</label>
                  <select className="select" value={form.consultationPurpose} onChange={(e) => updateField("consultationPurpose", e.target.value)}>
                    {consultationPurposes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>월보험료 예산</label>
                  <input className="input" type="number" value={form.budget} onChange={(e) => updateField("budget", e.target.value)} />
                </div>
              </div>

              <div className="section-title">관심 보장</div>
              <div className="chips">
                {interestOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip ${form.interests.includes(item) ? "active" : ""}`}
                    onClick={() => toggleInterest(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="section-title">기존 계약 보장 여부</div>
              <div className="chips">
                {existingCoverageOptions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`chip ${form.existingCoverage[item.key] ? "active" : ""}`}
                    onClick={() => toggleCoverage(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="section-title">CRM 관리</div>
              <div className="form-grid-3">
                <div className="field">
                  <label>상담 진행상태</label>
                  <select className="select" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                    {STATUS_OPTIONS.map((status) => <option key={status.value}>{status.value}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>상담일자</label>
                  <input className="input" type="date" value={form.consultDate} onChange={(e) => updateField("consultDate", e.target.value)} />
                </div>
                <div className="field">
                  <label>다음 연락일</label>
                  <input className="input" type="date" value={form.nextContactDate} onChange={(e) => updateField("nextContactDate", e.target.value)} />
                </div>
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label>상담 메모</label>
                <textarea className="textarea" value={form.memo} onChange={(e) => updateField("memo", e.target.value)} />
              </div>

              <div className="actions">
                <button className="btn btn-primary" onClick={saveRecord}>{editingId ? "저장건 수정" : "상담결과 저장"}</button>
                <button className="btn btn-dark" onClick={() => printConsultReport(form, recommendations)}>PDF 저장 / 출력</button>
                <button className="btn btn-soft" onClick={resetForm}>신규 입력 초기화</button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-title">
                <span>자동 추천 결과</span>
                <div className="recommend-head">
                  {recommendations.recommendedCategoryLabels.map((item) => <span key={item} className="badge">{item}</span>)}
                </div>
              </div>

              <div className="inline-grid">
                <div className="kpi-card">
                  <div className="kpi-label">추천 상품군</div>
                  <div className="kpi-value">{recommendations.recommendedCategoryLabels[0] || "-"}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">추천 원수사 수</div>
                  <div className="kpi-value">{recommendations.recommendedInsurerProducts.length}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">부족 담보 수</div>
                  <div className="kpi-value">{recommendations.gaps.length}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">기준 연령대</div>
                  <div className="kpi-value">{recommendations.ageGroup}</div>
                </div>
              </div>

              <div className="summary-grid" style={{ marginTop: 14 }}>
                <div className="summary-box">
                  <h4>부족 담보 자동 표시</h4>
                  <ul>{recommendations.gaps.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="summary-box">
                  <h4>상담 포인트</h4>
                  <ul>{recommendations.consultPoints.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="summary-box">
                  <h4>예산 맞춤 제안</h4>
                  <ul>{recommendations.budgetSuggestions.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="summary-box">
                  <h4>추천 원수사</h4>
                  <ul>
                    {recommendations.recommendedInsurerProducts.map((item) => {
                      const company = insurerById(item.insurerId);
                      return <li key={item.id}><strong>{company?.name || item.insurerId}</strong> · {item.productName}</li>;
                    })}
                  </ul>
                </div>
              </div>

              <div className="section-title">자동 상담 멘트</div>
              <div className="script-box">{recommendations.script}</div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-title">
                <span>원수사 비교실</span>
                <span className="muted">상품군: {recommendations.recommendedCategoryLabels[0] || "-"} / 비교 항목 자동 변경</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>원수사 / 상품</th>
                      {recommendations.comparisonItems.map((item) => <th key={item}>{item}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.insurerCompareRows.map((row) => (
                      <tr key={row.insurerId}>
                        <td style={{ textAlign: "left" }}>
                          <div className="company-cell">
                            <img
                              className="company-logo"
                              src={row.insurerLogo}
                              alt={row.insurerName}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            <div>
                              <div style={{ fontWeight: 800 }}>{row.insurerName}</div>
                              <div className="muted">{row.productName}</div>
                            </div>
                          </div>
                        </td>
                        {recommendations.comparisonItems.map((item) => <td key={item}>{row.features[item] || "-"}</td>)}
                      </tr>
                    ))}
                    {recommendations.insurerCompareRows.length === 0 && (
                      <tr>
                        <td colSpan={recommendations.comparisonItems.length + 1}>비교 가능한 추천 원수사가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-title">
                <span>고객 CRM 리스트</span>
                <span className="badge">최근 저장순</span>
              </div>

              <div className="list-toolbar">
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 220 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="고객명 / 직업 / 상담목적 / 메모 검색"
                />
                <select className="select" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>전체</option>
                  {STATUS_OPTIONS.map((item) => <option key={item.value}>{item.value}</option>)}
                </select>
              </div>

              <div className="list">
                {filteredRecords.length === 0 ? (
                  <div className="empty">저장된 고객이 없습니다.</div>
                ) : (
                  filteredRecords.map((item) => {
                    const rec = deriveRecommendations(item);
                    const itemClass =
                      item.status === "계약완료"
                        ? "customer-item highlight-complete"
                        : item.status === "상담중"
                        ? "customer-item highlight-progress"
                        : "customer-item";

                    return (
                      <div key={item.id} className={itemClass}>
                        <div onClick={() => loadRecord(item)} style={{ cursor: "pointer" }}>
                          <div className="customer-name">{item.customerName}</div>
                          <div className="customer-meta">
                            {item.gender} / {item.age || "-"}세 / {item.job || "-"}<br />
                            상담목적: {item.consultationPurpose || "-"} · 예산: {item.budget ? `${formatNumber(item.budget)}원` : "-"}<br />
                            상담일: {item.consultDate || "-"} · 다음연락일: {item.nextContactDate || "-"}
                          </div>

                          <div className="customer-tags">
                            <span className="status-badge" style={{ background: statusColor(item.status) }}>{item.status}</span>
                            {rec.recommendedCategoryLabels.slice(0, 2).map((tag) => <span key={tag} className="badge">{tag}</span>)}
                            {rec.recommendedInsurerNames.slice(0, 1).map((tag) => <span key={tag} className="badge">{tag}</span>)}
                          </div>
                        </div>

                        <div className="small-actions">
                          <button className="tiny-btn tiny-soft" onClick={() => loadRecord(item)}>불러오기 / 수정</button>
                          <button className="tiny-btn tiny-soft" onClick={() => printConsultReport(item, rec)}>PDF 출력</button>
                          <button className="tiny-btn tiny-danger" onClick={() => deleteRecord(item.id)}>삭제</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
