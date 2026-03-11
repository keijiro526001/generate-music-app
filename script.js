const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let kickBuffer, snareBuffer, hihatBuffer;
let step = 0;
let intervalId = null;
let stepElements = [];
let isPlaying = false;
let steps = 64;
let melodyPattern = [];

const rootNotes = [
    { name: "C", val: 60 }, { name: "C#", val: 61 }, { name: "D", val: 62 },
    { name: "D#", val: 63 }, { name: "E", val: 64 }, { name: "F", val: 65 },
    { name: "F#", val: 66 }, { name: "G", val: 67 }, { name: "G#", val: 68 },
    { name: "A", val: 69 }, { name: "A#", val: 70 }, { name: "B", val: 71 }
];

const chordTemplates = {
    "I": [0, 4, 7], "ii": [2, 5, 9], "iii": [4, 7, 11], "IV": [5, 9, 0],
    "V": [7, 11, 2], "vi": [9, 0, 4], "vii°": [11, 2, 5]
};

const chordProgressions = [
    ["I", "V", "vi", "IV"], ["IV", "V", "iii", "vi"], ["vi", "IV", "I", "V"], ["I", "IV", "V", "I"]
];

let currentPianoNotes = [];
let currentPianoLabels = [];
const instruments = ["kick", "snare", "hihat"];
let pattern = { kick: [], snare: [], hihat: [] };

function updateStepSize() {
    steps = parseInt(document.getElementById("stepSelect").value);
    melodyPattern = new Array(steps).fill(null);
    instruments.forEach(inst => pattern[inst] = new Array(steps).fill(false));
    buildSequencerUI();
    createPianoRoll();
    if(isPlaying) startBeat(true);
}

function buildSequencerUI() {
    const sequencer = document.getElementById("sequencer");
    sequencer.innerHTML = "";
    instruments.forEach(inst => {
        const row = document.createElement("div"); row.className = "row";
        const label = document.createElement("div"); label.className = "inst-label"; label.innerText = inst;
        row.appendChild(label);
        stepElements[inst] = [];
        for (let i = 0; i < steps; i++) {
            const stepDiv = document.createElement("div"); stepDiv.className = "step";
            stepDiv.onclick = () => { pattern[inst][i] = !pattern[inst][i]; stepDiv.classList.toggle("active", pattern[inst][i]); };
            stepElements[inst].push(stepDiv);
            row.appendChild(stepDiv);
        }
        sequencer.appendChild(row);
    });
}

function generateAIMelody() {
    const root = rootNotes[Math.floor(Math.random() * rootNotes.length)];
    const progression = chordProgressions[Math.floor(Math.random() * chordProgressions.length)];
    document.getElementById("keyDisplay").innerText = `Key: ${root.name} Major`;
    document.getElementById("chordDisplay").innerText = `Chords: ${progression.join(" - ")}`;

    const majorScale = [0, 2, 4, 5, 7, 9, 11, 12];
    currentPianoNotes = majorScale.map(s => root.val + s).reverse();
    currentPianoLabels = currentPianoNotes.map(n => {
        const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
        return names[n % 12] + Math.floor(n / 12);
    });

    createPianoRoll();
    melodyPattern.fill(null);

    const bars = steps / 16;
    for (let bar = 0; bar < bars; bar++) {
        const chordKey = progression[bar % progression.length];
        const chordTones = chordTemplates[chordKey].map(t => root.val + t);
        const startStep = bar * 16;
        const endStep = startStep + 16;

        for (let i = startStep; i < endStep; ) {
            if (Math.random() < 0.2) { i++; continue; }
            let duration = Math.random() > 0.7 ? 4 : 2;
            const note = chordTones[Math.floor(Math.random() * chordTones.length)];
            for (let d = 0; d < duration && (i + d) < endStep; d++) { melodyPattern[i + d] = note; }
            i += duration;
        }
    }
    updatePianoRoll();
}

function generateAIDrum() {
    for (let i = 0; i < steps; i++) {
        const pos = i % 16;
        pattern.kick[i] = (pos === 0 || pos === 8 || (pos === 10 && Math.random() < 0.3));
        pattern.snare[i] = (pos === 4 || pos === 12);
        pattern.hihat[i] = (i % 2 === 0 || Math.random() < 0.3);
    }
    updateDrumUI();
}

function createPianoRoll() {
    const pr = document.getElementById("pianoRoll"); pr.innerHTML = "";
    if (currentPianoNotes.length === 0) {
        currentPianoNotes = [72, 71, 69, 67, 65, 64, 62, 60];
        currentPianoLabels = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];
    }
    for (let r = 0; r < currentPianoNotes.length; r++) {
        const row = document.createElement("div"); row.className = "noteRow";
        const label = document.createElement("div"); label.className = "noteLabel"; label.innerText = currentPianoLabels[r];
        row.appendChild(label);
        for (let s = 0; s < steps; s++) {
            const cell = document.createElement("div"); cell.className = "noteCell";
            cell.onclick = () => {
                melodyPattern[s] = (melodyPattern[s] === currentPianoNotes[r]) ? null : currentPianoNotes[r];
                updatePianoRoll();
            };
            row.appendChild(cell);
        }
        pr.appendChild(row);
    }
}

function updatePianoRoll() {
    const rows = document.querySelectorAll(".noteRow");
    rows.forEach((row, r) => {
        const cells = row.querySelectorAll(".noteCell");
        cells.forEach((cell, s) => cell.classList.toggle("noteActive", melodyPattern[s] === currentPianoNotes[r]));
    });
}

function updateDrumUI() {
    instruments.forEach(inst => {
        if (stepElements[inst]) {
            stepElements[inst].forEach((el, i) => el.classList.toggle("active", pattern[inst][i]));
        }
    });
}

async function loadSample(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch(e) { console.error("Sound load error", url); return null; }
}

async function loadSounds() {
    if (!kickBuffer) kickBuffer = await loadSample("sounds/kick.wav");
    if (!snareBuffer) snareBuffer = await loadSample("sounds/snare.wav");
    if (!hihatBuffer) hihatBuffer = await loadSample("sounds/hihat.wav");
}

function playSound(buffer) {
    if (!buffer) return;
    const s = audioContext.createBufferSource(); s.buffer = buffer; s.connect(audioContext.destination); s.start();
}

function playMelody(note, durSteps) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const bpm = document.getElementById("bpm").value;
    const time = (60 / bpm) / 4 * durSteps;
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + time);
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + time);
}

function playStep(curr) {
    if (pattern.kick[curr]) playSound(kickBuffer);
    if (pattern.snare[curr]) playSound(snareBuffer);
    if (pattern.hihat[curr]) playSound(hihatBuffer);
    if (melodyPattern[curr] && melodyPattern[curr] !== melodyPattern[(curr-1+steps)%steps]) {
        playMelody(melodyPattern[curr], 2);
    }
    instruments.forEach(inst => {
        stepElements[inst].forEach(el => el.classList.remove("playing"));
        if(stepElements[inst][curr]) stepElements[inst][curr].classList.add("playing");
    });
    const noteRows = document.querySelectorAll(".noteRow");
    noteRows.forEach(row => {
        const cells = row.querySelectorAll(".noteCell");
        cells.forEach(c => c.classList.remove("notePlaying"));
        if (cells[curr]) cells[curr].classList.add("notePlaying");
    });
}

function startBeat(keepPosition = false) {
    if (intervalId) clearInterval(intervalId);
    isPlaying = true;
    if (!keepPosition) step = 0;
    const bpmValue = Math.max(40, Math.min(240, document.getElementById("bpm").value));
    const interval = (60 / bpmValue) * 1000 / 4;
    intervalId = setInterval(() => { playStep(step); step = (step + 1) % steps; }, interval);
}

function stopBeat() { clearInterval(intervalId); intervalId = null; isPlaying = false; step = 0; document.querySelectorAll(".playing, .notePlaying").forEach(el => el.classList.remove("playing", "notePlaying")); }

// --- MIDI Export -------------------------------------------------------------

function exportToMidi() {
    const bpm = parseInt(document.getElementById("bpm").value);
    const midiData = [];

    // Header Chunk
    midiData.push(...[0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xE0]);

    // Track Chunk
    const trackEvents = [];

    // Tempo Setting (500000 = 120BPM)
    const microSecondsPerBeat = Math.round(60000000 / bpm);
    trackEvents.push(0x00, 0xFF, 0x51, 0x03, (microSecondsPerBeat >> 16) & 0xFF, (microSecondsPerBeat >> 8) & 0xFF, microSecondsPerBeat & 0xFF);

    let lastTime = 0;
    const ticksPerStep = 120; // 16分音符 1つ分

    for (let i = 0; i < steps; i++) {
        const currentTime = i * ticksPerStep;

        // ドラム (Channel 10)
        const drumNotes = { kick: 36, snare: 38, hihat: 42 };
        instruments.forEach(inst => {
            if (pattern[inst][i]) {
                const delta = currentTime - lastTime;
                trackEvents.push(...encodeVLQ(delta), 0x99, drumNotes[inst], 0x64); // Note On
                trackEvents.push(0x00, 0x89, drumNotes[inst], 0x00); // Note Off (immediately)
                lastTime = currentTime;
            }
        });

        // メロディ (Channel 1)
        const note = melodyPattern[i];
        const prevNote = i > 0 ? melodyPattern[i-1] : null;
        if (note !== null && note !== prevNote) {
            const delta = currentTime - lastTime;
            trackEvents.push(...encodeVLQ(delta), 0x90, note, 0x64); // Note On
            // 次の音が変わるか休符になるまで鳴らす簡易的なOff
            trackEvents.push(ticksPerStep, 0x80, note, 0x00);
            lastTime = currentTime + ticksPerStep;
        }
    }

    // End of Track
    trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

    const trackLen = trackEvents.length;
    midiData.push(0x4D, 0x54, 0x72, 0x6B, (trackLen >> 24) & 0xFF, (trackLen >> 16) & 0xFF, (trackLen >> 8) & 0xFF, trackLen & 0xFF);
    midiData.push(...trackEvents);

    const blob = new Blob([new Uint8Array(midiData)], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "composer_output.mid";
    a.click();
}

function encodeVLQ(v) {
    let res = [v & 0x7F];
    while (v >>= 7) res.push((v & 0x7F) | 0x80);
    return res.reverse();
}

// -----------------------------------------------------------------------------

// イベント設定
document.getElementById("stepSelect").onchange = updateStepSize;
document.getElementById("bpm").onchange = () => { if (isPlaying) startBeat(true); };
document.getElementById("play").onclick = async () => { if (isPlaying) return; await loadSounds(); await audioContext.resume(); startBeat(); };
document.getElementById("stop").onclick = stopBeat;
document.getElementById("generateMelody").onclick = generateAIMelody;
document.getElementById("generateDrum").onclick = generateAIDrum;
document.getElementById("exportMidi").onclick = exportToMidi;

// 初期化
updateStepSize();