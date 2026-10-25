export function encodePcmWav(samples:Float32Array,sampleRate=16000):ArrayBuffer {
 const bytes=new ArrayBuffer(44+samples.length*2), view=new DataView(bytes);
 const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,Math.round(s<0?s*32768:s*32767),true);}
 return bytes;
}
export async function normalizeRecording(blob:Blob):Promise<Blob>{
 if(!blob.size)throw new Error('The microphone returned an empty recording. Try again, or upload an audio file.');
 const OfflineContext=window.OfflineAudioContext||(window as any).webkitOfflineAudioContext;
 if(!OfflineContext)throw new Error('Audio conversion is unavailable in this browser. Open the link in Chrome, Edge or Safari.');
 let decoded:AudioBuffer;
 try{const context=new OfflineContext(1,1,16000);decoded=await context.decodeAudioData(await blob.arrayBuffer());}catch{throw new Error('This browser could not decode its recording. Try Chrome or Edge, or upload a WAV audio file.');}
 if(decoded.duration<0.35)throw new Error('The recording was too short. Speak for at least a second, then tap stop.');
 if(decoded.duration>29)throw new Error('Keep recordings under 28 seconds. Please record a shorter message.');
 const samples=new Float32Array(decoded.length);
 for(let channel=0;channel<decoded.numberOfChannels;channel++){const values=decoded.getChannelData(channel);for(let i=0;i<samples.length;i++)samples[i]+=values[i]/decoded.numberOfChannels;}
 let energy=0;for(let i=0;i<samples.length;i++)energy+=samples[i]*samples[i];
 if(Math.sqrt(energy/samples.length)<0.0005)throw new Error('The recording is silent. Check your selected microphone and speak closer to it.');
 return new Blob([encodePcmWav(samples,decoded.sampleRate)],{type:'audio/wav'});
}
