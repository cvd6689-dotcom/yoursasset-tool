import { useEffect, useMemo, useRef, useState } from "react";
import { exportElementToPdf } from "./utils/pdf";
import { loadData, saveData, clearData } from "./services/storage";
import INSURER_MASTER from "./data/insurers";
import PRODUCT_MASTER from "./data/products";
import "./index.css";

const DEFAULT_FORM = {
  consultant: "",
  customer: "",
  memo: "",
  selectedInsurer: "all",
  selectedCategory: "all",
  searchKeyword: "",
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

  const activeInsurers = useMemo(() => {
    return INSURER_MASTER.filter((item) => item.useYn).sort(
      (a, b) => a.order - b.order
    );
  }, []);

  const activeProducts = useMemo(() => {
    return PRODUCT_MASTER.filter((item) => item.useYn).sort(
      (a, b) => a.order - b.order
    );
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set(activeProducts.map((item) => item.category));
    return ["all", ...Array.from(set)];
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const insurerMatch =
        form.selectedInsurer === "all" ||
        product.insurerId === form.selectedInsurer;

      const categoryMatch =
        form.selectedCategory === "all" ||
        product.category === form.selectedCategory;

      const keyword = form.searchKeyword.trim().toLowerCase();
      const keywordMatch =
        keyword === "" ||
        [
          product.productName,
          product.category,
          product.coverage,
          product.note,
          product.age,
          product.premium,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return insurerMatch && categoryMatch && keywordMatch;
    });
  }, [activeProducts, form]);

  const insurerCards = useMemo(() => {
    return activeInsurers
      .map((insurer) => ({
        ...insurer,
        products: filteredProducts.filter(
          (product) => product.insurerId === insurer.id
        ),
      }))
      .filter((insurer) => insurer.products.length > 0);
  }, [activeInsurers, filteredProducts]);

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
    await exportElementToPdf(pdfRef.current, "유어즈에셋-원수사별-상품비교실.pdf");
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
            <h2>상품 비교 조건</h2>
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
                {activeInsurers.map((insurer) => (
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
              <label>검색어</label>
              <input
                value={form.searchKeyword}
                onChange={(e) => handleChange("searchKeyword", e.target.value)}
                placeholder="상품명, 보장내용, 비고 등 검색"
              />
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
                  <h2>원수사별 로고 카드형 비교실</h2>
                </div>
              </div>
              <div className="summary-meta">
                <span>설계사: {form.consultant || "-"}</span>
                <span>고객명: {form.customer || "-"}</span>
                <span>검색결과: {filteredProducts.length}건</span>
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
            {insurerCards.map((insurer) => (
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
                      <span className="insurer-count">
                        상품 {insurer.products.length}건
                      </span>
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
                        <tr key={product.id}>
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
