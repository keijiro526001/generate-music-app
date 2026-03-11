const audioContext = new AudioContext();

// ディレイ（残響）の設定
const delay = audioContext.createDelay();
delay.delayTime.value = 0.3;
const feedback = audioContext.createGain();
feedback.gain.value = 0.3;
const delayFilter = audioContext.createBiquadFilter();
delayFilter.frequency.value = 1000;

delay.connect(feedback);
feedback.connect(delayFilter);
delayFilter.connect(delay);
delay.connect(audioContext.destination);

let kickBuffer, snareBuffer, hihatBuffer;
let step = 0;
let intervalId;
let stepElements = [];
let isPlaying = false;
const steps = 16;
let melodyPattern = new Array(steps).fill(null);

const scale = [0, 2, 4, 5, 7, 9, 11]; // メジャースケール
const melodicMarkovTable = {
  0: [0, 1, 1, 2, 4], 1: [0, 0, 2, 2], 2: [0, 1, 3, 4],
  3: [2, 2, 4, 4], 4: [0, 0, 5, 6], 5: [4, 4, 6], 6: [0, 0, 0, 5]
};

const pianoNotes = [72, 71, 69, 67, 65, 64, 62, 60];
const pianoLabels = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];
const instruments = ["kick", "snare", "hihat"];
const pattern = {
  kick: new Array(steps).fill(false),
  snare: new Array(steps).fill(false),
  hihat: new Array(steps).fill(false)
};

const sequencer = document.getElementById("sequencer");

async function loadSample(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

async function loadSounds() {
  if (!kickBuffer) kickBuffer = await loadSample("sounds/kick.wav");
  if (!snareBuffer) snareBuffer = await loadSample("sounds/snare.wav");
  if (!hihatBuffer) hihatBuffer = await loadSample("sounds/hihat.wav");
}

function playSound(buffer) {
  if (!buffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}

// 1. ディレイ設定を完全に削除または無効化
// (スクリプト上部の delay, feedback, delayFilter 関連のコードは消してもOKです)

// 2. 修正版 playMelody (ディレイなし・シンプル設定)
function playMelody(note, durationSteps = 1) {
  if (typeof note !== "number") return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  const freq = 440 * Math.pow(2, (note - 69) / 12);
  const bpm = document.getElementById("bpm").value;
  const stepTime = (60 / bpm) / 2;
  const durationTime = stepTime * durationSteps;
  const now = audioContext.currentTime;

  // 音色：三角波（サイン波より少しはっきりし、耳に優しい音）
  osc.type = "triangle";
  osc.frequency.value = freq;

  // フィルター：高音を少しカットして落ち着いた音にする
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2500, now);
  filter.frequency.exponentialRampToValueAtTime(1200, now + durationTime);

  // エンベロープ：音の出だしと終わりを滑らかにする
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.01); // アタック
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationTime + 0.05); // リリース

  // 接続：スピーカー(destination)のみに接続
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  // 再生
  osc.start(now);
  osc.stop(now + durationTime + 0.1);
}

function generateAIMelody() {
  const baseNote = parseInt(document.getElementById("key")?.value) || 60;
  let currentIndex = 0;
  melodyPattern.fill(null);

  for (let i = 0; i < steps; ) {
    if (Math.random() < 0.2) {
      melodyPattern[i] = null;
      i++;
      continue;
    }
    const rand = Math.random();
    let duration = rand > 0.8 ? 3 : (rand > 0.5 ? 2 : 1);
    const candidates = melodicMarkovTable[currentIndex];
    currentIndex = candidates[Math.floor(Math.random() * candidates.length)];
    const note = baseNote + scale[currentIndex];
    for (let d = 0; d < duration && (i + d) < steps; d++) {
      melodyPattern[i + d] = note;
    }
    i += duration;
  }
  updatePianoRoll();
}

function createPianoRoll() {
  const pianoRoll = document.getElementById("pianoRoll");
  pianoRoll.innerHTML = "";
  for (let r = 0; r < pianoNotes.length; r++) {
    const row = document.createElement("div");
    row.className = "noteRow";
    const label = document.createElement("div");
    label.className = "noteLabel";
    label.innerText = pianoLabels[r];
    row.appendChild(label);
    for (let s = 0; s < steps; s++) {
      const cell = document.createElement("div");
      cell.className = "noteCell";
      if (melodyPattern[s] === pianoNotes[r]) cell.classList.add("noteActive");
      cell.onclick = () => {
        melodyPattern[s] = (melodyPattern[s] === pianoNotes[r]) ? null : pianoNotes[r];
        updatePianoRoll();
      };
      row.appendChild(cell);
    }
    pianoRoll.appendChild(row);
  }
}

function updatePianoRoll() {
  const rows = document.querySelectorAll(".noteRow");
  rows.forEach((row, r) => {
    const cells = row.querySelectorAll(".noteCell");
    cells.forEach((cell, s) => {
      cell.classList.toggle("noteActive", melodyPattern[s] === pianoNotes[r]);
    });
  });
}

function playStep(currentStep) {
  instruments.forEach(inst => {
    if (pattern[inst][currentStep]) {
      if (inst === "kick") playSound(kickBuffer);
      if (inst === "snare") playSound(snareBuffer);
      if (inst === "hihat") playSound(hihatBuffer);
    }
  });

  const note = melodyPattern[currentStep];
  const prevNote = melodyPattern[(currentStep - 1 + steps) % steps];

  if (note !== null && note !== prevNote) {
    let durationSteps = 1;
    for (let i = 1; i < 4; i++) {
      if (melodyPattern[(currentStep + i) % steps] === note) durationSteps++;
      else break;
    }
    playMelody(note, durationSteps);
  }

  instruments.forEach(inst => {
    stepElements[inst].forEach(el => el.classList.remove("playing"));
    stepElements[inst][currentStep].classList.add("playing");
  });

  const allRows = document.querySelectorAll(".noteRow");
  allRows.forEach(row => {
    const cells = row.querySelectorAll(".noteCell");
    cells.forEach(c => c.classList.remove("notePlaying"));
    if (cells[currentStep]) cells[currentStep].classList.add("notePlaying");
  });
}

function startBeat() {
  isPlaying = true;
  step = 0;
  const bpm = document.getElementById("bpm").value;
  const interval = (60 / bpm) * 1000 / 2;
  intervalId = setInterval(() => {
    playStep(step);
    step = (step + 1) % steps;
  }, interval);
}

function stopBeat() {
  if (intervalId) clearInterval(intervalId);
  isPlaying = false;
}

document.getElementById("play").onclick = async () => {
  if (isPlaying) stopBeat();
  await loadSounds();
  await audioContext.resume();
  startBeat();
};
document.getElementById("stop").onclick = stopBeat;
document.getElementById("generateMelody").onclick = generateAIMelody;

instruments.forEach(inst => {
  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("span");
  label.innerText = inst + " ";
  row.appendChild(label);
  stepElements[inst] = [];
  for (let i = 0; i < steps; i++) {
    const stepDiv = document.createElement("div");
    stepDiv.className = "step";
    stepDiv.onclick = () => {
      pattern[inst][i] = !pattern[inst][i];
      stepDiv.classList.toggle("active", pattern[inst][i]);
    };
    stepElements[inst].push(stepDiv);
    row.appendChild(stepDiv);
  }
  sequencer.appendChild(row);
});
createPianoRoll();