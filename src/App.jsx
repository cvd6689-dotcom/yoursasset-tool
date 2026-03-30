import { useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");

  const handleSave = () => {
    const data = {
      name,
      memo,
      savedAt: new Date().toLocaleString(),
    };

    localStorage.setItem("yoursasset_test_data", JSON.stringify(data));
    alert("브라우저 저장 완료");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem("yoursasset_test_data");
    if (!saved) {
      alert("저장된 데이터 없음");
      return;
    }

    const parsed = JSON.parse(saved);
    setName(parsed.name || "");
    setMemo(parsed.memo || "");
    alert("불러오기 완료");
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>유어즈에셋 설계사 포털</h1>
        <p className="sub">기본 연결 테스트 화면</p>

        <div className="form-group">
          <label>이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 입력"
          />
        </div>

        <div className="form-group">
          <label>메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 입력"
          />
        </div>

        <div className="btn-row">
          <button onClick={handleSave}>localStorage 저장</button>
          <button onClick={handleLoad}>불러오기</button>
        </div>
      </div>
    </div>
  );
}

export default App;
