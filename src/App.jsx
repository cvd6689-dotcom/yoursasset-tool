import { useRef, useState } from "react";
import { exportElementToPdf } from "./utils/pdf";
import "./index.css";

export default function App() {
  const pdfRef = useRef(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    insurer: "",
    product: "",
    memo: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePdfDownload = async () => {
    try {
      await exportElementToPdf(pdfRef.current, "유어즈에셋-설계사포털.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF 저장에 실패했습니다.");
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>유어즈에셋 설계사 포털</h1>
          <p>실무형 B형 포털</p>
        </div>

        <button className="pdf-btn" onClick={handlePdfDownload}>
          PDF 저장
        </button>
      </header>

      <main ref={pdfRef} className="portal-wrap">
        <section className="card hero-card">
          <h2>고객 상담 입력</h2>
          <p>상담 내용을 입력하고 저장/출력할 수 있습니다.</p>
        </section>

        <section className="card form-card">
          <div className="grid">
            <div className="field">
              <label>고객명</label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="고객명 입력"
              />
            </div>

            <div className="field">
              <label>연락처</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="field">
              <label>원수사</label>
              <input
                name="insurer"
                value={form.insurer}
                onChange={handleChange}
                placeholder="예: 삼성화재"
              />
            </div>

            <div className="field">
              <label>상품명</label>
              <input
                name="product"
                value={form.product}
                onChange={handleChange}
                placeholder="예: 건강보험"
              />
            </div>
          </div>

          <div className="field full">
            <label>상담 메모</label>
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              placeholder="상담 내용 입력"
              rows={8}
            />
          </div>
        </section>

        <section className="card preview-card">
          <h2>출력 미리보기</h2>

          <div className="preview-box">
            <p><strong>고객명:</strong> {form.customerName || "-"}</p>
            <p><strong>연락처:</strong> {form.phone || "-"}</p>
            <p><strong>원수사:</strong> {form.insurer || "-"}</p>
            <p><strong>상품명:</strong> {form.product || "-"}</p>
            <p><strong>상담 메모:</strong></p>
            <div className="memo-preview">{form.memo || "-"}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
