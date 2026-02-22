// CHAPTER CONFIG
// To add a new chapter:
// 1. Change CHAPTER_ID to 'ch2' (or ch3 etc)
// 2. Point LEVEL_DATA to the new chapter's
//    level array in LevelData.js
// 3. All localStorage keys will automatically
//    use the new chapter prefix
// 4. Chapter 1 data is completely untouched
const CHAPTER_ID = 'ch1';

const LS = {
  level:        () => `stilllife_${CHAPTER_ID}_current_level`,
  firstAttempts:() => `stilllife_${CHAPTER_ID}_first_attempts`,
  wrongTotal:   () => `stilllife_${CHAPTER_ID}_wrong_total`,
  hintsFocus:   () => `stilllife_${CHAPTER_ID}_hints_focus`,
  hintsClue:    () => `stilllife_${CHAPTER_ID}_hints_clue`,
  hintsReveal:  () => `stilllife_${CHAPTER_ID}_hints_reveal`,
  completed:    () => `stilllife_${CHAPTER_ID}_completed`,
  rating:       () => `stilllife_${CHAPTER_ID}_rating`,
  certDate:     () => `stilllife_${CHAPTER_ID}_certificate_date`,
  bestFirst:    () => `stilllife_${CHAPTER_ID}_best_first_attempts`,
  prologue:     'stilllife_prologue_seen',
  muted:        'stilllife_muted',
};
