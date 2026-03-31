import React, { useEffect, useMemo, useState } from "react";
import insurers from "./data/insurers";
import products from "./data/products";

const STORAGE_KEY = "yoursasset_consulting_portal_v3";

const initialForm = {
  customerName: "",
  gender: "남성",
  age: "",
  job: "",
  married: "미혼",
  hasChildren: "없음",
  driving: "아니오",
  purpose: "보장분석",
  interests: [],
  memo: "",
};

const interestOptions = [
  "암",
  "뇌혈관",
  "심장질환",
  "입원수술",
  "후유장해",
  "운전자",
  "교통사고처리지원금",
  "변호사선임비",
  "자녀",
  "어린이",
  "유병자",
  "간편심사",
  "사망",
  "가족",
];

function App() {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch (e) {
        console.error("저장 데이터 불러오기 실패", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (item) => {
    setForm((prev) => {
      const exists = prev.interests.includes(item);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((v) => v !== item)
          : [...prev.interests, item],
      };
    });
  };

  const recommendation = useMemo(() => {
    const ageNum = Number(form.age || 0);

    const scoredProducts = products
      .map((product) => {
        let score = 0;

        if (product.forGoals.includes(form.purpose)) score += 4;

        form.interests.forEach((interest) => {
          if (product.forInterests.includes(interest)) score += 3;
        });

        if (product.scoreRules?.minAge && ageNum >= product.scoreRules.minAge) score += 1;
        if (product.scoreRules?.maxAge && ageNum <= product.scoreRules.maxAge) score += 1;
        if (product.scoreRules?.marriedBonus && form.married === "기혼") {
          score += product.scoreRules.marriedBonus;
        }
        if (product.scoreRules?.childBonus && form.hasChildren === "있음") {
          score += product.scoreRules.childBonus;
        }
        if (product.scoreRules?.drivingRequired && form.driving === "예") score += 4;
        if (product.scoreRules?.childRequired && form.hasChildren === "있음") score += 4;

        return { ...product, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const topProducts = scoredProducts.slice(0, 3);
    const mainProduct = topProducts[0] || null;

    const insurerScores = insurers.map((insurer) => {
      let score = 0;

      topProducts.forEach((product) => {
        if (product.insurers.includes(insurer.id)) score += 4;
      });

      form.interests.forEach((interest) => {
        if (insurer.strengths.includes(interest)) score += 2;
      });

      if (form.driving === "예" && insurer.strengths.includes("운전자")) score += 2;
      if (form.hasChildren === "있음" && insurer.strengths.includes("가족")) score += 2;
      if (form.purpose === "건강보장" && insurer.strengths.includes("건강보험")) score += 2;
      if (form.purpose === "가족보장" && insurer.strengths.includes("가족보장")) score += 2;

      return { ...insurer, score };
    });

    const topInsurers = insurerScores
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const counselingPoints = [
      `${form.customerName || "고객"} 고객은 ${form.purpose} 중심 상담이 우선입니다.`,
      form.driving === "예"
        ? "운전 여부가 있으므로 운전자 비용보장 비교 설명이 필요합니다."
        : "운전 여부가 없으므로 건강/가족보장 중심 상담이 적합합니다.",
      form.hasChildren === "있음"
        ? "자녀 보장과 부모 보장을 연결해 교차 상담하는 흐름이 좋습니다."
        : "개인 중심 핵심보장과 유지여력 점검이 우선입니다.",
      form.married === "기혼"
        ? "가족 책임과 생활비 공백 관점으로 설명하면 설득력이 높습니다."
        : "현재 소득 대비 꼭 필요한 담보부터 우선 제안하는 것이 적합합니다.",
    ];

    let planSummary = "입력값을 기준으로 추천 설계안이 생성됩니다.";
    if (mainProduct) {
      planSummary = `${form.customerName || "고객"} 고객에게는 "${mainProduct.category}" 중심 제안이 우선이며, ${
        topInsurers[0]?.name || "추천 원수사"
      } 포함 ${topInsurers.length}개 원수사 비교가 적합합니다.`;
    }

    return {
      topProducts,
      mainProduct,
      topInsurers,
      counselingPoints,
      planSummary,
    };
  }, [form]);

  const resetForm = () => {
    setForm(initialForm);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="portal-root">
      <header className="topbar">
        <div className="brand-wrap">
          <img src="/logo.png" alt="유어즈에셋 로고" className="brand-logo" />
          <div>
            <h1>유어즈에셋 설계사 포털</h1>
            <p>고객 입력형 추천 · 원수사 비교실 · PDF 저장</p>
          </div>
        </div>

        <div className="topbar-actions no-print">
          <button className="btn secondary" onClick={resetForm}>
            초기화
          </button>
          <button className="btn primary" onClick={handlePrint}>
            PDF 저장
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <h2>고객 정보 입력</h2>

          <div className="grid-2">
            <Field label="고객명">
              <input
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="예: 홍길동"
              />
            </Field>

            <Field label="성별">
              <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
                <option>남성</option>
                <option>여성</option>
              </select>
            </Field>

            <Field label="나이">
              <input
                type="number"
                value={form.age}
                onChange={(e) => handleChange("age", e.target.value)}
                placeholder="예: 45"
              />
            </Field>

            <Field label="직업">
              <input
                value={form.job}
                onChange={(e) => handleChange("job", e.target.value)}
                placeholder="예: 자영업 / 사무직"
              />
            </Field>

            <Field label="결혼 여부">
              <select value={form.married} onChange={(e) => handleChange("married", e.target.value)}>
                <option>미혼</option>
                <option>기혼</option>
              </select>
            </Field>

            <Field label="자녀 여부">
              <select
                value={form.hasChildren}
                onChange={(e) => handleChange("hasChildren", e.target.value)}
              >
                <option>없음</option>
                <option>있음</option>
              </select>
            </Field>

            <Field label="운전 여부">
              <select value={form.driving} onChange={(e) => handleChange("driving", e.target.value)}>
                <option>아니오</option>
                <option>예</option>
              </select>
            </Field>

            <Field label="상담 목적">
              <select value={form.purpose} onChange={(e) => handleChange("purpose", e.target.value)}>
                <option>보장분석</option>
                <option>건강보장</option>
                <option>가족보장</option>
                <option>운전자보장</option>
                <option>자녀보장</option>
                <option>보험정리</option>
                <option>유병자상담</option>
                <option>사망보장</option>
                <option>비용보장</option>
              </select>
            </Field>
          </div>

          <div className="field-block">
            <label>관심 보장</label>
            <div className="chip-wrap">
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
          </div>

          <div className="field-block">
            <label>상담 메모</label>
            <textarea
              value={form.memo}
              onChange={(e) => handleChange("memo", e.target.value)}
              placeholder="예: 기존 실손 있음 / 운전 잦음 / 최근 병력 확인 필요"
              rows={6}
            />
          </div>
        </section>

        <section className="panel result-panel">
          <h2>실무 추천 결과</h2>

          <div className="summary-card">
            <div className="summary-title">
              {form.customerName || "고객"} / {form.gender} / {form.age || "-"}세 /{" "}
              {form.job || "직업 미입력"}
            </div>
            <div className="summary-sub">
              {form.married} · 자녀 {form.hasChildren} · 운전 {form.driving} · 상담목적 {form.purpose}
            </div>
          </div>

          <div className="section-block">
            <h3>추천 설계안 요약</h3>
            <div className="plan-box">{recommendation.planSummary}</div>
          </div>

          <div className="section-block">
            <h3>추천 상품군</h3>
            <div className="recommend-list">
              {recommendation.topProducts.length > 0 ? (
                recommendation.topProducts.map((item) => (
                  <div className="recommend-card" key={item.id}>
                    <div className="recommend-head">
                      <strong>{item.category}</strong>
                      <span>추천점수 {item.score}</span>
                    </div>
                    <div className="recommend-name">{item.name}</div>
                    <ul>
                      {item.points.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <EmptyBox text="입력값 기준 추천 결과가 아직 없습니다." />
              )}
            </div>
          </div>

          <div className="section-block">
            <h3>추천 원수사</h3>
            <div className="insurer-grid">
              {recommendation.topInsurers.length > 0 ? (
                recommendation.topInsurers.map((insurer) => (
                  <div className="insurer-card" key={insurer.id}>
                    <img
                      src={insurer.logo}
                      alt={insurer.name}
                      className="insurer-logo"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="insurer-name">{insurer.name}</div>
                    <div className="insurer-score">추천점수 {insurer.score}</div>
                    <div className="tag-wrap">
                      {insurer.tags.map((tag) => (
                        <span className="mini-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyBox text="추천 원수사가 아직 없습니다." />
              )}
            </div>
          </div>

          <div className="section-block">
            <h3>원수사 비교표</h3>
            {recommendation.mainProduct && recommendation.topInsurers.length > 0 ? (
              <div className="table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>비교항목</th>
                      {recommendation.topInsurers.map((insurer) => (
                        <th key={insurer.id}>{insurer.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recommendation.mainProduct.compareFields.map((field) => (
                      <tr key={field}>
                        <td className="row-title">{field}</td>
                        {recommendation.topInsurers.map((insurer) => (
                          <td key={insurer.id + field}>
                            {recommendation.mainProduct.compareData?.[insurer.id]?.[field] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBox text="비교표를 생성하려면 고객 정보를 입력하세요." />
            )}
          </div>

          <div className="section-block">
            <h3>상담 포인트</h3>
            <div className="point-box">
              {recommendation.counselingPoints.map((point, idx) => (
                <div className="point-item" key={idx}>
                  {idx + 1}. {point}
                </div>
              ))}
            </div>
          </div>

          <div className="section-block">
            <h3>상담 메모 확인</h3>
            <div className="memo-box">{form.memo || "입력된 상담 메모가 없습니다."}</div>
          </div>
        </section>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f5f7fb;
          color: #1f2937;
          font-family: 'Noto Sans KR', sans-serif;
        }

        .portal-root {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top right, rgba(31, 78, 121, 0.10), transparent 22%),
            linear-gradient(180deg, #f8fbff 0%, #f3f6fa 100%);
        }

        .topbar {
          max-width: 1400px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-logo {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 16px;
          background: #fff;
        }

        .brand-wrap h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #103b66;
        }

        .brand-wrap p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .topbar-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn.primary {
          background: #103b66;
          color: #fff;
        }

        .btn.secondary {
          background: #eef2f7;
          color: #1f2937;
        }

        .layout {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 20px;
        }

        .panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .panel h2 {
          margin: 0 0 18px;
          font-size: 22px;
          color: #103b66;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label,
        .field-block label {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        input, select, textarea {
          width: 100%;
          border: 1px solid #dbe1ea;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          background: #fff;
          font-family: 'Noto Sans KR', sans-serif;
        }

        input, select {
          height: 46px;
        }

        textarea {
          resize: vertical;
        }

        .field-block {
          margin-top: 18px;
        }

        .chip-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .chip {
          border: 1px solid #d7deea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .chip.active {
          background: #103b66;
          color: #fff;
          border-color: #103b66;
        }

        .summary-card {
          background: linear-gradient(135deg, #103b66 0%, #1c5b97 100%);
          color: #fff;
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .summary-title {
          font-size: 18px;
          font-weight: 800;
        }

        .summary-sub {
          margin-top: 8px;
          font-size: 13px;
          opacity: 0.9;
        }

        .section-block {
          margin-top: 22px;
        }

        .section-block h3 {
          margin: 0 0 12px;
          font-size: 18px;
          color: #0f2f4f;
        }

        .plan-box,
        .memo-box {
          border: 1px solid #dbe7f3;
          background: #f8fbff;
          border-radius: 14px;
          padding: 16px;
          font-size: 14px;
          line-height: 1.7;
          color: #334155;
          white-space: pre-wrap;
        }

        .recommend-list {
          display: grid;
          gap: 14px;
        }

        .recommend-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          background: #fcfdff;
        }

        .recommend-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 13px;
          color: #475569;
          margin-bottom: 8px;
        }

        .recommend-name {
          font-size: 17px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 10px;
        }

        .recommend-card ul {
          margin: 0;
          padding-left: 18px;
          color: #4b5563;
          line-height: 1.6;
          font-size: 14px;
        }

        .insurer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .insurer-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          background: #fff;
        }

        .insurer-logo {
          width: 100%;
          max-width: 110px;
          height: 42px;
          object-fit: contain;
          margin-bottom: 12px;
        }

        .insurer-name {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .insurer-score {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }

        .tag-wrap {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
        }

        .mini-tag {
          padding: 6px 10px;
          border-radius: 999px;
          background: #eef4fb;
          color: #184a77;
          font-size: 12px;
          font-weight: 700;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
        }

        .compare-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          min-width: 680px;
        }

        .compare-table th,
        .compare-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 12px;
          text-align: center;
          font-size: 14px;
        }

        .compare-table th {
          background: #103b66;
          color: #fff;
          font-weight: 800;
        }

        .compare-table .row-title {
          background: #f8fbff;
          color: #103b66;
          font-weight: 800;
        }

        .point-box {
          display: grid;
          gap: 10px;
        }

        .point-item {
          border-left: 4px solid #103b66;
          background: #f8fbff;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
        }

        .empty-box {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 20px;
          color: #64748b;
          text-align: center;
          background: #f8fafc;
        }

        @media (max-width: 1100px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .insurer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .portal-root {
            padding: 14px;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .grid-2 {
            grid-template-columns: 1fr;
          }

          .insurer-grid {
            grid-template-columns: 1fr;
          }

          .brand-wrap h1 {
            font-size: 22px;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .portal-root {
            padding: 0;
            background: #fff;
          }

          .topbar, .panel {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function EmptyBox({ text }) {
  return <div className="empty-box">{text}</div>;
}

export default App;
