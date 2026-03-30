import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

async function loadFont(doc) {
  const res = await fetch("/fonts/NotoSansKR-Regular.ttf");
  const fontBuffer = await res.arrayBuffer();

  let binary = "";
  const bytes = new Uint8Array(fontBuffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  doc.addFileToVFS("NotoSansKR-Regular.ttf", binary);
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
  doc.setFont("NotoSansKR");
}

export async function exportCaseToPdf(item) {
  const doc = new jsPDF();
  await loadFont(doc);

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(18);
  doc.text("유어즈에셋 상담 리포트", 14, 18);

  doc.setFontSize(10);
  doc.text(`생성일시: ${new Date().toLocaleString("ko-KR")}`, 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [["항목", "내용"]],
    body: [
      ["고객명", item.customerName || "-"],
      ["연령", item.age || "-"],
      ["성별", item.gender || "-"],
      ["상담유형", item.consultType || "-"],
      ["보험사", item.company || "-"],
      ["상품명", item.product || "-"],
      ["월보험료", item.premium ? `${item.premium}원` : "-"],
      ["보장요약", item.coverage || "-"],
      ["상담메모", item.memo || "-"],
    ],
    styles: {
      font: "NotoSansKR",
      fontStyle: "normal",
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      font: "NotoSansKR",
      fontStyle: "normal",
      fillColor: [25, 54, 93],
    },
    bodyStyles: {
      font: "NotoSansKR",
      fontStyle: "normal",
    },
  });

  doc.save(`yoursasset_${item.customerName || "report"}.pdf`);
}
