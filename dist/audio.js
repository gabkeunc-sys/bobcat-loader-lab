// Locally hosted, licensed music and sampled machinery/ground effects. See audio/CREDITS.md.
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
      this.loadSamples().then(()=>{if(this.enabled&&this.ctx.state==='running'){this.ensureLoops();this.paint();}}).catch(()=>this.paint('음원을 불러오지 못했습니다. 새로고침해 주세요.'));
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
    this.buffers={};this.loops={};
    this.loadSamples().catch(()=>{});
  }
  loadSamples(){
    if(this.loading)return this.loading;
    this.loading=Promise.all(['music','engine','hydraulic','gravel'].map(async name=>{
      const response=await fetch(new URL(`audio/${name}.mp3`,import.meta.url));
      if(!response.ok)throw Error(`Missing ${name}`);
      this.buffers[name]=await this.ctx.decodeAudioData(await response.arrayBuffer());
    })).catch(error=>{this.loading=null;throw error;});
    return this.loading;
  }
  ensureLoops(){
    for(const [name,bus,volume] of [['music',this.musicBus,.8],['engine',this.effectsBus,.12],['hydraulic',this.effectsBus,0]]){
      if(this.loops[name]||!this.buffers[name])continue;
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[name];source.loop=true;
      gain.gain.value=volume;source.connect(gain);gain.connect(bus);source.start();this.loops[name]={source,gain};
    }
  }
  sample(name,volume=1,rate=1,delay=0){
    if(!this.buffers[name]||!this.enabled)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[name];source.playbackRate.value=rate;
    gain.gain.value=volume;source.connect(gain);gain.connect(this.effectsBus);source.start(this.ctx.currentTime+delay);
    source.onended=()=>{source.disconnect();gain.disconnect();};
  }

  applyVolumes(){if(!this.ctx)return;this.musicBus.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.04);this.effectsBus.gain.setTargetAtTime(this.effectsVolume,this.ctx.currentTime,.04);}
  paint(error){const pending=this.enabled&&(!this.ctx||this.ctx.state!=='running');this.button.textContent=this.enabled?'🔇 전체 음소거':'♫ 소리 재생';this.button.setAttribute('aria-pressed',String(this.enabled));const quick=document.getElementById('headerAudioToggle');if(quick){quick.textContent=this.enabled?'🔇 음소거':'♫ 소리 재생';quick.setAttribute('aria-label',this.enabled?'음소거':'소리 재생');quick.setAttribute('aria-pressed',String(this.enabled));}document.getElementById('audioStatus').textContent=error||(this.enabled?(document.hidden?'다른 화면에서는 자동 일시정지':pending?'자동재생 대기 · 화면을 터치하면 시작됩니다.':!this.loops?.music?'음원 불러오는 중…':'Carefree · 배경음과 장비 효과음 재생 중'):'음소거 상태입니다. 소리 재생을 누르면 다시 재생됩니다.');}
  note(freq,duration,volume,bus,type='sine',delay=0){if(!this.ctx||!this.enabled)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
  update(v){const before=this.previous;this.previous={...v};if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,drive=Math.min(1,Math.max(Math.abs(v.left),Math.abs(v.right))),moving=Math.abs(v.lift-before.lift)>.0001||Math.abs(v.tilt-before.tilt)>.0001;
    const engine=this.loops.engine,hydraulic=this.loops.hydraulic;
    if(engine){engine.source.playbackRate.setTargetAtTime(.78+drive*.58,t,.18);engine.gain.gain.setTargetAtTime(.12+drive*.2,t,.12);}
    if(hydraulic)hydraulic.gain.gain.setTargetAtTime(moving?.32:0,t,.07);
    if(v.speed<-.05&&t>this.reverseAt){this.note(740,.13,.08,this.effectsBus,'sine');this.reverseAt=t+.7;}
    if(v.load>before.load)this.sample('gravel',.8,.8);
    if(v.cycles>before.cycles){this.sample('gravel',.8,.65);this.sample('gravel',.5,.9,.18);[523.25,659.25,783.99].forEach((f,i)=>this.note(f,.2,.055,this.effectsBus,'sine',.4+i*.12));}
  }
}
