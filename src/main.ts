import { shuffle } from '@in5net/limitless';
import Speaker from 'lfd-speaker';
import { createReadStream, ReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { argv, cwd, exit, stdin, stdout } from 'node:process';
import prism from 'prism-media';

const playlistPath = argv[2] || cwd();

const fileNames = await readdir(playlistPath).catch(() => [playlistPath]);
const shuffledFileNames = shuffle(fileNames);
let index = 0;

const SAMPLE_RATE = 44100;
const CHANNELS = 2;

const speaker = new Speaker({
  channels: CHANNELS,
  bitDepth: 16,
  sampleRate: SAMPLE_RATE
});

const filters = {
  nightcore: `asetrate=${SAMPLE_RATE}*1.2,aresample=${SAMPLE_RATE},bass=g=5`
} as const;
type Filter = keyof typeof filters;

let fileStream: ReadStream | undefined;
let ffmpegStream: prism.FFmpeg | undefined;

next();
function next() {
  const fileName = shuffledFileNames[index];
  if (!fileName) {
    console.log('No more files');
    exit(0);
  }
  const filePath = join(playlistPath, fileName);
  console.log(`${index + 1}. ${fileName}`);

  const filter: Filter = 'nightcore';

  const args = [
    '-analyzeduration',
    '0',
    '-loglevel',
    '0',
    '-ar',
    `${SAMPLE_RATE}`,
    '-ac',
    `${CHANNELS}`,
    '-f',
    's16le'
  ];
  if (filter) args.push('-af', filters[filter]);

  fileStream?.destroy();
  ffmpegStream?.destroy();
  fileStream = createReadStream(filePath);
  ffmpegStream = new prism.FFmpeg({
    args,
    shell: false
  });
  fileStream.pipe(ffmpegStream).pipe(speaker);

  index++;
}

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', (key: string) => {
  switch (key) {
    case '\u001B\u005B\u0041':
      // Up arrow
      break;
    case '\u001B\u005B\u0042':
      // Down arrow
      break;
    case '\u001B\u005B\u0043':
      // Right arrow
      next();
      break;
    case '\u001B\u005B\u0044':
      // Left arrow
      {
        const newIndex = Math.max(index - 2, 0);
        if (index === newIndex + 2) {
          index = newIndex;
          next();
        }
      }
      break;
    case '\u0003':
      // Ctrl+C
      exit(0);
      break;
    default:
      stdout.write(key);
  }
});
