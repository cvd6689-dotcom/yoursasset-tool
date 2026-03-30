import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportCaseToPdf(item) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Yours Asset Portal Report", 14, 18);

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
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [25, 54, 93],
    },
  });

  doc.save(`yoursasset_${item.customerName || "report"}.pdf`);
}
