import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function arrayBufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return binary;
}

async function registerKoreanFont(doc) {
  const response = await fetch("/fonts/NotoSansKR-Regular.ttf");

  if (!response.ok) {
    throw new Error("폰트 파일을 찾을 수 없습니다.");
  }

  const fontBuffer = await response.arrayBuffer();
  const fontBinary = arrayBufferToBinaryString(fontBuffer);

  doc.addFileToVFS("NotoSansKR-Regular.ttf", fontBinary);
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
  doc.setFont("NotoSansKR", "normal");
}

export async function exportCaseToPdf(item) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerKoreanFont(doc);

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(18);
  doc.text("유어즈에셋 상담 리포트", 14, 18);

  doc.setFontSize(10);
  doc.text(`생성일시: ${new Date().toLocaleString("ko-KR")}`, 14, 26);

  autoTable(doc, {
    startY: 34,
    theme: "grid",
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
      cellPadding: 3,
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      font: "NotoSansKR",
      fontStyle: "normal",
      fillColor: [25, 54, 93],
      textColor: 255,
    },
    bodyStyles: {
      font: "NotoSansKR",
      fontStyle: "normal",
      textColor: 20,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 145 },
    },
  });

  doc.save(`yoursasset_${item.customerName || "report"}.pdf`);
}
