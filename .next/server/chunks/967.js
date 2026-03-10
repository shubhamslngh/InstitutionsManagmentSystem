"use strict";exports.id=967,exports.ids=[967],exports.modules={1804:(a,b,c)=>{c.d(b,{V:()=>d});function d(a,b,c){let d=Error(b);return d.status=a,d.details=c,d}},1966:(a,b,c)=>{c.a(a,async(a,d)=>{try{let h;c.d(b,{K:()=>g});var e=c(14512),f=a([e]);async function g(){return h||(h=(0,e.w)().catch(a=>{throw h=void 0,a})),h}e=(f.then?(await f)():f)[0],d()}catch(a){d(a)}})},14512:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{w:()=>j});var e=c(51455),f=c(76760),g=c(73136),h=c(65967),i=a([h]);h=(i.then?(await i)():i)[0];let k=(0,g.fileURLToPath)("file:///Users/shubhamsingh/mauryaSoftwares/src/db/schema.js"),l=f.dirname(k),m=f.resolve(l,"../../sql/schema.sql");async function j(){let a=await e.readFile(m,"utf8");await h.dz.query(a)}d()}catch(a){d(a)}})},22267:(a,b,c)=>{c.d(b,{Lw:()=>f,bd:()=>g,z3:()=>e});var d=c(1804);function e(a,b){let c=b.filter(b=>{let c=a[b];return null==c||""===c});if(c.length>0)throw(0,d.V)(400,"Missing required fields.",{missing:c})}function f(a,b){if("number"!=typeof a||Number.isNaN(a)||a<=0)throw(0,d.V)(400,`${b} must be a positive number.`)}function g(a,b,c){if(!b.includes(a))throw(0,d.V)(400,`${c} must be one of: ${b.join(", ")}.`)}},46744:(a,b,c)=>{c.d(b,{_:()=>d}),c(49947);let d={port:Number(process.env.PORT||4e3),host:process.env.HOST||"127.0.0.1",databaseUrl:function(a,b){let c=process.env[a]??b;if(null==c||""===c)throw Error(`Missing required environment variable: ${a}`);return c}("DATABASE_URL","postgresql://shubham:your_password@localhost:5432/mauryaschool")}},56420:(a,b,c)=>{function d(a){return Object.fromEntries(Object.entries(a).map(([a,b])=>[a.replace(/_([a-z])/g,(a,b)=>b.toUpperCase()),b]))}function e(a){return a.map(d)}c.d(b,{K:()=>e,e:()=>d})},65967:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{P:()=>h,dz:()=>j,ro:()=>i});var e=c(64939),f=c(46744),g=a([e]);let j=new(e=(g.then?(await g)():g)[0]).Pool({connectionString:f._.databaseUrl});async function h(a,b=[]){return j.query(a,b)}async function i(a){let b=await j.connect();try{await b.query("BEGIN");let c=await a(b);return await b.query("COMMIT"),c}catch(a){throw await b.query("ROLLBACK"),a}finally{b.release()}}d()}catch(a){d(a)}})},84326:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{Et:()=>l,J1:()=>E,OD:()=>n,RD:()=>v,TG:()=>r,UB:()=>C,ZG:()=>s,de:()=>o,fp:()=>m,o0:()=>y,pT:()=>w,rv:()=>D,uZ:()=>z,v8:()=>x,w:()=>u,wi:()=>A,xV:()=>p});var e=c(65967),f=c(1804),g=c(22267),h=c(56420),i=a([e]);e=(i.then?(await i)():i)[0];let F=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];async function j(a,b={query:e.P}){let c=await b.query(`
      SELECT
        s.*,
        i.name AS institution_name,
        i.type AS institution_type,
        c.name AS academic_class_name,
        c.section AS academic_class_section
      FROM students s
      JOIN institutions i ON i.id = s.institution_id
      LEFT JOIN academic_classes c ON c.id = s.class_id
      WHERE s.id = $1
    `,[a]);if(0===c.rowCount)throw(0,f.V)(404,"Student not found.");return(0,h.e)(c.rows[0])}async function k(a,b={query:e.P}){let c=await b.query(`
      SELECT
        fi.*,
        COALESCE(SUM(fp.amount), 0) AS total_paid,
        fi.net_amount - COALESCE(SUM(fp.amount), 0) AS balance
      FROM fee_invoices fi
      LEFT JOIN fee_payments fp ON fp.fee_invoice_id = fi.id
      WHERE fi.id = $1
      GROUP BY fi.id
    `,[a]);if(0===c.rowCount)throw(0,f.V)(404,"Fee invoice not found.");let d=(0,h.e)(c.rows[0]);return{...d,status:0>=Number(d.balance)?"PAID":Number(d.totalPaid)>0?"PARTIALLY_PAID":d.status}}async function l(a){(0,g.z3)(a,["institutionId","name","amount"]),(0,g.Lw)(a.amount,"amount");let b=await (0,e.P)("SELECT id FROM institutions WHERE id = $1",[a.institutionId]);if(0===b.rowCount)throw(0,f.V)(404,"Institution not found.");if(a.classId){let b=await (0,e.P)("SELECT id FROM academic_classes WHERE id = $1 AND institution_id = $2",[a.classId,a.institutionId]);if(0===b.rowCount)throw(0,f.V)(404,"Class not found for this institution.")}let c=await (0,e.P)(`
      INSERT INTO fee_structures (
        institution_id,
        class_id,
        name,
        amount,
        frequency,
        applicable_for,
        due_day_of_month,
        is_active,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,[a.institutionId,a.classId||null,a.name.trim(),a.amount,a.frequency?.trim()||"ONE_TIME",a.applicableFor?.trim()||"ALL",a.dueDayOfMonth||null,a.isActive??!0,a.notes?.trim()||null]);return(0,h.e)(c.rows[0])}async function m(a={}){let b=[],c=[];a.institutionId&&(c.push(a.institutionId),b.push(`institution_id = $${c.length}`)),a.classId&&(c.push(a.classId),b.push(`class_id = $${c.length}`));let d=b.length>0?`WHERE ${b.join(" AND ")}`:"",f=await (0,e.P)(`SELECT * FROM fee_structures ${d} ORDER BY created_at DESC`,c);return(0,h.K)(f.rows)}async function n(a){let b=await (0,e.P)("SELECT * FROM fee_structures WHERE id = $1",[a]);if(0===b.rowCount)throw(0,f.V)(404,"Fee structure not found.");return(0,h.e)(b.rows[0])}async function o(a,b){let c=await n(a),d=void 0!==b.amount?Number(b.amount):Number(c.amount);(0,g.Lw)(d,"amount");let i=b.institutionId??c.institutionId,j=await (0,e.P)("SELECT id FROM institutions WHERE id = $1",[i]);if(0===j.rowCount)throw(0,f.V)(404,"Institution not found.");let k=void 0!==b.classId?b.classId||null:c.classId;if(k){let a=await (0,e.P)("SELECT id FROM academic_classes WHERE id = $1 AND institution_id = $2",[k,i]);if(0===a.rowCount)throw(0,f.V)(404,"Class not found for this institution.")}let l=await (0,e.P)(`
      UPDATE fee_structures
      SET
        institution_id = $2,
        class_id = $3,
        name = $4,
        amount = $5,
        frequency = $6,
        applicable_for = $7,
        due_day_of_month = $8,
        is_active = $9,
        notes = $10,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,[a,i,k,b.name?.trim()??c.name,d,b.frequency?.trim()??c.frequency,b.applicableFor?.trim()??c.applicableFor,void 0!==b.dueDayOfMonth?b.dueDayOfMonth||null:c.dueDayOfMonth,b.isActive??c.isActive,b.notes?.trim()??c.notes]);return(0,h.e)(l.rows[0])}async function p(a){await n(a),await (0,e.P)("DELETE FROM fee_structures WHERE id = $1",[a])}async function q(a,b){(0,g.z3)(a,["studentId","title","grossAmount"]),(0,g.Lw)(a.grossAmount,"grossAmount");let c=Number(a.discountAmount||0);if(c<0)throw(0,f.V)(400,"discountAmount cannot be negative.");let d=await j(a.studentId,b),e=Number(a.grossAmount)-c;if(e<=0)throw(0,f.V)(400,"Net amount must be greater than zero.");let h=await b.query(`
      INSERT INTO fee_invoices (
        institution_id,
        student_id,
        fee_structure_id,
        title,
        gross_amount,
        discount_amount,
        net_amount,
        due_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
      RETURNING *
    `,[d.institutionId,d.id,a.feeStructureId||null,a.title.trim(),a.grossAmount,c,e,a.dueDate||null,a.notes?.trim()||null]);return k(h.rows[0].id,b)}async function r(a,b){return(0,e.ro)(async c=>{let d=await k(a,c),e=void 0!==b.grossAmount?Number(b.grossAmount):Number(d.grossAmount),h=void 0!==b.discountAmount?Number(b.discountAmount):Number(d.discountAmount);if((0,g.Lw)(e,"grossAmount"),h<0)throw(0,f.V)(400,"discountAmount cannot be negative.");let i=Number(d.totalPaid),j=e-h;if(j<=0)throw(0,f.V)(400,"Net amount must be greater than zero.");if(j<i)throw(0,f.V)(400,"Net amount cannot be lower than the amount already paid.");return await c.query(`
        UPDATE fee_invoices
        SET
          title = $2,
          gross_amount = $3,
          discount_amount = $4,
          net_amount = $5,
          due_date = $6,
          notes = $7,
          status = $8,
          updated_at = NOW()
        WHERE id = $1
      `,[a,b.title?.trim()??d.title,e,h,j,void 0!==b.dueDate?b.dueDate||null:d.dueDate,b.notes?.trim()??d.notes,b.status?.trim()??d.status]),k(a,c)})}async function s(a){await k(a),await (0,e.P)("DELETE FROM fee_invoices WHERE id = $1",[a])}async function t(a){return(0,e.ro)(async b=>q(a,b))}async function u(a){return t(a)}async function v(a){return(0,g.z3)(a,["studentId","feeStructureId"]),(0,e.ro)(async b=>{let c=await j(a.studentId,b),d=await b.query("SELECT * FROM fee_structures WHERE id = $1 AND institution_id = $2",[a.feeStructureId,c.institutionId]);if(0===d.rowCount)throw(0,f.V)(404,"Fee structure not found for this institution.");let e=(0,h.e)(d.rows[0]);if(e.classId&&e.classId!==c.classId)throw(0,f.V)(400,"Fee structure is not attached to the student's class.");return q({studentId:c.id,feeStructureId:e.id,title:a.title||e.name,grossAmount:Number(e.amount),discountAmount:Number(a.discountAmount||0),dueDate:a.dueDate||null,notes:a.notes||e.notes},b)})}async function w(a){return(0,g.z3)(a,["studentId"]),(0,e.ro)(async b=>{let c=await j(a.studentId,b);if(!c.classId)throw(0,f.V)(400,"Student is not assigned to a class.");let d=await b.query(`
        SELECT *
        FROM fee_structures
        WHERE institution_id = $1
          AND class_id = $2
          AND is_active = TRUE
        ORDER BY created_at ASC
      `,[c.institutionId,c.classId]);if(0===d.rowCount)throw(0,f.V)(404,"No fee structures found for the student's class.");let e=[];for(let f of d.rows){let d=(0,h.e)(f);if((await b.query(`
          SELECT id
          FROM fee_invoices
          WHERE student_id = $1
            AND fee_structure_id = $2
            AND status IN ('PENDING', 'PARTIALLY_PAID')
        `,[c.id,d.id])).rowCount>0)continue;let g=await q({studentId:c.id,feeStructureId:d.id,title:d.name,grossAmount:Number(d.amount),discountAmount:0,dueDate:a.dueDate||null,notes:a.notes||d.notes},b);e.push(g)}return{student:c,createdCount:e.length,invoices:e}})}async function x(a={}){let b=[],c=[];a.studentId&&(c.push(a.studentId),b.push(`fi.student_id = $${c.length}`)),a.institutionId&&(c.push(a.institutionId),b.push(`fi.institution_id = $${c.length}`));let d=b.length>0?`WHERE ${b.join(" AND ")}`:"",f=await (0,e.P)(`
      SELECT
        fi.*,
        COALESCE(SUM(fp.amount), 0) AS total_paid,
        fi.net_amount - COALESCE(SUM(fp.amount), 0) AS balance
      FROM fee_invoices fi
      LEFT JOIN fee_payments fp ON fp.fee_invoice_id = fi.id
      ${d}
      GROUP BY fi.id
      ORDER BY fi.created_at DESC
    `,c);return(0,h.K)(f.rows).map(a=>({...a,status:0>=Number(a.balance)?"PAID":Number(a.totalPaid)>0?"PARTIALLY_PAID":a.status}))}async function y(a){return(0,g.z3)(a,["feeInvoiceId","amount"]),(0,g.Lw)(a.amount,"amount"),(0,e.ro)(async b=>{let c=await k(a.feeInvoiceId,b);if(Number(a.amount)>Number(c.balance))throw(0,f.V)(400,"Payment amount exceeds the remaining balance.");let d=await b.query(`
        INSERT INTO fee_payments (
          fee_invoice_id,
          institution_id,
          student_id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,[a.feeInvoiceId,c.institutionId,c.studentId,a.amount,a.paymentDate||new Date().toISOString(),a.paymentMethod?.trim()||"CASH",a.referenceNumber?.trim()||null,a.remarks?.trim()||null]),e=await k(a.feeInvoiceId,b),g=0>=Number(e.balance)?"PAID":"PARTIALLY_PAID";return await b.query("UPDATE fee_invoices SET status = $2, updated_at = NOW() WHERE id = $1",[a.feeInvoiceId,g]),{payment:(0,h.e)(d.rows[0]),invoice:{...e,status:g}}})}async function z(a){let b=await j(a),c=await x({studentId:a}),d=c.reduce((a,b)=>(a.totalAssigned+=Number(b.netAmount),a.totalPaid+=Number(b.totalPaid),a.totalBalance+=Number(b.balance),a),{totalAssigned:0,totalPaid:0,totalBalance:0});return{student:b,totals:d,assignments:c}}async function A(a={}){let b=[],c=[];a.studentId&&(c.push(a.studentId),b.push(`student_id = $${c.length}`)),a.institutionId&&(c.push(a.institutionId),b.push(`institution_id = $${c.length}`));let d=b.length>0?`WHERE ${b.join(" AND ")}`:"",f=await (0,e.P)(`SELECT * FROM fee_payments ${d} ORDER BY payment_date DESC, created_at DESC`,c);return(0,h.K)(f.rows)}async function B(a){let b=await (0,e.P)("SELECT * FROM fee_payments WHERE id = $1",[a]);if(0===b.rowCount)throw(0,f.V)(404,"Payment not found.");return(0,h.e)(b.rows[0])}async function C(a){await B(a),await (0,e.P)("DELETE FROM fee_payments WHERE id = $1",[a])}async function D(a={}){(0,g.z3)(a,["institutionId","year"]);let b=Number(a.year);if(Number.isNaN(b))throw(0,f.V)(400,"year must be a valid number.");let c=["s.institution_id = $1"],d=[a.institutionId];a.classId&&(d.push(a.classId),c.push(`s.class_id = $${d.length}`));let i=await (0,e.P)(`
      SELECT
        s.id,
        s.first_name,
        s.admission_number,
        s.class_id,
        s.class_name,
        c.name AS academic_class_name,
        c.section AS academic_class_section
      FROM students s
      LEFT JOIN academic_classes c ON c.id = s.class_id
      WHERE ${c.join(" AND ")}
      ORDER BY s.first_name ASC
    `,d),j=["institution_id = $1","frequency = 'MONTHLY'","is_active = TRUE"],k=[a.institutionId];a.classId&&(k.push(a.classId),j.push(`(class_id = $${k.length} OR class_id IS NULL)`));let l=await (0,e.P)(`
      SELECT *
      FROM fee_structures
      WHERE ${j.join(" AND ")}
      ORDER BY name ASC
    `,k),m=await (0,e.P)(`
      SELECT *
      FROM monthly_fee_ledgers
      WHERE institution_id = $1
        AND ledger_year = $2
        ${a.classId?"AND (class_id = $3 OR class_id IS NULL)":""}
    `,a.classId?[a.institutionId,b,a.classId]:[a.institutionId,b]),n=new Map(m.rows.map(a=>[`${a.student_id}:${a.fee_structure_id}:${a.month_number}`,(0,h.e)(a)])),o=[];for(let a of i.rows){let b=(0,h.e)(a);for(let a of l.rows){let c=(0,h.e)(a);c.classId&&c.classId!==b.classId||o.push({studentId:b.id,studentName:b.firstName,admissionNumber:b.admissionNumber,classId:b.classId,className:b.academicClassName?`${b.academicClassName}${b.academicClassSection?` - ${b.academicClassSection}`:""}`:b.className||"-",feeStructureId:c.id,feeName:c.name,amount:Number(c.amount),months:F.map((a,d)=>{let e=d+1,f=n.get(`${b.id}:${c.id}:${e}`);return{monthNumber:e,label:a,isPaid:!!f?.isPaid,paidOn:f?.paidOn||null}})})}}return{year:b,rows:o}}async function E(a){(0,g.z3)(a,["studentId","feeStructureId","monthNumber","year"]);let b=Number(a.monthNumber),c=Number(a.year);if(Number.isNaN(b)||b<1||b>12)throw(0,f.V)(400,"monthNumber must be between 1 and 12.");if(Number.isNaN(c))throw(0,f.V)(400,"year must be a valid number.");return(0,e.ro)(async d=>{let e=await j(a.studentId,d),g=await d.query("SELECT * FROM fee_structures WHERE id = $1 AND institution_id = $2",[a.feeStructureId,e.institutionId]);if(0===g.rowCount)throw(0,f.V)(404,"Fee structure not found.");let i=(0,h.e)(g.rows[0]);if("MONTHLY"!==i.frequency)throw(0,f.V)(400,"Ledger ticking is only available for monthly fee structures.");if(i.classId&&i.classId!==e.classId)throw(0,f.V)(400,"Fee structure is not attached to the student's class.");let k=!!a.isPaid,l=await d.query(`
        INSERT INTO monthly_fee_ledgers (
          institution_id,
          class_id,
          student_id,
          fee_structure_id,
          ledger_year,
          month_number,
          is_paid,
          paid_on
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, fee_structure_id, ledger_year, month_number)
        DO UPDATE SET
          is_paid = EXCLUDED.is_paid,
          paid_on = EXCLUDED.paid_on,
          class_id = EXCLUDED.class_id,
          updated_at = NOW()
        RETURNING *
      `,[e.institutionId,e.classId||null,e.id,i.id,c,b,k,k?new Date().toISOString():null]);return(0,h.e)(l.rows[0])})}d()}catch(a){d(a)}})}};