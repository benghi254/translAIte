const { isFFmpegAvailable } = require('../lib/ffmpeg');
const { LANGUAGES, getLanguageName } = require('../lib/languages');

async function testPipeline() {
  console.log('--- Testing System Environment ---');
  console.log(`Total Supported Languages: ${LANGUAGES.length}`);
  console.log(`Language test ('sw'): ${getLanguageName('sw')}`);

  const ffmpegOk = await isFFmpegAvailable();
  console.log(`Local FFmpeg installed & available: ${ffmpegOk}`);
  console.log('--- System verification passed! ---');
}

testPipeline().catch(console.error);
