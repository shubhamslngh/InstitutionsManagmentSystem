(()=>{var a={};a.id=891,a.ids=[891],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},1804:(a,b,c)=>{"use strict";function d(a,b,c){let d=Error(b);return d.status=a,d.details=c,d}c.d(b,{V:()=>d})},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4573:a=>{"use strict";a.exports=require("node:buffer")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19485:(a,b,c)=>{"use strict";c.d(b,{S:()=>e});var d=c(77598);function e(){return(0,d.randomUUID)()}},19771:a=>{"use strict";a.exports=require("process")},21820:a=>{"use strict";a.exports=require("os")},22267:(a,b,c)=>{"use strict";c.d(b,{Lw:()=>f,bd:()=>g,z3:()=>e});var d=c(1804);function e(a,b){let c=b.filter(b=>{let c=a[b];return null==c||""===c});if(c.length>0)throw(0,d.V)(400,"Missing required fields.",{missing:c})}function f(a,b){if("number"!=typeof a||Number.isNaN(a)||a<=0)throw(0,d.V)(400,`${b} must be a positive number.`)}function g(a,b,c){if(!b.includes(a))throw(0,d.V)(400,`${c} must be one of: ${b.join(", ")}.`)}},27910:a=>{"use strict";a.exports=require("stream")},28303:a=>{function b(a){var b=Error("Cannot find module '"+a+"'");throw b.code="MODULE_NOT_FOUND",b}b.keys=()=>[],b.resolve=b,b.id=28303,a.exports=b},28354:a=>{"use strict";a.exports=require("util")},29021:a=>{"use strict";a.exports=require("fs")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},34631:a=>{"use strict";a.exports=require("tls")},41204:a=>{"use strict";a.exports=require("string_decoder")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},54746:(a,b,c)=>{"use strict";c.d(b,{V$:()=>h,V2:()=>g,kX:()=>e,zu:()=>f});var d=c(10641);function e(a,b={}){return d.NextResponse.json({data:a},b)}function f(a,b){return d.NextResponse.json({message:a,data:b},{status:201})}function g(a){let b=a.status||500;return d.NextResponse.json({message:a.message||"Internal server error.",details:a.details||null},{status:b})}function h(){return new d.NextResponse(null,{status:204})}},55511:a=>{"use strict";a.exports=require("crypto")},56420:(a,b,c)=>{"use strict";function d(a){return Object.fromEntries(Object.entries(a).map(([a,b])=>[a.replace(/_([a-z])/g,(a,b)=>b.toUpperCase()),b]))}function e(a){return a.map(d)}c.d(b,{K:()=>e,e:()=>d})},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},64552:(a,b,c)=>{"use strict";c.d(b,{O0:()=>n,RQ:()=>l,Uw:()=>j,hl:()=>k,i3:()=>m});var d=c(74639),e=c(19485),f=c(1804),g=c(22267),h=c(56420);let i=["SCHOOL","COLLEGE"];async function j(){let a=await (0,d.P)("SELECT * FROM institutions ORDER BY created_at DESC");return(0,h.K)(a.rows)}async function k(a){let b=await (0,d.P)("SELECT * FROM institutions WHERE id = $1",[a]);if(0===b.rowCount)throw(0,f.V)(404,"Institution not found.");return(0,h.e)(b.rows[0])}async function l(a){(0,g.z3)(a,["name","type"]),(0,g.bd)(a.type,i,"type");let b=(0,e.S)();return await (0,d.P)(`
      INSERT INTO institutions (id, name, type, code, address, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,[b,a.name.trim(),a.type,a.code?.trim()||null,a.address?.trim()||null,a.contactEmail?.trim()||null,a.contactPhone?.trim()||null]),k(b)}async function m(a,b){let c=await k(a),e=b.type??c.type;return(0,g.bd)(e,i,"type"),await (0,d.P)(`
      UPDATE institutions
      SET
        name = $2,
        type = $3,
        code = $4,
        address = $5,
        contact_email = $6,
        contact_phone = $7
      WHERE id = $1
    `,[a,b.name?.trim()??c.name,e,b.code?.trim()??c.code,b.address?.trim()??c.address,b.contactEmail?.trim()??c.contactEmail,b.contactPhone?.trim()??c.contactPhone]),k(a)}async function n(a){await k(a),await (0,d.P)("DELETE FROM institutions WHERE id = $1",[a])}},66136:a=>{"use strict";a.exports=require("timers")},73149:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>G,patchFetch:()=>F,routeModule:()=>B,serverHooks:()=>E,workAsyncStorage:()=>C,workUnitAsyncStorage:()=>D});var d={};c.r(d),c.d(d,{DELETE:()=>A,GET:()=>y,PATCH:()=>z,runtime:()=>x});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(91598),v=c(64552),w=c(54746);let x="nodejs";async function y(a,b){try{return await (0,u.K)(),(0,w.kX)(await (0,v.hl)(b.params.institutionId))}catch(a){return(0,w.V2)(a)}}async function z(a,b){try{await (0,u.K)();let c=await a.json();return(0,w.kX)(await (0,v.i3)(b.params.institutionId,c))}catch(a){return(0,w.V2)(a)}}async function A(a,b){try{return await (0,u.K)(),await (0,v.O0)(b.params.institutionId),(0,w.V$)()}catch(a){return(0,w.V2)(a)}}let B=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/institutions/[institutionId]/route",pathname:"/api/institutions/[institutionId]",filename:"route",bundlePath:"app/api/institutions/[institutionId]/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/shubhamsingh/mauryaSoftwares/src/app/api/institutions/[institutionId]/route.js",nextConfigOutput:"",userland:d}),{workAsyncStorage:C,workUnitAsyncStorage:D,serverHooks:E}=B;function F(){return(0,g.patchFetch)({workAsyncStorage:C,workUnitAsyncStorage:D})}async function G(a,b,c){var d;let e="/api/institutions/[institutionId]/route";"/index"===e&&(e="/");let g=await B.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||B.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===B.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>B.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>B.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await B.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await B.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await B.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},74075:a=>{"use strict";a.exports=require("zlib")},74639:(a,b,c)=>{"use strict";c.d(b,{dz:()=>g,P:()=>j,ro:()=>k});var d=c(29382);c(49947);let e={nodeEnv:"production",port:Number(process.env.PORT||3e3),host:process.env.HOST||"127.0.0.1",databaseProvider:process.env.DB_PROVIDER||"mysql",databaseHost:process.env.DB_HOST||"",databasePort:Number(process.env.DB_PORT||3306),databaseName:process.env.DB_NAME||"",databaseUser:process.env.DB_USER||"",databasePassword:process.env.DB_PASSWORD||"",databaseSsl:function(a,b=!1){return null==a||""===a?b:["1","true","yes","on"].includes(String(a).toLowerCase())}(process.env.DB_SSL,!1),databaseUrl:function(a,b){let c=process.env[a],d=null==c||""===c?b:c;if(null==d||""===d)throw Error(`Missing required environment variable: ${a}`);return d}("DATABASE_URL",function(){if(process.env.DATABASE_URL)return process.env.DATABASE_URL;let a=process.env.DB_PROVIDER||"mysql";if("mysql"!==a)throw Error(`Unsupported DB_PROVIDER "${a}". This app currently supports MySQL only.`);let b=process.env.DB_HOST,c=process.env.DB_PORT||"3306",d=process.env.DB_NAME,e=process.env.DB_USER,f=process.env.DB_PASSWORD;return b&&d&&e&&f?`mysql://${encodeURIComponent(e)}:${encodeURIComponent(f)}@${b}:${c}/${d}`:"mysql://root:your_password@localhost:3306/mauryaschool"}())},f=new URL(e.databaseUrl),g=d.createPool({host:f.hostname,port:Number(f.port||e.databasePort||3306),user:decodeURIComponent(f.username),password:decodeURIComponent(f.password),database:f.pathname.replace(/^\//,""),ssl:e.databaseSsl?{}:void 0,waitForConnections:!0,connectionLimit:10,queueLimit:0,multipleStatements:!0});function h(a){return a.replace(/\$\d+/g,"?").replace(/\bTRUE\b/g,"TRUE").replace(/\bFALSE\b/g,"FALSE")}function i(a){return Array.isArray(a)?{rows:a,rowCount:a.length}:{rows:[],rowCount:a.affectedRows??0,insertId:a.insertId??null}}async function j(a,b=[]){let[c]=await g.query(h(a),b);return i(c)}async function k(a){let b=await g.getConnection();try{await b.beginTransaction();let c=await a({async query(a,c=[]){let[d]=await b.query(h(a),c);return i(d)}});return await b.commit(),c}catch(a){throw await b.rollback(),a}finally{b.release()}}},77598:a=>{"use strict";a.exports=require("node:crypto")},78335:()=>{},79428:a=>{"use strict";a.exports=require("buffer")},79551:a=>{"use strict";a.exports=require("url")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},91598:(a,b,c)=>{"use strict";let d;c.d(b,{K:()=>h});var e=c(74639);let f=`
CREATE TABLE IF NOT EXISTS institutions (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('SCHOOL', 'COLLEGE') NOT NULL,
  code VARCHAR(120) NULL,
  address TEXT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS academic_classes (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  section VARCHAR(120) NULL,
  academic_year VARCHAR(120) NULL,
  capacity INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_academic_classes_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_academic_classes_name (institution_id, name, section, academic_year),
  KEY idx_academic_classes_institution_id (institution_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  admission_number VARCHAR(120) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  mother_name VARCHAR(255) NULL,
  father_name VARCHAR(255) NULL,
  aadhaar_number VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  dob DATE NULL,
  course VARCHAR(255) NULL,
  class_name VARCHAR(255) NULL,
  class_id CHAR(36) NULL,
  section VARCHAR(120) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE SET NULL,
  UNIQUE KEY uq_students_institution_admission (institution_id, admission_number),
  KEY idx_students_institution_id (institution_id),
  KEY idx_students_class_id (class_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_structures (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  class_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME',
  applicable_for VARCHAR(120) NOT NULL DEFAULT 'ALL',
  due_day_of_month INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_structures_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_structures_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE CASCADE,
  KEY idx_fee_structures_institution_id (institution_id),
  KEY idx_fee_structures_class_id (class_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_invoices (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  fee_structure_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_invoices_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_invoices_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_invoices_structure
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL,
  KEY idx_fee_invoices_student_id (student_id),
  KEY idx_fee_invoices_institution_id (institution_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payments (
  id CHAR(36) PRIMARY KEY,
  fee_invoice_id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  reference_number VARCHAR(255) NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_payments_invoice
    FOREIGN KEY (fee_invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  KEY idx_fee_payments_invoice_id (fee_invoice_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_fee_ledgers (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  class_id CHAR(36) NULL,
  student_id CHAR(36) NOT NULL,
  fee_structure_id CHAR(36) NOT NULL,
  ledger_year INT NOT NULL,
  month_number INT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_on DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_monthly_fee_ledgers_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_monthly_fee_ledgers_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE SET NULL,
  CONSTRAINT fk_monthly_fee_ledgers_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_monthly_fee_ledgers_structure
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE,
  UNIQUE KEY uq_monthly_fee_ledgers_unique (student_id, fee_structure_id, ledger_year, month_number)
) ENGINE=InnoDB;
`;async function g(){await e.dz.query(f)}async function h(){return d||(d=g().catch(a=>{throw d=void 0,a})),d}},91645:a=>{"use strict";a.exports=require("net")},94735:a=>{"use strict";a.exports=require("events")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[331,12,692],()=>b(b.s=73149));module.exports=c})();