import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { insurers, insurerMap } from "./data/insurers";
import { products } from "./data/products";

const STORAGE_KEY = "yoursasset_portal_customers_v3";

const initialForm = {
  customerName: "",
  gender: "무관",
  ageGroup: "40대",
  occupation: "",
  monthlyBudget: 100000,
  needs: ["암", "뇌", "심장"],
  currentContractsText: "",
  currentCoverages: [],
  memo: "",
};

const needOptions = [
  "암",
  "뇌",
  "심장",
  "입원",
  "수술",
  "후유장해",
  "간병",
  "생활비",
  "여성질환",
  "장기요양",
];

const coverageOptions = [
  "암",
  "뇌",
  "심장",
  "입원",
  "수술",
  "후유장해",
  "간병",
  "생활비",
  "실손",
];

function currency(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function scoreProduct(product, form) {
  let score = 0;

  if (product.suitableFor.includes(form.ageGroup)) score += 20;
  if (product.genders.includes(form.gender) || product.genders.includes("무관")) score += 15;

  const [minBudget, maxBudget] = product.monthlyBudgetRange;
  const budget = Number(form.monthlyBudget || 0);

  if (budget >= minBudget && budget <= maxBudget) score += 25;
  else if (budget >= minBudget * 0.8 && budget <= maxBudget * 1.2) score += 10;

  const needMatch = product.targetNeeds.filter((need) => form.needs.includes(need)).length;
  score += needMatch * 10;

  const missingCoverageCount = product.missingCoverageRules.filter(
    (item) => !form.currentCoverages.includes(item)
  ).length;
  score += missingCoverageCount * 5;

  return score;
}

function getTopProducts(form) {
  return [...products]
    .map((product) => ({
      ...product,
      matchScore: scoreProduct(product, form),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

function getMissingCoverages(form) {
  const priority = ["암", "뇌", "심장", "후유장해", "간병", "입원", "수술", "생활비"];
  return priority.filter((item) => !form.currentCoverages.includes(item));
}

function buildConsultSummary(form, recommendedProduct, missingCoverages) {
  const name = form.customerName || "고객";
  const mainNeeds = form.needs.slice(0, 3).join(", ");
  const topMissing = missingCoverages.slice(0, 3).join(", ");

  return [
    `${name}님은 현재 ${form.ageGroup} / ${form.gender} 기준으로 ${mainNeeds || "핵심 보장"} 니즈가 우선으로 보입니다.`,
    missingCoverages.length
      ? `기존 계약 분석상 ${topMissing} 관련 보장이 상대적으로 부족해 보완 상담 포인트가 분명합니다.`
      : `기존 계약의 주요 골격은 갖춰져 있으나, 세부 특약과 한도 조정 중심 점검이 필요합니다.`,
    `이번 상담에서는 '${recommendedProduct?.name || "추천 플랜"}' 중심으로 보험료 예산 ${currency(
      form.monthlyBudget
    )}원 범위 내에서 실무형 비교설계를 진행하는 흐름이 적합합니다.`,
  ];
}

function buildSalesMent(form, product, insurerIds) {
  const insurerNames = insurerIds
    .map((id) => insurerMap[id]?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  return [
    `현재 고객 조건에서는 ${product.name} 방향으로 접근하는 것이 가장 자연스럽습니다.`,
    `특히 ${insurerNames} 중심 비교를 진행하면 보험료와 보장 밸런스를 설명하기 좋습니다.`,
    `초회 상담에서는 모든 담보를 한 번에 넣기보다, 부족 담보 우선 보완 → 추가 특약 확장 순서로 제안하는 것이 효율적입니다.`,
  ];
}

function LogoImage({ insurer }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const logos = insurer?.possibleLogos || [];
  const currentSrc = logos[srcIndex];

  if (!currentSrc) {
    return (
      <div className="logo-fallback">
        <span>{insurer?.shortName || insurer?.name?.slice(0, 2) || "로고"}</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={insurer.name}
      className="insurer-logo"
      onError={() => {
        if (srcIndex < logos.length - 1) setSrcIndex(srcIndex + 1);
      }}
    />
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedCustomers(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCustomers));
  }, [savedCustomers]);

  const recommendedProducts = useMemo(() => getTopProducts(form), [form]);
  const topProduct = recommendedProducts[0];
  const missingCoverages = useMemo(() => getMissingCoverages(form), [form]);
  const topInsurers = useMemo(() => {
    if (!topProduct) return [];
    return topProduct.recommendedInsurers.map((id) => insurerMap[id]).filter(Boolean);
  }, [topProduct]);

  const consultSummary = useMemo(
    () => buildConsultSummary(form, topProduct, missingCoverages),
    [form, topProduct, missingCoverages]
  );

  const salesMent = useMemo(
    () => buildSalesMent(form, topProduct || {}, topProduct?.recommendedInsurers || []),
    [form, topProduct]
  );

  const selectedSavedCustomer = useMemo(
    () => savedCustomers.find((item) => item.id === selectedSavedId) || null,
    [savedCustomers, selectedSavedId]
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNeed = (value) => {
    setForm((prev) => {
      const exists = prev.needs.includes(value);
      return {
        ...prev,
        needs: exists ? prev.needs.filter((item) => item !== value) : [...prev.needs, value],
      };
    });
  };

  const toggleCoverage = (value) => {
    setForm((prev) => {
      const exists = prev.currentCoverages.includes(value);
      return {
        ...prev,
        currentCoverages: exists
          ? prev.currentCoverages.filter((item) => item !== value)
          : [...prev.currentCoverages, value],
      };
    });
  };

  const handleSaveCustomer = () => {
    const payload = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      form,
      recommendedProducts,
      missingCoverages,
      consultSummary,
      salesMent,
    };

    setSavedCustomers((prev) => [payload, ...prev]);
    setSelectedSavedId(payload.id);
    alert("고객 정보가 저장되었습니다.");
  };

  const handleDeleteCustomer = (id) => {
    const next = savedCustomers.filter((item) => item.id !== id);
    setSavedCustomers(next);
    if (selectedSavedId === id) setSelectedSavedId(null);
  };

  const handleLoadCustomer = (customer) => {
    setForm(customer.form);
    setSelectedSavedId(customer.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePdfDownload = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f4f7fb",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save(`유어즈에셋_상담리포트_${form.customerName || "고객"}.pdf`);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: linear-gradient(180deg, #eef3f8 0%, #f8fbff 100%);
          color: #183049;
          font-family: "Noto Sans KR", Arial, sans-serif;
        }
        .page {
          min-height: 100vh;
          padding: 24px;
        }
        .shell {
          max-width: 1400px;
          margin: 0 auto;
        }
        .hero {
          background: linear-gradient(135deg, #14314a 0%, #1f4d73 55%, #4d87b8 100%);
          color: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(20, 49, 74, 0.18);
          margin-bottom: 20px;
        }
        .hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-logo {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          object-fit: contain;
          background: rgba(255,255,255,0.12);
          padding: 8px;
        }
        .hero-title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .hero-sub {
          margin-top: 8px;
          color: rgba(255,255,255,0.88);
          font-size: 15px;
          line-height: 1.6;
        }
        .top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          border: none;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary {
          background: white;
          color: #14314a;
        }
        .btn-accent {
          background: #1d6aa8;
          color: white;
        }
        .btn-danger {
          background: #d14f45;
          color: white;
        }
        .btn-soft {
          background: #eaf2f9;
          color: #17314a;
        }

        .grid {
          display: grid;
          grid-template-columns: 420px 1fr 360px;
          gap: 18px;
          align-items: start;
        }

        .card {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(22, 62, 97, 0.08);
          box-shadow: 0 12px 30px rgba(17, 46, 72, 0.08);
          border-radius: 22px;
          padding: 20px;
        }

        .section-title {
          margin: 0 0 14px 0;
          font-size: 20px;
          font-weight: 800;
          color: #17314a;
        }

        .section-sub {
          margin: -6px 0 16px;
          color: #647991;
          font-size: 13px;
          line-height: 1.5;
        }

        .field {
          margin-bottom: 14px;
        }
        .label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #35536e;
          margin-bottom: 7px;
        }
        .input, .textarea, .select {
          width: 100%;
          border: 1px solid #d9e4ee;
          background: #f9fcff;
          border-radius: 14px;
          padding: 12px 14px;
          color: #16304a;
          font-size: 14px;
          outline: none;
        }
        .textarea {
          min-height: 90px;
          resize: vertical;
        }
        .chip-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #d7e3ef;
          background: white;
          color: #34556f;
          cursor: pointer;
        }
        .chip.active {
          background: #183c5d;
          color: white;
          border-color: #183c5d;
        }

        .result-top {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .mini-stat {
          background: linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%);
          border: 1px solid #dce7f1;
          border-radius: 18px;
          padding: 14px;
        }
        .mini-stat .k {
          color: #67809a;
          font-size: 12px;
          font-weight: 700;
        }
        .mini-stat .v {
          margin-top: 6px;
          font-size: 19px;
          font-weight: 800;
          color: #17314a;
        }

        .product-card {
          border: 1px solid #dce7f1;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 14px;
          background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
        }
        .product-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .product-name {
          font-size: 20px;
          font-weight: 800;
          color: #17314a;
          margin: 0;
        }
        .score-badge {
          background: #153b5b;
          color: white;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 13px;
        }
        .tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }
        .tag {
          font-size: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #edf4fb;
          color: #35536e;
          font-weight: 700;
        }
        .bullet {
          margin: 0;
          padding-left: 18px;
          line-height: 1.7;
          color: #2f4d66;
          font-size: 14px;
        }

        .compare-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 14px;
        }

        .insurer-card {
          border: 1px solid #dbe7f1;
          border-radius: 18px;
          padding: 16px;
          background: #fff;
        }
        .insurer-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .insurer-logo {
          width: 54px;
          height: 54px;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid #e1e9f2;
          background: white;
          padding: 6px;
        }
        .logo-fallback {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #17314a, #4f84b4);
          color: white;
          font-weight: 800;
          font-size: 14px;
        }
        .insurer-name {
          font-size: 17px;
          font-weight: 800;
          color: #17314a;
          margin: 0;
        }
        .insurer-type {
          margin-top: 4px;
          color: #6b8197;
          font-size: 12px;
          font-weight: 700;
        }

        .practical-box {
          background: linear-gradient(180deg, #153b5b 0%, #214c72 100%);
          color: white;
          border-radius: 20px;
          padding: 18px;
          margin-top: 16px;
        }
        .practical-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 10px 0;
        }
        .practical-list {
          margin: 0;
          padding-left: 18px;
          line-height: 1.8;
          color: rgba(255,255,255,0.92);
          font-size: 14px;
        }

        .saved-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 580px;
          overflow: auto;
          padding-right: 4px;
        }
        .saved-item {
          border: 1px solid #dbe7f1;
          border-radius: 18px;
          padding: 14px;
          background: white;
          cursor: pointer;
        }
        .saved-item.active {
          border-color: #1a517c;
          box-shadow: 0 10px 24px rgba(26, 81, 124, 0.12);
        }
        .saved-item-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .saved-name {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: #17314a;
        }
        .saved-sub {
          margin-top: 6px;
          color: #647991;
          font-size: 13px;
          line-height: 1.5;
        }

        .detail-panel {
          margin-top: 16px;
          border-top: 1px dashed #d8e3ee;
          padding-top: 16px;
        }

        .detail-block {
          border: 1px solid #dce7f1;
          border-radius: 16px;
          padding: 14px;
          background: #fbfdff;
          margin-bottom: 10px;
        }
        .detail-block h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #17314a;
        }
        .detail-text {
          color: #35536e;
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .report {
          margin-top: 20px;
          background: #f4f7fb;
          border-radius: 24px;
          padding: 18px;
          border: 1px solid #dae5ef;
        }
        .report-sheet {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(21, 55, 85, 0.12);
        }
        .report-cover {
          background: linear-gradient(135deg, #14314a 0%, #23527a 55%, #88b8df 100%);
          color: white;
          padding: 28px;
        }
        .report-cover-title {
          font-size: 30px;
          font-weight: 900;
          margin: 0;
        }
        .report-cover-sub {
          margin-top: 10px;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,0.9);
        }
        .report-meta {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 18px;
        }
        .report-meta-card {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 16px;
          padding: 12px;
        }
        .report-meta-card .k {
          font-size: 11px;
          color: rgba(255,255,255,0.76);
          font-weight: 700;
        }
        .report-meta-card .v {
          margin-top: 6px;
          font-size: 16px;
          font-weight: 800;
        }
        .report-body {
          padding: 24px;
        }
        .report-section {
          margin-bottom: 18px;
          border: 1px solid #e0e9f1;
          border-radius: 20px;
          overflow: hidden;
        }
        .report-section-head {
          background: #eef5fb;
          padding: 14px 18px;
          font-size: 16px;
          font-weight: 800;
          color: #17314a;
        }
        .report-section-body {
          padding: 18px;
        }
        .report-highlight {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .highlight-card {
          border: 1px solid #dce7f1;
          border-radius: 16px;
          padding: 14px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .highlight-card .k {
          color: #6a8097;
          font-size: 12px;
          font-weight: 700;
        }
        .highlight-card .v {
          margin-top: 6px;
          font-weight: 900;
          color: #17314a;
          font-size: 18px;
        }
        .report-grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .foot-note {
          margin-top: 18px;
          font-size: 12px;
          color: #72879b;
          line-height: 1.7;
        }

        @media (max-width: 1200px) {
          .grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .compare-grid,
          .report-highlight,
          .report-grid-two,
          .report-meta,
          .result-top {
            grid-template-columns: 1fr;
          }
          .page { padding: 14px; }
          .hero-title { font-size: 24px; }
        }
      `}</style>

      <div className="page">
        <div className="shell">
          <div className="hero">
            <div className="hero-top">
              <div>
                <div className="logo-wrap">
                  <img src="/logo.png" alt="유어즈에셋 로고" className="brand-logo" />
                  <div>
                    <h1 className="hero-title">유어즈에셋 설계사 포털</h1>
                    <div className="hero-sub">
                      고객 입력 → 추천 상품군 → 원수사 비교 → 부족 담보 분석 → 상담 리포트 출력까지
                    </div>
                  </div>
                </div>
              </div>

              <div className="top-actions">
                <button className="btn btn-soft" onClick={handleSaveCustomer}>
                  고객 저장
                </button>
                <button className="btn btn-primary" onClick={handlePdfDownload}>
                  PDF 저장
                </button>
              </div>
            </div>
          </div>

          <div className="grid">
            {/* 좌측 입력 */}
            <div className="card">
              <h2 className="section-title">고객 정보 입력</h2>
              <p className="section-sub">
                실무 상담 기준으로 고객 기본 정보, 니즈, 기존 계약 상태를 빠르게 입력합니다.
              </p>

              <div className="field">
                <label className="label">고객명</label>
                <input
                  className="input"
                  value={form.customerName}
                  onChange={(e) => updateForm("customerName", e.target.value)}
                  placeholder="예: 김OO"
                />
              </div>

              <div className="field">
                <label className="label">성별</label>
                <select
                  className="select"
                  value={form.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                >
                  <option value="무관">무관</option>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </div>

              <div className="field">
                <label className="label">연령대</label>
                <select
                  className="select"
                  value={form.ageGroup}
                  onChange={(e) => updateForm("ageGroup", e.target.value)}
                >
                  <option value="30대">30대</option>
                  <option value="40대">40대</option>
                  <option value="50대">50대</option>
                  <option value="60대">60대</option>
                </select>
              </div>

              <div className="field">
                <label className="label">직업/상황 메모</label>
                <input
                  className="input"
                  value={form.occupation}
                  onChange={(e) => updateForm("occupation", e.target.value)}
                  placeholder="예: 사무직 / 자영업 / 주부 / 은퇴예정"
                />
              </div>

              <div className="field">
                <label className="label">월 보험료 예산</label>
                <input
                  className="input"
                  type="number"
                  value={form.monthlyBudget}
                  onChange={(e) => updateForm("monthlyBudget", Number(e.target.value))}
                />
              </div>

              <div className="field">
                <label className="label">주요 니즈 선택</label>
                <div className="chip-wrap">
                  {needOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${form.needs.includes(item) ? "active" : ""}`}
                      onClick={() => toggleNeed(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">현재 가입된 주요 담보</label>
                <div className="chip-wrap">
                  {coverageOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${form.currentCoverages.includes(item) ? "active" : ""}`}
                      onClick={() => toggleCoverage(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">기존 계약 분석 메모</label>
                <textarea
                  className="textarea"
                  value={form.currentContractsText}
                  onChange={(e) => updateForm("currentContractsText", e.target.value)}
                  placeholder="예: 실손만 있음 / 암진단비 부족 / 수술비 위주 / 갱신 부담 우려"
                />
              </div>

              <div className="field">
                <label className="label">상담 추가 메모</label>
                <textarea
                  className="textarea"
                  value={form.memo}
                  onChange={(e) => updateForm("memo", e.target.value)}
                  placeholder="예: 배우자/자녀 상담 확장 가능성, 보험료 민감도, 갱신형 거부감 등"
                />
              </div>
            </div>

            {/* 중앙 결과 */}
            <div>
              <div className="card">
                <h2 className="section-title">추천 결과 / 비교실</h2>
                <p className="section-sub">
                  추천 상품군과 원수사 비교 포인트를 실무 상담 멘트 중심으로 정리합니다.
                </p>

                <div className="result-top">
                  <div className="mini-stat">
                    <div className="k">추천 1순위</div>
                    <div className="v">{topProduct?.name || "-"}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="k">예산</div>
                    <div className="v">{currency(form.monthlyBudget)}원</div>
                  </div>
                  <div className="mini-stat">
                    <div className="k">부족 담보</div>
                    <div className="v">{missingCoverages.length}개</div>
                  </div>
                </div>

                {recommendedProducts.map((product, idx) => (
                  <div key={product.id} className="product-card">
                    <div className="product-header">
                      <div>
                        <h3 className="product-name">
                          {idx + 1}. {product.name}
                        </h3>
                        <div className="section-sub" style={{ margin: "6px 0 0 0" }}>
                          {product.comparisonMent}
                        </div>
                      </div>
                      <div className="score-badge">적합도 {product.matchScore}점</div>
                    </div>

                    <div className="tag-row">
                      <span className="tag">카테고리: {product.category}</span>
                      <span className="tag">
                        예산 범위: {currency(product.monthlyBudgetRange[0])}~{currency(product.monthlyBudgetRange[1])}원
                      </span>
                      {product.targetNeeds.map((item) => (
                        <span className="tag" key={item}>{item}</span>
                      ))}
                    </div>

                    <ul className="bullet">
                      {product.coreStrengths.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="compare-grid">
                  {topInsurers.map((insurer) => (
                    <div key={insurer.id} className="insurer-card">
                      <div className="insurer-head">
                        <LogoImage insurer={insurer} />
                        <div>
                          <h4 className="insurer-name">{insurer.name}</h4>
                          <div className="insurer-type">{insurer.type}</div>
                        </div>
                      </div>

                      <div className="tag-row">
                        {insurer.strengthTags.map((tag) => (
                          <span className="tag" key={tag}>{tag}</span>
                        ))}
                      </div>

                      <ul className="bullet">
                        {insurer.salesPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="practical-box">
                  <h3 className="practical-title">실무 상담 포인트</h3>
                  <ul className="practical-list">
                    {consultSummary.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="practical-box" style={{ marginTop: 12 }}>
                  <h3 className="practical-title">권장 상담 멘트 흐름</h3>
                  <ul className="practical-list">
                    {salesMent.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* PDF 리포트 영역 */}
              <div className="report" ref={reportRef}>
                <div className="report-sheet">
                  <div className="report-cover">
                    <h2 className="report-cover-title">유어즈에셋 상담 리포트</h2>
                    <div className="report-cover-sub">
                      고객 조건 분석 / 추천 상품군 / 원수사 비교 / 부족 담보 / 상담 포인트 정리
                    </div>

                    <div className="report-meta">
                      <div className="report-meta-card">
                        <div className="k">고객명</div>
                        <div className="v">{form.customerName || "미입력"}</div>
                      </div>
                      <div className="report-meta-card">
                        <div className="k">연령/성별</div>
                        <div className="v">{form.ageGroup} / {form.gender}</div>
                      </div>
                      <div className="report-meta-card">
                        <div className="k">예산</div>
                        <div className="v">{currency(form.monthlyBudget)}원</div>
                      </div>
                      <div className="report-meta-card">
                        <div className="k">작성일</div>
                        <div className="v">{getToday()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="report-body">
                    <div className="report-section">
                      <div className="report-section-head">1. 핵심 요약</div>
                      <div className="report-section-body">
                        <div className="report-highlight">
                          <div className="highlight-card">
                            <div className="k">추천 1순위</div>
                            <div className="v">{topProduct?.name || "-"}</div>
                          </div>
                          <div className="highlight-card">
                            <div className="k">주요 니즈</div>
                            <div className="v">{form.needs.join(", ") || "-"}</div>
                          </div>
                          <div className="highlight-card">
                            <div className="k">부족 담보</div>
                            <div className="v">
                              {missingCoverages.length ? missingCoverages.join(", ") : "핵심 담보 기본 보유"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-head">2. 기존 계약 분석 / 부족 담보</div>
                      <div className="report-section-body">
                        <div className="report-grid-two">
                          <div className="detail-block">
                            <h4>기존 계약 메모</h4>
                            <div className="detail-text">
                              {form.currentContractsText || "기존 계약 메모 없음"}
                            </div>
                          </div>
                          <div className="detail-block">
                            <h4>부족 담보 분석</h4>
                            <div className="detail-text">
                              {missingCoverages.length
                                ? `현재 기준으로 ${missingCoverages.join(", ")} 보완 우선 검토가 필요합니다.`
                                : "선택된 주요 담보는 기본 보유 상태로 확인됩니다."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-head">3. 추천 상품군</div>
                      <div className="report-section-body">
                        {recommendedProducts.map((product, idx) => (
                          <div key={product.id} className="detail-block">
                            <h4>{idx + 1}. {product.name}</h4>
                            <div className="detail-text">
                              {product.comparisonMent}
                              {"\n\n"}핵심 포인트:
                              {"\n"}- {product.coreStrengths.join("\n- ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-head">4. 추천 원수사 비교 포인트</div>
                      <div className="report-section-body">
                        <div className="report-grid-two">
                          {topInsurers.map((insurer) => (
                            <div key={insurer.id} className="detail-block">
                              <h4>{insurer.name}</h4>
                              <div className="detail-text">
                                강점 키워드: {insurer.strengthTags.join(", ")}
                                {"\n\n"}실무 활용 포인트:
                                {"\n"}- {insurer.salesPoints.join("\n- ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-head">5. 상담 진행 멘트</div>
                      <div className="report-section-body">
                        <div className="detail-block">
                          <h4>상담 요약 멘트</h4>
                          <div className="detail-text">
                            {consultSummary.map((item) => `- ${item}`).join("\n")}
                          </div>
                        </div>
                        <div className="detail-block">
                          <h4>실전 제안 멘트</h4>
                          <div className="detail-text">
                            {salesMent.map((item) => `- ${item}`).join("\n")}
                          </div>
                        </div>
                        <div className="detail-block">
                          <h4>추가 메모</h4>
                          <div className="detail-text">{form.memo || "추가 메모 없음"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="foot-note">
                      본 리포트는 상담 보조용 초안입니다. 실제 상품 제안 시에는 최신 상품 내용, 약관, 인수 기준,
                      보험료 변동 여부를 반드시 재확인한 후 활용하세요.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측 저장 고객 */}
            <div className="card">
              <h2 className="section-title">저장 고객 상세보기</h2>
              <p className="section-sub">
                저장된 고객을 불러와 재상담하거나, 부족 담보/추천 결과를 바로 다시 확인할 수 있습니다.
              </p>

              <div className="saved-list">
                {savedCustomers.length === 0 && (
                  <div className="detail-block">
                    <div className="detail-text">아직 저장된 고객 정보가 없습니다.</div>
                  </div>
                )}

                {savedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`saved-item ${selectedSavedId === customer.id ? "active" : ""}`}
                    onClick={() => setSelectedSavedId(customer.id)}
                  >
                    <div className="saved-item-top">
                      <div>
                        <h4 className="saved-name">{customer.form.customerName || "이름 미입력"}</h4>
                        <div className="saved-sub">
                          {customer.form.ageGroup} / {customer.form.gender} / 예산 {currency(customer.form.monthlyBudget)}원
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSavedCustomer && (
                <div className="detail-panel">
                  <div className="detail-block">
                    <h4>기본 정보</h4>
                    <div className="detail-text">
                      고객명: {selectedSavedCustomer.form.customerName || "-"}
                      {"\n"}성별: {selectedSavedCustomer.form.gender}
                      {"\n"}연령대: {selectedSavedCustomer.form.ageGroup}
                      {"\n"}직업/상황: {selectedSavedCustomer.form.occupation || "-"}
                      {"\n"}예산: {currency(selectedSavedCustomer.form.monthlyBudget)}원
                    </div>
                  </div>

                  <div className="detail-block">
                    <h4>선택 니즈 / 현재 담보</h4>
                    <div className="detail-text">
                      니즈: {selectedSavedCustomer.form.needs.join(", ") || "-"}
                      {"\n"}현재 담보: {selectedSavedCustomer.form.currentCoverages.join(", ") || "-"}
                    </div>
                  </div>

                  <div className="detail-block">
                    <h4>추천 결과</h4>
                    <div className="detail-text">
                      {selectedSavedCustomer.recommendedProducts
                        .map((item, idx) => `${idx + 1}. ${item.name} (${item.matchScore}점)`)
                        .join("\n")}
                    </div>
                  </div>

                  <div className="detail-block">
                    <h4>부족 담보 / 상담 요약</h4>
                    <div className="detail-text">
                      부족 담보: {selectedSavedCustomer.missingCoverages.join(", ") || "없음"}
                      {"\n\n"}
                      {selectedSavedCustomer.consultSummary.map((item) => `- ${item}`).join("\n")}
                    </div>
                  </div>

                  <div className="detail-block">
                    <h4>기존 계약 / 추가 메모</h4>
                    <div className="detail-text">
                      기존 계약 메모:
                      {"\n"}{selectedSavedCustomer.form.currentContractsText || "-"}
                      {"\n\n"}추가 메모:
                      {"\n"}{selectedSavedCustomer.form.memo || "-"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-accent"
                      onClick={() => handleLoadCustomer(selectedSavedCustomer)}
                    >
                      이 고객 불러오기
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteCustomer(selectedSavedCustomer.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
