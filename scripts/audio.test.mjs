import assert from 'node:assert/strict';
import test from 'node:test';
import {encodePcmWav} from '../lib/audio.ts';
test('encodes mono 16 kHz PCM with finite length and valid WAV headers',()=>{const samples=new Float32Array([0,1,-1,.5,-.5,2,-2]);const buffer=encodePcmWav(samples);const d=new DataView(buffer),str=(i,n)=>String.fromCharCode(...new Uint8Array(buffer,i,n));assert.equal(str(0,4),'RIFF');assert.equal(str(8,4),'WAVE');assert.equal(str(36,4),'data');assert.equal(d.getUint32(24,true),16000);assert.equal(d.getUint16(22,true),1);assert.equal(d.getUint16(34,true),16);assert.equal(d.getUint32(40,true),14);assert.equal(d.getUint32(4,true),50);assert.equal(d.getInt16(44,true),0);assert.equal(d.getInt16(46,true),32767);assert.equal(d.getInt16(48,true),-32768);assert.equal(d.getInt16(54,true),32767);assert.equal(d.getInt16(56,true),-32768);});
test('audio payload size represents exact duration',()=>{assert.equal(encodePcmWav(new Float32Array(16000*28)).byteLength,44+16000*28*2)});
