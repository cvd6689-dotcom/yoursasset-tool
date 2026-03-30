import { useEffect, useMemo, useState } from "react";
import {
  deleteFirebaseCase,
  deleteLocalCase,
  getFirebaseCases,
  getLocalCases,
  saveFirebaseCase,
  saveLocalCase,
} from "./services/storage";
import { exportCaseToPdf } from "./utils/pdf";
import "./index.css";

const initialForm = {
  customerName: "",
  age: "",
  gender: "여성",
  consultType: "보장분석",
  company: "삼성화재",
  product: "",
  premium: "",
  coverage: "",
  memo: "",
};

const companies = [
  "삼성화재",
  "DB손해보험",
  "현대해상",
  "KB손해보험",
  "메리츠화재",
  "한화손해보험",
  "흥국화재",
  "롯데손해보험",
  "MG손해보험",
  "삼성생명",
  "한화생명",
  "교보생명",
  "AIA생명",
];

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [localCases, setLocalCases] = useState([]);
  const [firebaseCases, setFirebaseCases] = useState([]);
  const [loadingFirebase, setLoadingFirebase] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLocalCases(getLocalCases());
    loadFirebaseCases();
  }, []);

  async function loadFirebaseCases() {
    try {
      setLoadingFirebase(true);
      const data = await getFirebaseCases();
      setFirebaseCases(data);
    } catch (error) {
      console.error(error);
      setMessage("Firebase 불러오기 실패");
    } finally {
      setLoadingFirebase(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleLocalSave() {
    const next = saveLocalCase(form);
    setLocalCases(next);
    setMessage("localStorage 저장 완료");
  }

  async function handleFirebaseSave() {
    try {
      await saveFirebaseCase(form);
      await loadFirebaseCases();
      setMessage("Firebase 저장 완료");
    } catch (error) {
      console.error(error);
      setMessage("Firebase 저장 실패");
    }
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("입력 초기화 완료");
  }

  function handleLoad(item) {
    setForm({
      customerName: item.customerName || "",
      age: item.age || "",
      gender: item.gender || "여성",
      consultType: item.consultType || "보장분석",
      company: item.company || "삼성화재",
      product: item.product || "",
      premium: item.premium || "",
      coverage: item.coverage || "",
      memo: item.memo || "",
    });
    setMessage("불러오기 완료");
  }

  function handleDeleteLocal(id) {
    const next = deleteLocalCase(id);
    setLocalCases(next);
    setMessage("로컬 데이터 삭제 완료");
  }

  async function handleDeleteFirebase(id) {
    try {
      await deleteFirebaseCase(id);
      await loadFirebaseCases();
      setMessage("Firebase 데이터 삭제 완료");
    } catch (error) {
      console.error(error);
      setMessage("Firebase 삭제 실패");
    }
  }

  const mergedCases = useMemo(() => {
    const all = [...localCases, ...firebaseCases];
    const q = keyword.trim().toLowerCase();

    if (!q) return all;

    return all.filter((item) =>
      [
        item.customerName,
        item.company,
        item.product,
        item.consultType,
        item.memo,
        item.coverage,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [localCases, firebaseCases, keyword]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-badge">Y</div>
          <div>
            <h1>유어즈에셋 포털</h1>
            <p>실무형 B형 상담 · 저장 · PDF 출력</p>
          </div>
        </div>

        <div className="nav-card">
          <h3>빠른 메뉴</h3>
          <button className="ghost-btn" type="button">보장분석</button>
          <button className="ghost-btn" type="button">상품비교</button>
          <button className="ghost-btn" type="button">상담저장</button>
          <button className="ghost-btn" type="button">PDF 출력</button>
        </div>

        <div className="stats-card">
          <h3>현황</h3>
          <div className="stat-row">
            <span>로컬 저장</span>
            <strong>{localCases.length}</strong>
          </div>
          <div className="stat-row">
            <span>Firebase 저장</span>
            <strong>{firebaseCases.length}</strong>
          </div>
          <div className="stat-row">
            <span>검색 결과</span>
            <strong>{mergedCases.length}</strong>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <section className="hero">
          <div>
            <h2>유어즈에셋 설계사 실무 포털</h2>
            <p>상담 입력 → 저장 → 불러오기 → PDF 출력까지 한 화면에서 처리</p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={handleLocalSave}>
              local 저장
            </button>
            <button className="secondary-btn" type="button" onClick={handleFirebaseSave}>
              Firebase 저장
            </button>
            <button className="dark-btn" type="button" onClick={() => exportCaseToPdf(form)}>
              PDF 출력
            </button>
          </div>
        </section>

        {message ? <div className="message-bar">{message}</div> : null}

        <section className="grid-two">
          <div className="panel">
            <div className="panel-head">
              <h3>상담 입력</h3>
              <button className="text-btn" type="button" onClick={handleReset}>
                초기화
              </button>
            </div>

            <div className="form-grid">
              <label>
                고객명
                <input
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  placeholder="홍길동"
                />
              </label>

              <label>
                연령
                <input
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="45"
                />
              </label>

              <label>
                성별
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="여성">여성</option>
                  <option value="남성">남성</option>
                </select>
              </label>

              <label>
                상담유형
                <select
                  name="consultType"
                  value={form.consultType}
                  onChange={handleChange}
                >
                  <option value="보장분석">보장분석</option>
                  <option value="암보험">암보험</option>
                  <option value="실손보완">실손보완</option>
                  <option value="간병보험">간병보험</option>
                  <option value="운전자보험">운전자보험</option>
                  <option value="화재보험">화재보험</option>
                  <option value="태아보험">태아보험</option>
                </select>
              </label>

              <label>
                보험사
                <select name="company" value={form.company} onChange={handleChange}>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                상품명
                <input
                  name="product"
                  value={form.product}
                  onChange={handleChange}
                  placeholder="예: 건강보험 플랜"
                />
              </label>

              <label className="full">
                월보험료
                <input
                  name="premium"
                  value={form.premium}
                  onChange={handleChange}
                  placeholder="예: 85000"
                />
              </label>

              <label className="full">
                보장요약
                <textarea
                  name="coverage"
                  value={form.coverage}
                  onChange={handleChange}
                  rows="4"
                  placeholder="암진단비 / 유사암 / 수술비 / 입원일당 등"
                />
              </label>

              <label className="full">
                상담메모
                <textarea
                  name="memo"
                  value={form.memo}
                  onChange={handleChange}
                  rows="5"
                  placeholder="고객 니즈 / 병력 / 리모델링 포인트 / 후속 액션"
                />
              </label>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>실무 요약 카드</h3>
            </div>

            <div className="summary-card">
              <div className="summary-row">
                <span>고객명</span>
                <strong>{form.customerName || "-"}</strong>
              </div>
              <div className="summary-row">
                <span>기본정보</span>
                <strong>
                  {form.age || "-"}세 / {form.gender}
                </strong>
              </div>
              <div className="summary-row">
                <span>상담유형</span>
                <strong>{form.consultType}</strong>
              </div>
              <div className="summary-row">
                <span>보험사</span>
                <strong>{form.company}</strong>
              </div>
              <div className="summary-row">
                <span>상품명</span>
                <strong>{form.product || "-"}</strong>
              </div>
              <div className="summary-row">
                <span>월보험료</span>
                <strong>{form.premium ? `${form.premium}원` : "-"}</strong>
              </div>

              <div className="summary-block">
                <h4>보장요약</h4>
                <p>{form.coverage || "-"}</p>
              </div>

              <div className="summary-block">
                <h4>상담메모</h4>
                <p>{form.memo || "-"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>저장 데이터 목록</h3>
            <input
              className="search-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="고객명 / 보험사 / 상품명 검색"
            />
          </div>

          {loadingFirebase ? (
            <div className="empty-box">Firebase 데이터 불러오는 중...</div>
          ) : mergedCases.length === 0 ? (
            <div className="empty-box">저장된 데이터가 없습니다.</div>
          ) : (
            <div className="case-list">
              {mergedCases.map((item) => (
                <div key={`${item.source}-${item.id}`} className="case-card">
                  <div className="case-top">
                    <div>
                      <div className="case-badge">{item.source}</div>
                      <h4>{item.customerName || "이름없음"}</h4>
                      <p>
                        {item.consultType || "-"} · {item.company || "-"} · {item.product || "-"}
                      </p>
                    </div>

                    <div className="case-actions">
                      <button className="mini-btn" type="button" onClick={() => handleLoad(item)}>
                        불러오기
                      </button>
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => exportCaseToPdf(item)}
                      >
                        PDF
                      </button>

                      {item.source === "local" ? (
                        <button
                          className="mini-btn danger"
                          type="button"
                          onClick={() => handleDeleteLocal(item.id)}
                        >
                          삭제
                        </button>
                      ) : (
                        <button
                          className="mini-btn danger"
                          type="button"
                          onClick={() => handleDeleteFirebase(item.id)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="case-body">
                    <div>
                      <strong>연령/성별:</strong> {item.age || "-"} / {item.gender || "-"}
                    </div>
                    <div>
                      <strong>보험료:</strong> {item.premium ? `${item.premium}원` : "-"}
                    </div>
                    <div>
                      <strong>보장요약:</strong> {item.coverage || "-"}
                    </div>
                    <div>
                      <strong>메모:</strong> {item.memo || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
