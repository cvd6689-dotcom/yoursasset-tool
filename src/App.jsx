import { useEffect, useMemo, useRef, useState } from "react";
import { exportElementToPdf } from "./utils/pdf";
import { loadData, saveData, clearData } from "./services/storage";
import "./index.css";

const INSURER_OPTIONS = [
  {
    id: "samsung",
    name: "삼성화재",
    logo: "/insurers/samsung.png",
    color: "#1f6feb",
    products: [
      {
        id: 1,
        category: "건강보험",
        productName: "건강보험 New 플랜",
        age: "30~65세",
        premium: "월 48,000원",
        coverage: "암/뇌/심장/수술비",
        note: "표준형 설계 기준",
      },
      {
        id: 2,
        category: "간병보험",
        productName: "간병케어 플랜",
        age: "40~75세",
        premium: "월 61,000원",
        coverage: "간병인 사용일당/입원",
        note: "고연령층 상담용",
      },
    ],
  },
  {
    id: "db",
    name: "DB손해보험",
    logo: "/insurers/db.png",
    color: "#1c8c4c",
    products: [
      {
        id: 1,
        category: "건강보험",
        productName: "프로미 건강보험",
        age: "20~70세",
        premium: "월 52,000원",
        coverage: "암/유사암/뇌혈관/허혈성",
        note: "가성비형 비교용",
      },
      {
        id: 2,
        category: "운전자보험",
        productName: "운전자비용 플랜",
        age: "19~70세",
        premium: "월 19,000원",
        coverage: "교통사고처리지원금/변호사선임",
        note: "실무 제안 빈도 높음",
      },
    ],
  },
  {
    id: "hyundai",
    name: "현대해상",
    logo: "/insurers/hyundai.png",
    color: "#ef7d00",
    products: [
      {
        id: 1,
        category: "태아보험",
        productName: "굿앤굿 어린이 플랜",
        age: "태아~15세",
        premium: "월 73,000원",
        coverage: "입원/수술/진단비",
        note: "어린이보험 비교용",
      },
      {
        id: 2,
        category: "건강보험",
        productName: "뉴 건강플랜",
        age: "20~65세",
        premium: "월 57,000원",
        coverage: "암/뇌/심/질병수술",
        note: "담보 조합형",
      },
    ],
  },
  {
    id: "heungkuk",
    name: "흥국화재",
    logo: "/insurers/heungkuk.png",
    color: "#d91c5c",
    products: [
      {
        id: 1,
        category: "건강보험",
        productName: "흥Good 건강보험",
        age: "20~70세",
        premium: "월 44,000원",
        coverage: "암/뇌혈관/심장질환",
        note: "비교표 제안용",
      },
      {
        id: 2,
        category: "화재보험",
        productName: "우리집 화재플랜",
        age: "주택/상가",
        premium: "월 16,000원",
        coverage: "화재/누수/배상책임",
        note: "생활밀착형",
      },
    ],
  },
];

const DEFAULT_FORM = {
  consultant: "",
  customer: "",
  memo: "",
  selectedInsurer: "all",
  selectedCategory: "all",
};

const STORAGE_EMPTY = {
  form: DEFAULT_FORM,
};

function App() {
  const pdfRef = useRef(null);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [savedMessage, setSavedMessage] = useState("");
  const [logoErrorMap, setLogoErrorMap] = useState({});

  useEffect(() => {
    const stored = loadData();
    if (stored?.form) {
      setForm({ ...DEFAULT_FORM, ...stored.form });
    }
  }, []);

  useEffect(() => {
    saveData({ form });
  }, [form]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    INSURER_OPTIONS.forEach((insurer) => {
      insurer.products.forEach((product) => set.add(product.category));
    });
    return ["all", ...Array.from(set)];
  }, []);

  const filteredInsurers = useMemo(() => {
    return INSURER_OPTIONS.map((insurer) => {
      const insurerMatch =
        form.selectedInsurer === "all" || form.selectedInsurer === insurer.id;

      const filteredProducts = insurer.products.filter((product) => {
        const categoryMatch =
          form.selectedCategory === "all" ||
          product.category === form.selectedCategory;
        return insurerMatch && categoryMatch;
      });

      return {
        ...insurer,
        products: filteredProducts,
      };
    }).filter((insurer) => insurer.products.length > 0);
  }, [form.selectedInsurer, form.selectedCategory]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    saveData({ form });
    setSavedMessage("저장 완료");
    setTimeout(() => setSavedMessage(""), 1500);
  };

  const handleReset = () => {
    clearData();
    setForm(DEFAULT_FORM);
    setSavedMessage("초기화 완료");
    setTimeout(() => setSavedMessage(""), 1500);
  };

  const handlePdfExport = async () => {
    if (!pdfRef.current) return;
    await exportElementToPdf(pdfRef.current, "유어즈에셋-상품비교실.pdf");
  };

  const handleLogoError = (insurerId) => {
    setLogoErrorMap((prev) => ({
      ...prev,
      [insurerId]: true,
    }));
  };

  return (
    <div className="portal-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img
            src="/logo.png"
            alt="유어즈에셋 로고"
            className="main-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
            <p className="brand-sub">YOURS ASSET SALES PORTAL</p>
            <h1>유어즈에셋 설계사 포털</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" onClick={handleSave}>
            저장
          </button>
          <button className="ghost-btn" onClick={handleReset}>
            초기화
          </button>
          <button className="primary-btn" onClick={handlePdfExport}>
            PDF 저장
          </button>
        </div>
      </header>

      <main className="page-body">
        <section className="control-panel">
          <div className="panel-title-row">
            <h2>상담 기본 정보</h2>
            {savedMessage && <span className="saved-badge">{savedMessage}</span>}
          </div>

          <div className="form-grid">
            <div className="field">
              <label>설계사명</label>
              <input
                value={form.consultant}
                onChange={(e) => handleChange("consultant", e.target.value)}
                placeholder="예: 이과장"
              />
            </div>

            <div className="field">
              <label>고객명</label>
              <input
                value={form.customer}
                onChange={(e) => handleChange("customer", e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>

            <div className="field">
              <label>원수사 선택</label>
              <select
                value={form.selectedInsurer}
                onChange={(e) =>
                  handleChange("selectedInsurer", e.target.value)
                }
              >
                <option value="all">전체 원수사</option>
                {INSURER_OPTIONS.map((insurer) => (
                  <option key={insurer.id} value={insurer.id}>
                    {insurer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>상품군 선택</label>
              <select
                value={form.selectedCategory}
                onChange={(e) =>
                  handleChange("selectedCategory", e.target.value)
                }
              >
                <option value="all">전체 상품군</option>
                {categoryOptions
                  .filter((item) => item !== "all")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>

            <div className="field field-full">
              <label>상담 메모</label>
              <textarea
                rows={4}
                value={form.memo}
                onChange={(e) => handleChange("memo", e.target.value)}
                placeholder="상담 방향, 제안 포인트, 비교 의견 등을 적어주세요."
              />
            </div>
          </div>
        </section>

        <section className="pdf-area" ref={pdfRef}>
          <div className="summary-card">
            <div className="summary-header">
              <div className="summary-brand">
                <img
                  src="/logo.png"
                  alt="유어즈에셋 로고"
                  className="summary-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div>
                  <p>상품 비교실</p>
                  <h2>원수사별 상품 비교 구조</h2>
                </div>
              </div>
              <div className="summary-meta">
                <span>설계사: {form.consultant || "-"}</span>
                <span>고객명: {form.customer || "-"}</span>
              </div>
            </div>

            {form.memo && (
              <div className="memo-box">
                <strong>상담 메모</strong>
                <p>{form.memo}</p>
              </div>
            )}
          </div>

          <section className="insurer-grid">
            {filteredInsurers.map((insurer) => (
              <article className="insurer-card" key={insurer.id}>
                <div
                  className="insurer-card-top"
                  style={{ borderColor: insurer.color }}
                >
                  <div className="insurer-brand">
                    {!logoErrorMap[insurer.id] ? (
                      <img
                        src={insurer.logo}
                        alt={`${insurer.name} 로고`}
                        className="insurer-logo"
                        onError={() => handleLogoError(insurer.id)}
                      />
                    ) : (
                      <div
                        className="insurer-logo-fallback"
                        style={{ backgroundColor: insurer.color }}
                      >
                        {insurer.name.slice(0, 2)}
                      </div>
                    )}

                    <div>
                      <p className="insurer-label">INSURER</p>
                      <h3>{insurer.name}</h3>
                    </div>
                  </div>
                </div>

                <div className="product-table-wrap">
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th>상품군</th>
                        <th>상품명</th>
                        <th>가입연령</th>
                        <th>보험료</th>
                        <th>핵심보장</th>
                        <th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurer.products.map((product) => (
                        <tr key={`${insurer.id}-${product.id}`}>
                          <td>{product.category}</td>
                          <td>{product.productName}</td>
                          <td>{product.age}</td>
                          <td>{product.premium}</td>
                          <td>{product.coverage}</td>
                          <td>{product.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
