import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassAttendanceData {
  className: string;
  subject?: string;
  totalStudents?: number;
  averageAttendance: number;
  presentClasses?: number;
  totalClasses?: number;
}

interface TrendDataPoint {
  date: string;
  percentage: number;
  present: number;
  total: number;
}

export const exportAttendanceToCSV = (
  data: ClassAttendanceData[],
  overallPercentage: number,
  fileName: string,
  type: 'teacher' | 'student'
) => {
  let csvContent = type === 'teacher' 
    ? 'Class Name,Subject,Total Students,Attendance Percentage\n'
    : 'Class Name,Subject,Classes Attended,Total Classes,Attendance Percentage\n';

  data.forEach(item => {
    if (type === 'teacher') {
      csvContent += `"${item.className}","${item.subject || 'N/A'}",${item.totalStudents || 0},${item.averageAttendance}%\n`;
    } else {
      csvContent += `"${item.className}","${item.subject || 'N/A'}",${item.presentClasses || 0},${item.totalClasses || 0},${item.averageAttendance}%\n`;
    }
  });

  csvContent += `\nOverall Attendance,,,${overallPercentage}%\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportAttendanceToPDF = (
  data: ClassAttendanceData[],
  overallPercentage: number,
  trendData: TrendDataPoint[],
  fileName: string,
  title: string,
  type: 'teacher' | 'student'
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  
  // Overall Attendance
  doc.setFontSize(14);
  doc.text(`Overall Attendance: ${overallPercentage}%`, 14, 35);
  
  // Class-wise data table
  const tableData = data.map(item => {
    if (type === 'teacher') {
      return [
        item.className,
        item.subject || 'N/A',
        (item.totalStudents || 0).toString(),
        `${item.averageAttendance}%`
      ];
    } else {
      return [
        item.className,
        item.subject || 'N/A',
        `${item.presentClasses}/${item.totalClasses}`,
        `${item.averageAttendance}%`
      ];
    }
  });

  const headers = type === 'teacher'
    ? ['Class Name', 'Subject', 'Total Students', 'Attendance %']
    : ['Class Name', 'Subject', 'Classes', 'Attendance %'];

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Trend data if available
  if (trendData.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text('Attendance Trend (Last 30 Days)', 14, finalY + 15);

    const trendTableData = trendData.map(item => [
      item.date,
      `${item.present}/${item.total}`,
      `${item.percentage}%`
    ]);

    autoTable(doc, {
      head: [['Date', 'Present/Total', 'Percentage']],
      body: trendTableData,
      startY: finalY + 20,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${fileName}.pdf`);
};

export const exportIndividualStudentToPDF = (
  studentName: string,
  data: ClassAttendanceData[],
  overallPercentage: number,
  trendData: TrendDataPoint[],
  fileName: string
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text(`Attendance Report: ${studentName}`, 14, 22);
  
  // Overall Attendance
  doc.setFontSize(14);
  doc.text(`Overall Attendance: ${overallPercentage}%`, 14, 35);
  
  // Subject-wise data table
  const tableData = data.map(item => [
    item.className,
    item.subject || 'N/A',
    `${item.presentClasses}/${item.totalClasses}`,
    `${item.averageAttendance}%`
  ]);

  autoTable(doc, {
    head: [['Class Name', 'Subject', 'Classes', 'Attendance %']],
    body: tableData,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Trend data if available
  if (trendData.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text('Attendance Trend (Last 30 Days)', 14, finalY + 15);

    const trendTableData = trendData.map(item => [
      item.date,
      `${item.present}/${item.total}`,
      `${item.percentage}%`
    ]);

    autoTable(doc, {
      head: [['Date', 'Present/Total', 'Percentage']],
      body: trendTableData,
      startY: finalY + 20,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${fileName}.pdf`);
};
