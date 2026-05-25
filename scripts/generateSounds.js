// scripts/generateSounds.js
// Run once to generate audio files: node scripts/generateSounds.js

const fs = require('fs');
const path = require('path');

// Create sounds directory
const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

/**
 * Generate a WAV buffer from an array of frequencies and durations.
 * Each (freq, duration) pair produces one tone segment stitched together.
 */
function generateWAV(frequencies, durations, sampleRate = 44100) {
    const totalSamples = durations.reduce(
        (sum, d) => sum + Math.floor(sampleRate * d),
        0
    );
    const buffer = Buffer.alloc(44 + totalSamples * 2); // 44-byte header + 16-bit PCM

    // ── WAV Header ──
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + totalSamples * 2, 4);  // chunk size
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);           // PCM sub-chunk size
    buffer.writeUInt16LE(1, 20);            // Audio format: PCM
    buffer.writeUInt16LE(1, 22);            // Channels: Mono
    buffer.writeUInt32LE(sampleRate, 24);   // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);            // Block align
    buffer.writeUInt16LE(16, 34);           // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(totalSamples * 2, 40);

    let offset = 44;

    frequencies.forEach((freq, index) => {
        const duration = durations[index];
        const samples = Math.floor(sampleRate * duration);

        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            // Smooth attack (first 5 ms) + linear decay over full duration
            const attack = Math.min(1, t * 200);
            const decay = Math.max(0, 1 - i / samples);
            const envelope = attack * decay;
            const value = Math.sin(2 * Math.PI * freq * t) * envelope * 0.35;
            const sample = Math.max(-32768, Math.min(32767, Math.floor(value * 32767)));
            buffer.writeInt16LE(sample, offset);
            offset += 2;
        }
    });

    return buffer;
}

// ── Success sound: pleasant ascending triad (A5 → C#6 → E6) ──
const successWAV = generateWAV([880, 1100, 1320], [0.08, 0.08, 0.15]);
fs.writeFileSync(path.join(soundsDir, 'scan-success.wav'), successWAV);
console.log('✅ scan-success.wav generated');

// ── Error sound: low descending buzz ──
const errorWAV = generateWAV([300, 200, 150], [0.1, 0.1, 0.2]);
fs.writeFileSync(path.join(soundsDir, 'scan-error.wav'), errorWAV);
console.log('✅ scan-error.wav generated');

// ── Quick success: very short single beep for rapid scans ──
const quickSuccessWAV = generateWAV([1200], [0.05]);
fs.writeFileSync(path.join(soundsDir, 'scan-success-quick.wav'), quickSuccessWAV);
console.log('✅ scan-success-quick.wav generated');

console.log('\n🎵 All sound files written to public/sounds/');
