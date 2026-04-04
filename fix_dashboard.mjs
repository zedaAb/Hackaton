import { readFileSync, writeFileSync } from 'fs';

const path = 'frontend/src/pages/StudentDashboard.jsx';
let content = readFileSync(path, 'utf8');

// Replace the entire corrupted line with the correct JSX
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('feedback.analysis.marks_awarded') && lines[i].includes('\\&\\&')) {
    lines[i] = "                        {feedback.analysis.marks_awarded != null && feedback.analysis.max_marks\r";
    lines.splice(i + 1, 0, "                          ? feedback.analysis.marks_awarded + ' / ' + feedback.analysis.max_marks + ' (' + Math.round((feedback.analysis.marks_awarded / feedback.analysis.max_marks) * 100) + '%)'\r");
    lines.splice(i + 2, 0, "                          : feedback.analysis.overall_grade + '%'}\r");
    break;
  }
}

writeFileSync(path, lines.join('\n'));
console.log('Fixed StudentDashboard.jsx successfully');
