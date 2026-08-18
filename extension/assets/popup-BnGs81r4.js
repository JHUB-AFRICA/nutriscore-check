import{c as y,R as v,b as R,k as l,d as r,h as b}from"./index-CGe2_yMy.js";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackgroundServiceWorker — popup UI (Vite/React build)
 */

/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const E=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],x=y("chart-column",E);
window.React=v;

// ---------------------------------------------------------------------------
// Account section: sign in/out through the extension's own Google/Firebase
// flow (background.js SIGN_IN/SIGN_OUT/GET_SIGNED_IN_USER handlers) --
// no website tab required.
// ---------------------------------------------------------------------------
function AccountRow({user,signingIn,authError,onSignIn,onSignOut}){
  if(user){
    return React.createElement("div",{className:"mx-4 mt-3 flex items-center gap-2 rounded-lg bg-[#f6f7f9] px-3 py-2"},
      user.picture
        ? React.createElement("img",{src:user.picture,alt:"",className:"size-7 rounded-full",referrerPolicy:"no-referrer"})
        : React.createElement("div",{className:"grid size-7 place-items-center rounded-full text-white",style:{backgroundColor:"var(--primary)",fontSize:"0.75rem",fontWeight:700}},
            (user.email||"?").charAt(0).toUpperCase()
          ),
      React.createElement("div",{style:{minWidth:0,flex:"1 1 auto"}},
        React.createElement("p",{style:{fontSize:"0.82rem",fontWeight:600,color:"var(--foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},user.email)
      ),
      React.createElement("button",{
        type:"button",
        onClick:onSignOut,
        className:"rounded-md px-2 py-1 transition-opacity hover:opacity-90",
        style:{flexShrink:0,fontSize:"0.75rem",fontWeight:600,color:"var(--muted-foreground)"}
      },"Sign out")
    );
  }

  return React.createElement("div",{className:"mx-4 mt-3"},
    React.createElement("button",{
      type:"button",
      onClick:onSignIn,
      disabled:signingIn,
      className:"flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 transition-opacity hover:opacity-90",
      style:{fontSize:"0.82rem",fontWeight:600,color:"var(--foreground)",opacity:signingIn?0.6:1}
    },
      React.createElement("svg",{width:14,height:14,viewBox:"0 0 48 48","aria-hidden":!0},
        React.createElement("path",{fill:"#EA4335",d:"M24 9.5c3.94 0 6.66 1.7 8.19 3.13l5.98-5.83C34.64 3.36 29.9 1.5 24 1.5 14.86 1.5 7.03 6.9 3.35 14.6l6.99 5.43C12.1 14.06 17.56 9.5 24 9.5z"}),
        React.createElement("path",{fill:"#4285F4",d:"M46.5 24.5c0-1.64-.15-3.2-.42-4.7H24v9h12.6c-.55 2.85-2.2 5.27-4.68 6.9l7.2 5.6C43.3 37.4 46.5 31.5 46.5 24.5z"}),
        React.createElement("path",{fill:"#FBBC05",d:"M10.34 20.03A14.4 14.4 0 0 0 9.6 24c0 1.44.25 2.83.7 4.1l-6.99 5.4A23.9 23.9 0 0 1 .5 24c0-3.85.9-7.5 2.85-10.7l6.99 5.4z"}),
        React.createElement("path",{fill:"#34A853",d:"M24 46.5c6.48 0 11.92-2.13 15.9-5.8l-7.2-5.6c-2 1.36-4.63 2.2-8.7 2.2-6.44 0-11.9-4.56-13.66-10.53l-6.99 5.4C7.03 41.1 14.86 46.5 24 46.5z"}),
        React.createElement("path",{fill:"none",d:"M.5.5h47v47H.5z"})
      ),
      React.createElement("span",null,signingIn?"Signing in…":"Sign in with Google")
    ),
    authError
      ? React.createElement("p",{style:{fontSize:"0.72rem",color:"var(--destructive)",marginTop:"6px"}},authError)
      : React.createElement("p",{style:{fontSize:"0.72rem",color:"var(--muted-foreground)",marginTop:"6px"}},"Sign in to see disease-specific warnings from your saved health profile.")
  );
}

// ---------------------------------------------------------------------------
// Health details: renders whatever health profile the website last saved
// (or the extension last synced via HEALTH_SYNC / GET_HEALTH_PROFILE).
// ---------------------------------------------------------------------------
function formatLabel(v){
  return String(v).replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}

function ChipGroup({label,items}){
  return React.createElement("div",{style:{marginBottom:"10px"}},
    React.createElement("p",{style:{margin:"0 0 6px",fontWeight:700,fontSize:"0.78rem",color:"var(--foreground)"}},label),
    (items&&items.length)
      ? React.createElement("div",null,
          items.map((v,idx)=>React.createElement("span",{
            key:idx,
            style:{display:"inline-block",padding:"3px 10px",borderRadius:"999px",background:"#ecfdf5",color:"var(--primary)",fontSize:"0.74rem",fontWeight:700,margin:"2px 4px 2px 0"}
          },formatLabel(v)))
        )
      : React.createElement("span",{style:{color:"var(--muted-foreground)",fontSize:"0.78rem"}},"None selected")
  );
}

function HealthPanel({health}){
  if(!health){
    return React.createElement("p",{style:{margin:0,color:"var(--muted-foreground)",fontSize:"0.8rem"}},
      "No health details saved yet. Add them on the NutriScore website and they'll show up here.");
  }
  const details=[];
  if(health.age!=null&&health.age!=="")details.push(`Age ${health.age}`);
  if(health.gender)details.push(formatLabel(health.gender));
  if(health.allergies)details.push(`Allergies: ${health.allergies}`);
  return React.createElement("div",null,
    details.length
      ? React.createElement("p",{style:{margin:"0 0 10px",fontSize:"0.78rem",color:"var(--muted-foreground)"}},details.join(" · "))
      : null,
    React.createElement(ChipGroup,{label:"Health conditions",items:health.conditions}),
    React.createElement(ChipGroup,{label:"Dietary preferences",items:health.dietaryPreferences})
  );
}

function w({siteActive:t,siteName:a,scoredCount:o,totalCount:n,onOpenDashboard:c,user:u,signingIn:s,authError:er,onSignIn:si,onSignOut:so,health:hp,healthOpen:ho,onToggleHealth:oh}){
  const hasHealth=!!hp;
  return React.createElement("div",{className:"overflow-hidden rounded-xl bg-white",style:{width:"max-content",minWidth:280,maxWidth:360}},
    React.createElement("div",{className:"flex items-center justify-between gap-2 px-4 pb-3 pt-4"},
      React.createElement("div",{className:"flex items-center gap-2"},
        React.createElement("div",{className:"grid size-8 place-items-center rounded-lg",style:{backgroundColor:"var(--ns-grade-a)",color:"#fff"}},
          React.createElement("span",{style:{fontWeight:700}},"N")
        ),
        React.createElement("div",null,
          React.createElement("p",{style:{fontWeight:700,fontSize:"1.05rem",paddingLeft:"2px"}},"NutriScore")
        )
      ),
      React.createElement("button",{
        type:"button",
        onClick:oh,
        title:"View health details",
        "aria-label":"View health details",
        className:"grid size-8 place-items-center rounded-lg transition-opacity hover:opacity-90",
        style:{
          border:"1.5px solid "+(hasHealth?"var(--primary)":"rgba(0,0,0,0.1)"),
          backgroundColor:hasHealth?"#ecfdf5":"#fff",
          color:hasHealth?"var(--primary)":"var(--muted-foreground)",
          flexShrink:0
        }
      },
        React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":!0},
          React.createElement("path",{d:"M8 2v4"}),
          React.createElement("path",{d:"M16 2v4"}),
          React.createElement("rect",{width:18,height:18,x:3,y:4,rx:2}),
          React.createElement("path",{d:"M3 10h18"})
        )
      )
    ),
    React.createElement(AccountRow,{user:u,signingIn:s,authError:er,onSignIn:si,onSignOut:so}),
    React.createElement("div",{className:"mx-4 mt-3 flex items-center gap-2 rounded-lg bg-[#f6f7f9] px-3 py-2"},
      React.createElement("span",{className:t?"ns-pulse":"",style:{width:10,height:10,borderRadius:"50%",backgroundColor:t?"var(--ns-grade-a)":"var(--muted-foreground)"},"aria-hidden":!0}),
      React.createElement("span",{style:{fontSize:"0.82rem"}},t?`Active on ${a}`:"Not a supported store")
    ),
    React.createElement("div",{className:"mx-4 mt-3 flex items-center justify-center rounded-lg border border-black/5 px-3 py-2.5"},
      React.createElement("span",{style:{fontSize:"0.85rem",color:"var(--muted-foreground)",fontWeight:500}},
        React.createElement("span",{style:{fontWeight:700,color:"var(--foreground)"}},o),
        (n??0)>0?` of ${n} items graded`:" items graded"
      )
    ),
    ho
      ? React.createElement("div",{className:"mx-4 mt-3 rounded-lg border border-black/5 px-3 py-3"},
          React.createElement(HealthPanel,{health:hp})
        )
      : null,
    React.createElement("div",{className:"p-4"},
      React.createElement("button",{
        type:"button",
        onClick:c,
        className:"flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        style:{backgroundColor:"var(--primary)"}
      },
        React.createElement(x,{size:16,"aria-hidden":!0}),
        React.createElement("span",{style:{fontSize:"0.88rem"}},"View Shopping Analytics")
      )
    )
  );
}

function N(){
  const[t,a]=r(!1),[o,n]=r(""),[c,d]=r(0),[m,u]=r(0);
  const[user,setUser]=r(null);
  const[signingIn,setSigningIn]=r(!1);
  const[authError,setAuthError]=r(null);
  const[health,setHealth]=r(null);
  const[healthOpen,setHealthOpen]=r(!1);

  b(()=>{
    function i(){
      typeof chrome<"u"&&chrome.tabs&&chrome.tabs.query({active:!0,currentWindow:!0},p=>{
        const e=p[0];
        if(e!=null&&e.id&&e.url){
          const h=new URL(e.url);
          chrome.tabs.sendMessage(e.id,{action:"GET_PAGE_STATS"},s=>{
            if(chrome.runtime.lastError)a(!1);
            else if(s){
              a(!0);
              const g=h.hostname.replace("www.","");
              n(g),d(s.count||0),u(s.total||0)
            }
          })
        }
      })
    }
    i();
    const f=setInterval(i,1e3);
    return()=>clearInterval(f)
  },[]);

  b(()=>{
    if(typeof chrome>"u"||!chrome.runtime)return;
    chrome.runtime.sendMessage({action:"GET_SIGNED_IN_USER"},res=>{
      if(chrome.runtime.lastError)return;
      if(res&&res.status==="SUCCESS")setUser(res.data||null);
    });
  },[]);

  // Load whatever health profile is currently cached (populated either by
  // the extension's own sign-in, or synced in from the website via
  // HEALTH_SYNC) so the button can reflect it right away on popup open.
  b(()=>{
    if(typeof chrome>"u"||!chrome.runtime)return;
    chrome.runtime.sendMessage({action:"GET_HEALTH_PROFILE"},res=>{
      if(chrome.runtime.lastError)return;
      if(res&&res.status==="SUCCESS")setHealth(res.data||null);
    });
  },[]);

  // Live-update if background.js writes a fresh user/healthProfile while
  // this popup happens to be open (e.g. sign-in completing in a separate
  // window, or the website pushing a HEALTH_SYNC after a save).
  b(()=>{
    if(typeof chrome>"u"||!chrome.storage||!chrome.storage.onChanged)return;
    function onChange(changes,area){
      if(area!=="local")return;
      if(changes.user)setUser(changes.user.newValue||null);
      if(changes.healthProfile)setHealth(changes.healthProfile.newValue||null);
    }
    chrome.storage.onChanged.addListener(onChange);
    return()=>chrome.storage.onChanged.removeListener(onChange);
  },[]);

  function handleSignIn(){
    setAuthError(null);
    setSigningIn(!0);
    chrome.runtime.sendMessage({action:"SIGN_IN"},res=>{
      setSigningIn(!1);
      if(chrome.runtime.lastError){
        setAuthError(chrome.runtime.lastError.message||"Sign-in failed");
        return;
      }
      if(res&&res.status==="SUCCESS")setUser(res.data||null);
      else setAuthError((res&&res.error)||"Sign-in failed");
    });
  }

  function handleSignOut(){
    chrome.runtime.sendMessage({action:"SIGN_OUT"},()=>{
      setUser(null);
      setHealth(null);
      setHealthOpen(!1);
    });
  }

  function handleToggleHealth(){
    setHealthOpen(v=>!v);
  }

  return l(w,{
    siteActive:t,siteName:o,scoredCount:c,totalCount:m,
    onOpenDashboard:()=>chrome.runtime.openOptionsPage(),
    user,signingIn,authError,
    onSignIn:handleSignIn,onSignOut:handleSignOut,
    health,healthOpen,onToggleHealth:handleToggleHealth
  });
}

R(document.getElementById("root")).render(l(N,null));