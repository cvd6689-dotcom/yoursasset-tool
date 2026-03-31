import { useEffect, useMemo, useRef, useState } from "react";
import { exportElementToPdf } from "./utils/pdf";
import { saveData, loadData } from "./services/storage";
import "./index.css";

const INSURERS = [
  "삼성화재",
  "DB손해보험",
  "현대해상",
  "KB손해보험",
  "메리츠화재",
  "흥국화재",
  "한화손해보험",
  "롯데손해보험",
  "MG손해보험",
];

const PRODUCTS = [
  {
    id: 1,
    insurer: "삼성화재",
    category: "건강",
    productName: "건강보험 A",
    ageRange: "20~65세",
    paymentPeriod: "20년납",
    coveragePeriod: "90세만기",
    premiumLevel: "중",
    strengths: ["암", "뇌", "심장", "수술"],
    memo: "균형형 설계에 적합",
  },
  {
    id: 2,
    insurer: "DB손해보험",
    category: "건강",
    productName: "건강보험 B",
    ageRange: "15~70세",
    paymentPeriod: "30년납",
    coveragePeriod: "100세만기",
    premiumLevel: "중상",
    strengths: ["유사암", "허혈성", "질병후유장해"],
    memo: "담보 확장형",
  },
  {
    id: 3,
    insurer: "현대해상",
    category: "간병",
    productName: "간병보험 C",
    ageRange: "30~75세",
    paymentPeriod: "20년납",
    coveragePeriod: "종신",
    premiumLevel: "중",
    strengths: ["간병인사용", "재가급여", "치매"],
    memo: "고령층 상담용",
  },
  {
    id: 4,
    insurer: "메리츠화재",
    category: "어린이",
    productName: "어린이보험 D",
    ageRange: "0~15세",
    paymentPeriod: "20년납",
    coveragePeriod: "30세만기",
    premiumLevel: "중",
    strengths: ["입원", "골절", "화상", "응급실"],
    memo: "태아~어린이 상담 활용",
  },
  {
    id: 5,
    insurer: "KB손해보험",
    category: "운전자",
    productName: "운전자보험 E",
    ageRange: "19~80세",
    paymentPeriod: "10년납",
    coveragePeriod: "10년만기",
    premiumLevel: "하",
    strengths: ["변호사선임", "교통사고처리지원금", "벌금"],
    memo: "간편 제안용",
  },
  {
    id: 6,
    insurer: "흥국화재",
    category: "종합",
    productName: "종합보험 F",
    ageRange: "20~65세",
    paymentPeriod: "20년납",
    coveragePeriod: "100세만기",
    premiumLevel: "중",
    strengths: ["상해", "질병", "수술", "입원"],
    memo: "기본 종합보장형",
  },
];

const initialConsultForm = {
  customerName: "",
  phone: "",
  age: "",
  gender: "여성",
  job: "",
  insurer: "",
  category: "건강",
  budget: "",
  needs: "",
  consultationMemo: "",
};

const initialLeadForm = {
  name: "",
  channel: "지인소개",
  status: "상담전",
  phone: "",
  note: "",
};

const categories = ["건강", "간병", "종합", "어린이", "운전자", "화재", "실손"];
const leadChannels = ["지인소개", "블로그", "인스타그램", "당근", "기존고객", "기타"];
const leadStatuses = ["상담전", "상담중", "가입검토", "청약완료", "보류"];

function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function App() {
  const pdfRef = useRef(null);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [consultForm, setConsultForm] = useState(initialConsultForm);
  const [leadForm, setLeadForm] = useState(initialLeadForm);

  const [consultations, setConsultations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [todoText, setTodoText] = useState("");
  const [todos, setTodos] = useState([]);
  const [compareFilters, setCompareFilters] = useState({
    insurer: "",
    category: "",
    keyword: "",
  });

  useEffect(() => {
    const savedConsultations = loadData("yoursasset_consultations") || [];
    const savedLeads = loadData("yoursasset_leads") || [];
    const savedTodos = loadData("yoursasset_todos") || [];
    setConsultations(savedConsultations);
    setLeads(savedLeads);
    setTodos(savedTodos);
  }, []);

  useEffect(() => {
    saveData("yoursasset_consultations", consultations);
  }, [consultations]);

  useEffect(() => {
    saveData("yoursasset_leads", leads);
  }, [leads]);

  useEffect(() => {
    saveData("yoursasset_todos", todos);
  }, [todos]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((item) => {
      const insurerOk = compareFilters.insurer
        ? item.insurer === compareFilters.insurer
        : true;

      const categoryOk = compareFilters.category
        ? item.category === compareFilters.category
        : true;

      const keyword = compareFilters.keyword.trim().toLowerCase();
      const keywordOk = keyword
        ? [
            item.productName,
            item.insurer,
            item.category,
            item.memo,
            ...(item.strengths || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        : true;

      return insurerOk && categoryOk && keywordOk;
    });
  }, [compareFilters]);

  const dashboardStats = useMemo(() => {
    const today = formatDate();
    const todayConsultCount = consultations.filter((item) => item.createdAt === today).length;
    const pendingLeads = leads.filter(
      (item) => item.status === "상담전" || item.status === "상담중"
    ).length;

    return {
      totalConsultations: consultations.length,
      todayConsultCount,
      totalLeads: leads.length,
      pendingLeads,
      totalTodos: todos.length,
      doneTodos: todos.filter((t) => t.done).length,
    };
  }, [consultations, leads, todos]);

  const handleConsultChange = (e) => {
    const { name, value } = e.target;
    setConsultForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeadChange = (e) => {
    const { name, value } = e.target;
    setLeadForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveConsultation = () => {
    if (!consultForm.customerName.trim()) {
      alert("고객명을 입력하세요.");
      return;
    }

    const newItem = {
      id: Date.now(),
      ...consultForm,
      createdAt: formatDate(),
    };

    setConsultations((prev) => [newItem, ...prev]);
    setConsultForm(initialConsultForm);
    alert("상담 내용이 저장되었습니다.");
  };

  const saveLead = () => {
    if (!leadForm.name.trim()) {
      alert("리드 이름을 입력하세요.");
      return;
    }

    const newLead = {
      id: Date.now(),
      ...leadForm,
      createdAt: formatDate(),
    };

    setLeads((prev) => [newLead, ...prev]);
    setLeadForm(initialLeadForm);
    alert("리드가 저장되었습니다.");
  };

  const addTodo = () => {
    if (!todoText.trim()) return;
    const newTodo = {
      id: Date.now(),
      text: todoText,
      done: false,
    };
    setTodos((prev) => [newTodo, ...prev]);
    setTodoText("");
  };

  const toggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteConsultation = (id) => {
    setConsultations((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteLead = (id) => {
    setLeads((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePdfDownload = async () => {
    try {
      await exportElementToPdf(pdfRef.current, "유어즈에셋-설계사포털-B형.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF 저장에 실패했습니다.");
    }
  };

  const quickRecommend = useMemo(() => {
    const byCategory = PRODUCTS.filter(
      (item) => item.category === consultForm.category
    );

    if (!consultForm.insurer) return byCategory.slice(0, 3);

    const prioritized = byCategory.filter(
      (item) => item.insurer === consultForm.insurer
    );

    return (prioritized.length ? prioritized : byCategory).slice(0, 3);
  }, [consultForm.category, consultForm.insurer]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img src="/logo.png" alt="유어즈에셋 로고" className="brand-logo" />
          <div>
            <h1>유어즈에셋 설계사 포털</h1>
            <p>실무형 B형 포털 · 상담관리 · 비교실 · 리드관리 · 업무메모</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" onClick={() => window.location.reload()}>
            새로고침
          </button>
          <button className="pdf-btn" onClick={handlePdfDownload}>
            PDF 저장
          </button>
        </div>
      </header>

      <div className="tabbar">
        <button
          className={activeTab === "dashboard" ? "tab active" : "tab"}
          onClick={() => setActiveTab("dashboard")}
        >
          대시보드
        </button>
        <button
          className={activeTab === "consult" ? "tab active" : "tab"}
          onClick={() => setActiveTab("consult")}
        >
          상담입력
        </button>
        <button
          className={activeTab === "compare" ? "tab active" : "tab"}
          onClick={() => setActiveTab("compare")}
        >
          상품비교실
        </button>
        <button
          className={activeTab === "lead" ? "tab active" : "tab"}
          onClick={() => setActiveTab("lead")}
        >
          리드관리
        </button>
        <button
          className={activeTab === "work" ? "tab active" : "tab"}
          onClick={() => setActiveTab("work")}
        >
          업무메모
        </button>
      </div>

      <main ref={pdfRef} className="portal-wrap">
        {activeTab === "dashboard" && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">총 상담건수</div>
                <div className="stat-value">{dashboardStats.totalConsultations}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">오늘 상담건수</div>
                <div className="stat-value">{dashboardStats.todayConsultCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">전체 리드</div>
                <div className="stat-value">{dashboardStats.totalLeads}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">진행중 리드</div>
                <div className="stat-value">{dashboardStats.pendingLeads}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">업무메모</div>
                <div className="stat-value">{dashboardStats.totalTodos}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">완료 메모</div>
                <div className="stat-value">{dashboardStats.doneTodos}</div>
              </div>
            </section>

            <section className="grid-2">
              <div className="card">
                <h2>최근 상담</h2>
                <div className="list-wrap">
                  {consultations.length === 0 ? (
                    <div className="empty-text">저장된 상담 내역이 없습니다.</div>
                  ) : (
                    consultations.slice(0, 5).map((item) => (
                      <div className="list-item" key={item.id}>
                        <div>
                          <strong>{item.customerName}</strong>
                          <div className="sub-text">
                            {item.category} · {item.insurer || "원수사 미지정"} · {item.createdAt}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card">
                <h2>빠른 추천 상품</h2>
                <div className="list-wrap">
                  {quickRecommend.map((item) => (
                    <div className="list-item" key={item.id}>
                      <div>
                        <strong>{item.productName}</strong>
                        <div className="sub-text">
                          {item.insurer} · {item.category} · {item.paymentPeriod} / {item.coveragePeriod}
                        </div>
                        <div className="badge-row">
                          {item.strengths.map((tag) => (
                            <span className="mini-badge" key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "consult" && (
          <>
            <section className="card">
              <h2>상담 입력</h2>
              <div className="grid">
                <div className="field">
                  <label>고객명</label>
                  <input
                    name="customerName"
                    value={consultForm.customerName}
                    onChange={handleConsultChange}
                    placeholder="고객명 입력"
                  />
                </div>

                <div className="field">
                  <label>연락처</label>
                  <input
                    name="phone"
                    value={consultForm.phone}
                    onChange={handleConsultChange}
                    placeholder="010-0000-0000"
                  />
                </div>

                <div className="field">
                  <label>나이</label>
                  <input
                    name="age"
                    value={consultForm.age}
                    onChange={handleConsultChange}
                    placeholder="예: 43"
                  />
                </div>

                <div className="field">
                  <label>성별</label>
                  <select name="gender" value={consultForm.gender} onChange={handleConsultChange}>
                    <option value="여성">여성</option>
                    <option value="남성">남성</option>
                  </select>
                </div>

                <div className="field">
                  <label>직업</label>
                  <input
                    name="job"
                    value={consultForm.job}
                    onChange={handleConsultChange}
                    placeholder="예: 사무직"
                  />
                </div>

                <div className="field">
                  <label>원수사</label>
                  <select name="insurer" value={consultForm.insurer} onChange={handleConsultChange}>
                    <option value="">선택 안함</option>
                    {INSURERS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>상담 카테고리</label>
                  <select name="category" value={consultForm.category} onChange={handleConsultChange}>
                    {categories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>월 예산</label>
                  <input
                    name="budget"
                    value={consultForm.budget}
                    onChange={handleConsultChange}
                    placeholder="예: 10만원"
                  />
                </div>
              </div>

              <div className="field full">
                <label>고객 니즈</label>
                <textarea
                  name="needs"
                  value={consultForm.needs}
                  onChange={handleConsultChange}
                  rows={4}
                  placeholder="암/뇌/심장, 간병 대비, 운전자 특약 등"
                />
              </div>

              <div className="field full">
                <label>상담 메모</label>
                <textarea
                  name="consultationMemo"
                  value={consultForm.consultationMemo}
                  onChange={handleConsultChange}
                  rows={7}
                  placeholder="상담 내용, 비교 포인트, 다음 액션 입력"
                />
              </div>

              <div className="action-row">
                <button className="primary-btn" onClick={saveConsultation}>
                  상담 저장
                </button>
              </div>
            </section>

            <section className="card">
              <h2>저장된 상담 내역</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>고객명</th>
                      <th>카테고리</th>
                      <th>원수사</th>
                      <th>연락처</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-cell">저장된 상담이 없습니다.</td>
                      </tr>
                    ) : (
                      consultations.map((item) => (
                        <tr key={item.id}>
                          <td>{item.createdAt}</td>
                          <td>{item.customerName}</td>
                          <td>{item.category}</td>
                          <td>{item.insurer || "-"}</td>
                          <td>{item.phone || "-"}</td>
                          <td>
                            <button className="danger-btn" onClick={() => deleteConsultation(item.id)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === "compare" && (
          <>
            <section className="card">
              <h2>상품 비교실</h2>
              <div className="grid">
                <div className="field">
                  <label>원수사 필터</label>
                  <select
                    value={compareFilters.insurer}
                    onChange={(e) =>
                      setCompareFilters((prev) => ({ ...prev, insurer: e.target.value }))
                    }
                  >
                    <option value="">전체</option>
                    {INSURERS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>카테고리 필터</label>
                  <select
                    value={compareFilters.category}
                    onChange={(e) =>
                      setCompareFilters((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    <option value="">전체</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>키워드 검색</label>
                  <input
                    value={compareFilters.keyword}
                    onChange={(e) =>
                      setCompareFilters((prev) => ({ ...prev, keyword: e.target.value }))
                    }
                    placeholder="예: 암, 간병, 허혈성"
                  />
                </div>
              </div>
            </section>

            <section className="product-grid">
              {filteredProducts.length === 0 ? (
                <div className="card empty-text">조건에 맞는 상품이 없습니다.</div>
              ) : (
                filteredProducts.map((item) => (
                  <div className="card product-card" key={item.id}>
                    <div className="product-head">
                      <span className="product-insurer">{item.insurer}</span>
                      <span className="product-category">{item.category}</span>
                    </div>
                    <h3>{item.productName}</h3>
                    <div className="product-meta">가입연령: {item.ageRange}</div>
                    <div className="product-meta">납입: {item.paymentPeriod}</div>
                    <div className="product-meta">만기: {item.coveragePeriod}</div>
                    <div className="product-meta">보험료 수준: {item.premiumLevel}</div>
                    <div className="badge-row">
                      {item.strengths.map((tag) => (
                        <span className="mini-badge" key={tag}>{tag}</span>
                      ))}
                    </div>
                    <p className="product-memo">{item.memo}</p>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "lead" && (
          <>
            <section className="card">
              <h2>리드 입력</h2>
              <div className="grid">
                <div className="field">
                  <label>이름</label>
                  <input
                    name="name"
                    value={leadForm.name}
                    onChange={handleLeadChange}
                    placeholder="리드 이름"
                  />
                </div>

                <div className="field">
                  <label>유입채널</label>
                  <select name="channel" value={leadForm.channel} onChange={handleLeadChange}>
                    {leadChannels.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>상태</label>
                  <select name="status" value={leadForm.status} onChange={handleLeadChange}>
                    {leadStatuses.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>연락처</label>
                  <input
                    name="phone"
                    value={leadForm.phone}
                    onChange={handleLeadChange}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              <div className="field full">
                <label>메모</label>
                <textarea
                  name="note"
                  value={leadForm.note}
                  onChange={handleLeadChange}
                  rows={5}
                  placeholder="유입 배경, 상담 예정일, 관심상품 등"
                />
              </div>

              <div className="action-row">
                <button className="primary-btn" onClick={saveLead}>
                  리드 저장
                </button>
              </div>
            </section>

            <section className="card">
              <h2>리드 목록</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>등록일</th>
                      <th>이름</th>
                      <th>채널</th>
                      <th>상태</th>
                      <th>연락처</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-cell">저장된 리드가 없습니다.</td>
                      </tr>
                    ) : (
                      leads.map((item) => (
                        <tr key={item.id}>
                          <td>{item.createdAt}</td>
                          <td>{item.name}</td>
                          <td>{item.channel}</td>
                          <td>{item.status}</td>
                          <td>{item.phone || "-"}</td>
                          <td>
                            <button className="danger-btn" onClick={() => deleteLead(item.id)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === "work" && (
          <section className="grid-2">
            <div className="card">
              <h2>오늘 할 일</h2>
              <div className="inline-form">
                <input
                  value={todoText}
                  onChange={(e) => setTodoText(e.target.value)}
                  placeholder="예: 김OO 고객 재통화"
                />
                <button className="primary-btn" onClick={addTodo}>
                  추가
                </button>
              </div>

              <div className="todo-list">
                {todos.length === 0 ? (
                  <div className="empty-text">등록된 업무메모가 없습니다.</div>
                ) : (
                  todos.map((item) => (
                    <div className="todo-item" key={item.id}>
                      <label className={item.done ? "todo-text done" : "todo-text"}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleTodo(item.id)}
                        />
                        <span>{item.text}</span>
                      </label>
                      <button className="danger-btn" onClick={() => deleteTodo(item.id)}>
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <h2>실무 메모</h2>
              <div className="note-box">
                <p>• 오전 미팅 전 오늘 상담 예정 고객 확인</p>
                <p>• 리드 상태를 상담전 / 상담중 / 가입검토 / 청약완료로 구분</p>
                <p>• 원수사별 강점 담보를 비교실에서 빠르게 확인</p>
                <p>• 상담 후 바로 저장해서 누락 방지</p>
                <p>• 필요 시 PDF 저장 후 공유 또는 보관</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
