/**
 * Generates one MP3 per unique target word using Microsoft Edge's free
 * neural "Read Aloud" voices (via the msedge-tts package), so the game can
 * play bundled audio instead of relying on the browser's Web Speech API
 * (which Android's embedded WebView often can't actually speak through,
 * even when `window.speechSynthesis` appears to exist).
 *
 * No account or API key needed: this talks to the same free backend that
 * powers Edge's "Read Aloud" feature rather than a paid cloud TTS API. It's
 * an unofficial use of that service, so treat voice choice and availability
 * as subject to change without notice.
 *
 * Run with:
 *   npm run gen:audio
 *
 * Re-runnable: words that already have an MP3 in the output directory are
 * skipped, so adding new words to the spreadsheet and re-running only
 * generates audio for the new ones. Pass --force to regenerate everything.
 */
const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const CONTENT_PATH = path.resolve(__dirname, '..', 'src', 'data', 'content.generated.json');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'audio', 'words');

// A clear, instructional voice; easy to understand for early readers.
const VOICE_NAME = 'en-US-JennyNeural';
const SPEAKING_RATE = '-10%';

function getUniqueTargetWords() {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const words = new Set((content.questions ?? []).map((q) => String(q.target).trim().toLowerCase()));
  return [...words].sort();
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('close', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function main() {
  const force = process.argv.includes('--force');
  const words = getUniqueTargetWords();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  let generated = 0;
  let skipped = 0;

  for (const word of words) {
    const outputPath = path.join(OUTPUT_DIR, `${word}.mp3`);
    if (!force && fs.existsSync(outputPath)) {
      skipped++;
      continue;
    }

    try {
      const { audioStream } = tts.toStream(word, { rate: SPEAKING_RATE });
      const audio = await streamToBuffer(audioStream);
      fs.writeFileSync(outputPath, audio);
      generated++;
      console.log(`Generated ${word}.mp3`);
    } catch (err) {
      console.error(`Failed "${word}": ${err.message}`);
    }
  }

  tts.close();
  console.log(`\nDone. Generated ${generated}, skipped ${skipped} (already existed), ${words.length} total words.`);
}

main();
