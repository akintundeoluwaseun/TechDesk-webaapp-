import{o as c,p as u,q as p}from"./index-BoyGaoBI.js";function l(){const e=p();if(e==="electron")return c;if(e==="capacitor")throw new Error("Running under Capacitor with no platform adapter registered. The mobile entry point must call setPlatform(capacitorAdapter).");return u}let t=null,i=null;const f=`
  position: fixed;
  left: 50%;
  bottom: calc(76px + env(safe-area-inset-bottom));
  transform: translateX(-50%) translateY(8px);
  z-index: 2147483000;
  max-width: min(92vw, 420px);
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(17, 20, 26, 0.94);
  color: #fff;
  font: 500 14px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  text-align: center;
  box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity .18s ease, transform .18s ease;
  pointer-events: none;
`;function d(e,r=3500){typeof document>"u"||(clearTimeout(i),t||(t=document.createElement("div"),t.setAttribute("role","status"),t.setAttribute("aria-live","polite"),t.style.cssText=f,document.body.appendChild(t)),t.textContent=e,requestAnimationFrame(()=>{t&&(t.style.opacity="1",t.style.transform="translateX(-50%) translateY(0)")}),i=setTimeout(()=>{if(!t)return;t.style.opacity="0",t.style.transform="translateX(-50%) translateY(8px)";const a=t;t=null,setTimeout(()=>a.remove(),220)},r))}async function m(e,r,{share:a=!1}={}){const s=l();try{const n=a?await s.shareFile(e,r):await s.saveFile(e,r);return!a&&n.folder&&d(`Saved to ${n.folder}`),n}catch(n){const o=String((n==null?void 0:n.message)||n);if(/cancel/i.test(o))return{ok:!0,via:"cancelled"};try{window.alert(`Couldn't save ${r}.

${o}`)}catch{}return{ok:!1,error:o}}}function y(e,r){return m(e.output("blob"),r)}async function b(e,r){try{return await l().openFile(e.output("blob"),r)}catch(a){return{ok:!1,error:String((a==null?void 0:a.message)||a)}}}export{l as a,m as b,b as p,y as s};
