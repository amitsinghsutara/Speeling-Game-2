/**
 * One-time / re-runnable data pipeline: converts the source spreadsheet
 * (data_source.xlsx) into the game's JSON content file
 * (src/data/content.generated.json).
 *
 * Run with: npm run gen:content
 *
 * This is the ONLY place that knows about the spreadsheet's column layout.
 * If the spreadsheet changes shape, only this file needs to change.
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.resolve(__dirname, '..', 'data_source.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'data', 'content.generated.json');

const WORD_LIST_SHEET = 'WordList';
const LEVEL_GUIDE_SHEET = 'LevelGuide';
const FOIL_CODEBOOK_SHEET = 'FoilCodebook';

function readSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Expected sheet "${sheetName}" not found in workbook.`);
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function isBlankRow(row) {
  return !row || row.every((cell) => cell === '' || cell === undefined || cell === null);
}

function buildLevels(workbook) {
  const rows = readSheetRows(workbook, LEVEL_GUIDE_SHEET);
  const levels = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const [level, skill, wordCount] = row;
    if (level === '' || skill === '') continue;
    levels.push({
      level: Number(level),
      skill: String(skill).trim(),
      wordCount: Number(wordCount) || 0,
    });
  }
  levels.sort((a, b) => a.level - b.level);
  return levels;
}

function buildFoilTypeLabels(workbook) {
  const rows = readSheetRows(workbook, FOIL_CODEBOOK_SHEET);
  const labels = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const [code, foilType] = row;
    if (code === '') continue;
    labels[String(code).trim()] = String(foilType).trim();
  }
  return labels;
}

function buildQuestions(workbook) {
  const rows = readSheetRows(workbook, WORD_LIST_SHEET);
  const questions = [];
  const skipped = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;

    const [
      level,
      item,
      seq,
      skill,
      target,
      foil1,
      type1,
      foil2,
      type2,
      foil3,
      type3,
    ] = row;

    const foils = [
      { word: foil1, type: type1 },
      { word: foil2, type: type2 },
      { word: foil3, type: type3 },
    ];

    const hasAllFields =
      level !== '' &&
      target !== '' &&
      foils.every((f) => f.word !== '' && f.type !== '');

    if (!hasAllFields) {
      skipped.push({ row: i + 1, reason: 'missing required field(s)' });
      continue;
    }

    questions.push({
      level: Number(level),
      item: Number(item),
      sequence: Number(seq),
      skill: String(skill).trim(),
      target: String(target).trim().toLowerCase(),
      foils: foils.map((f) => ({
        word: String(f.word).trim().toLowerCase(),
        type: String(f.type).trim(),
      })),
    });
  }

  if (skipped.length) {
    console.warn(`Skipped ${skipped.length} malformed row(s):`, skipped);
  }

  return questions;
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Source spreadsheet not found at ${SOURCE_PATH}`);
  }

  const workbook = XLSX.readFile(SOURCE_PATH);

  const levels = buildLevels(workbook);
  const foilTypeLabels = buildFoilTypeLabels(workbook);
  const questions = buildQuestions(workbook);

  const output = {
    levels,
    foilTypeLabels,
    questions,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${questions.length} questions across ${levels.length} levels to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main();
