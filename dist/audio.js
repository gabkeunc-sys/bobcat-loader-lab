// Original procedural music and effects. No network audio or third-party recordings.
export class LoaderAudio {
  constructor(){
    this.ctx=null;this.enabled=true;this.operation=0;this.step=0;this.nextBeat=0;this.previous={lift:0,tilt:0,load:0,cycles:0};this.reverseAt=0;
    this.musicVolume=.22;this.effectsVolume=.5;
    try{const v=JSON.parse(localStorage.getItem('loader-audio-volumes')||'{}');if(Number.isFinite(v.music))this.musicVolume=Math.max(0,Math.min(1,v.music));if(Number.isFinite(v.effects))this.effectsVolume=Math.max(0,Math.min(1,v.effects));}catch{}
    this.button=document.getElementById('audioToggle');
    for(const [id,key,out]of[['musicVolume','musicVolume','musicValue'],['effectsVolume','effectsVolume','effectsValue']]){
      const slider=document.getElementById(id);slider.value=Math.round(this[key]*100);document.getElementById(out).textContent=slider.value+'%';
      slider.addEventListener('input',()=>{this[key]=+slider.value/100;document.getElementById(out).textContent=slider.value+'%';this.applyVolumes();try{localStorage.setItem('loader-audio-volumes',JSON.stringify({music:this.musicVolume,effects:this.effectsVolume}));}catch{}});
    }
    this.button.addEventListener('click',()=>this.toggle());document.getElementById('headerAudioToggle')?.addEventListener('click',()=>this.toggle());
    const unlock=event=>{if(event.target.closest?.('#audioToggle,#headerAudioToggle'))return;if(this.enabled&&(!this.ctx||this.ctx.state!=='running'))this.start(++this.operation,true);};
    document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
    this.paint();this.start(++this.operation,true);
    document.addEventListener('visibilitychange',()=>{
      if(!this.ctx)return;
      if(document.hidden){this.setMaster(false);this.paint();}
      else if(this.enabled){const operation=++this.operation;this.start(operation);}
    });
  }
  async toggle(){
    const operation=++this.operation;
    this.enabled=!this.enabled;
    this.paint();
    if(!this.enabled){this.setMaster(false);return;}
    await this.start(operation);
  }
  setMaster(audible){
    if(!this.ctx||!this.master)return;
    const t=this.ctx.currentTime;this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(audible?.65:0,t,.015);
  }
  async start(operation,automatic=false){
    let timeout;
    try{
      if(!this.ctx)this.create();
      this.setMaster(false);
      if(this.ctx.state!=='running')await Promise.race([
        this.ctx.resume(),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('resume timeout')),3000);})
      ]);
      if(operation!==this.operation||!this.enabled)return;
      if(this.ctx.state!=='running')throw Error('audio not running');
      if(document.hidden){this.paint();return;}
      this.setMaster(true);this.nextBeat=this.ctx.currentTime+.09;this.paint();
      this.note(165,.12,.16,this.effectsBus,'triangle');this.note(220,.2,.12,this.effectsBus,'triangle',.12);
    }catch{
      if(operation!==this.operation)return;
      this.setMaster(false);if(automatic){this.paint('자동재생 대기 중 · 화면을 터치하거나 조작하면 소리가 시작됩니다.');}else{this.enabled=false;this.paint('소리를 시작하지 못했습니다. 소리 재생을 다시 눌러 주세요.');}
    }finally{clearTimeout(timeout);}
  }
  create(){
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Web Audio unavailable');this.ctx=new Context();const c=this.ctx;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;limiter.connect(c.destination);
    this.master=c.createGain();this.master.gain.value=0;this.master.connect(limiter);
    this.musicBus=c.createGain();this.musicBus.connect(this.master);this.effectsBus=c.createGain();this.effectsBus.connect(this.master);this.applyVolumes();
    this.engineGain=c.createGain();this.engineGain.gain.value=0;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;this.engineGain.connect(filter);filter.connect(this.effectsBus);
    this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=45;this.engine.connect(this.engineGain);this.engine.start();
    this.hydraulic=c.createOscillator();this.hydraulic.type='triangle';this.hydraulic.frequency.value=260;this.hydraulicGain=c.createGain();this.hydraulicGain.gain.value=0;this.hydraulic.connect(this.hydraulicGain);this.hydraulicGain.connect(this.effectsBus);this.hydraulic.start();
    this.noise=c.createBuffer(1,c.sampleRate*1.1,c.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
    this.timer=setInterval(()=>this.schedule(),80);
  }
  applyVolumes(){if(!this.ctx)return;this.musicBus.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.04);this.effectsBus.gain.setTargetAtTime(this.effectsVolume,this.ctx.currentTime,.04);}
  paint(error){const pending=this.enabled&&(!this.ctx||this.ctx.state!=='running');this.button.textContent=this.enabled?'🔇 전체 음소거':'♫ 소리 재생';this.button.setAttribute('aria-pressed',String(this.enabled));const quick=document.getElementById('headerAudioToggle');if(quick){quick.textContent=this.enabled?'🔇 음소거':'♫ 소리 재생';quick.setAttribute('aria-label',this.enabled?'음소거':'소리 재생');quick.setAttribute('aria-pressed',String(this.enabled));}document.getElementById('audioStatus').textContent=error||(this.enabled?(document.hidden?'다른 화면에서는 자동 일시정지':pending?'자동재생 대기 · 화면을 터치하면 시작됩니다.':'배경음과 동작 효과음 재생 중'):'음소거 상태입니다. 소리 재생을 누르면 다시 재생됩니다.');}
  note(freq,duration,volume,bus,type='sine',delay=0){if(!this.ctx||!this.enabled)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
  schedule(){if(!this.enabled||!this.ctx||this.ctx.state!=='running'||document.hidden)return;const c=this.ctx;if(this.nextBeat<c.currentTime-.3)this.nextBeat=c.currentTime+.04;
    // 112 BPM, original playful pentatonic melody with walking bass and light percussion.
    const melody=[72,null,76,79,76,74,72,null,67,72,74,76,79,null,76,74,72,null,76,79,81,79,76,null,74,72,69,67,69,72,null,null];
    const bass=[48,48,53,53,55,55,48,55];
    while(this.nextBeat<c.currentTime+.18){const delay=Math.max(0,this.nextBeat-c.currentTime),s=this.step%32;
      if(melody[s])this.note(440*2**((melody[s]-69)/12),.16,.11,this.musicBus,'triangle',delay);
      if(s%2===0)this.note(440*2**((bass[Math.floor(s/4)]-69)/12),.28,.17,this.musicBus,'sine',delay);
      if(s%4===0)this.kick(delay);else if(s%2===1)this.noiseBurst(.025,.018,this.musicBus,delay,5000);
      this.step++;this.nextBeat+=60/112/2;
    }
  }
  kick(delay){const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(115,t);o.frequency.exponentialRampToValueAtTime(42,t+.1);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+.13);o.connect(g);g.connect(this.musicBus);o.start(t);o.stop(t+.15);o.onended=()=>{o.disconnect();g.disconnect();};}
  noiseBurst(duration,volume,bus,delay=0,cutoff=1300){const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+duration+.03);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
  update(v){const before=this.previous;this.previous={...v};if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,drive=Math.min(1,Math.max(Math.abs(v.left),Math.abs(v.right))),moving=Math.abs(v.lift-before.lift)>.0001||Math.abs(v.tilt-before.tilt)>.0001;
    this.engine.frequency.setTargetAtTime(42+drive*48,t,.13);this.engineGain.gain.setTargetAtTime(.018+drive*.055,t,.12);this.hydraulic.frequency.setTargetAtTime(230+v.lift*100,t,.08);this.hydraulicGain.gain.setTargetAtTime(moving?.035:0,t,.06);
    if(v.speed<-.05&&t>this.reverseAt){this.note(740,.13,.11,this.effectsBus,'sine');this.reverseAt=t+.7;}
    if(v.load>before.load)this.noiseBurst(.45,.21,this.effectsBus);
    if(v.cycles>before.cycles){this.noiseBurst(.65,.18,this.effectsBus);[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.note(f,.24,.13,this.effectsBus,'triangle',.15+i*.13));}
  }
}
