import { shuffle } from '@in5net/limitless';
import Speaker from 'lfd-speaker';
import { createReadStream, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { argv, cwd, exit, stdin, stdout } from 'node:process';
import prism from 'prism-media';

const playlistPath = argv[2] || cwd();

const fileNames = await readdirSync(playlistPath);
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
  nightcore: `asetrate=${SAMPLE_RATE}*1.2`
} as const;
type Filter = keyof typeof filters;

next();
function next() {
  const fileName = shuffledFileNames[index++];
  if (!fileName) {
    console.log('No more files');
    exit(0);
  }
  const filePath = join(playlistPath, fileName);
  console.log(`Playing ${fileName}`);

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
  createReadStream(filePath)
    .once('close', next)
    .pipe(
      new prism.FFmpeg({
        args,
        shell: false
      })
    )
    .pipe(speaker);
}

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', (key: string) => {
  if (key === '\u0003') exit();
  stdout.write(key);
});
