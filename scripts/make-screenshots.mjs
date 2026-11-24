// Generates the fictional app screenshots used by demo 3 (run once; output is committed in assets/).
import { chromium } from "playwright";
const base = `
<style>
*{box-sizing:border-box;font-family:Inter,Segoe UI,Arial,sans-serif}
body{margin:0;background:#f4f6f9;color:#1d2433}
.top{height:64px;background:#14213d;color:#fff;display:flex;align-items:center;padding:0 32px;gap:32px;font-weight:600}
.top span{opacity:.75;font-weight:400}
.wrap{padding:32px 48px}
h1{font-size:28px;margin:0 0 20px}
.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:20px}
.row{display:flex;gap:20px}
.btn{background:#2f6fed;color:#fff;border:0;border-radius:8px;padding:12px 22px;font-size:16px}
.muted{color:#6b7385}
input{width:100%;padding:10px;border:1px solid #cfd5e1;border-radius:8px;font-size:15px;margin:6px 0 14px}
</style>`;
const nav = `<div class="top">Northwind Books <span>Orders</span><span>Customers</span><span>Reports</span><span>Settings</span></div>`;
const pages = {
  "checkout-error": `${nav}<div class="wrap"><h1>Checkout</h1>
   <div class="card" style="background:#fdecec;border:1px solid #f3a6a6;color:#8a1c1c">
     <b>Payment failed.</b> 500 Internal Server Error – the payment service did not respond. Request ID 7f3a-21c9.</div>
   <div class="row"><div class="card" style="flex:2"><b>Order #10482</b><p class="muted">3 items · Ship to: Storgatan 12, Stockholm</p>
   <label>Card number</label><input value="•••• •••• •••• 4242"><label>Name on card</label><input value="Alex Andersson">
   <button class="btn">Pay 1 249 kr</button></div>
   <div class="card" style="flex:1"><b>Summary</b><p class="muted">Subtotal 1 149 kr<br>Shipping 100 kr<br><br><b style="color:#1d2433">Total 1 249 kr</b></p></div></div></div>`,
  "dashboard-ok": `${nav}<div class="wrap"><h1>Good morning, Alex</h1>
   <div class="row">${["Orders today|184","Revenue|62 310 kr","Returns|3","Avg. delivery|1.8 days"].map(s=>{const [a,b]=s.split("|");return `<div class="card" style="flex:1"><div class="muted">${a}</div><div style="font-size:30px;font-weight:700;margin-top:8px">${b}</div></div>`}).join("")}</div>
   <div class="card"><b>Recent orders</b><table style="width:100%;margin-top:12px;border-collapse:collapse;font-size:15px">
   ${["#10481|Lena Berg|Shipped|849 kr","#10480|Omar Haddad|Packed|1 320 kr","#10479|Sara Lind|Shipped|399 kr","#10478|Jonas Ek|Delivered|2 105 kr","#10477|Maja Holm|Delivered|649 kr"].map(r=>`<tr>${r.split("|").map(c=>`<td style="padding:10px 0;border-top:1px solid #eef0f4">${c}</td>`).join("")}</tr>`).join("")}</table></div></div>`,
  "settings-broken": `${nav}<div class="wrap"><h1>Settings</h1>
   <div class="card" style="position:relative;height:430px">
    <div style="position:absolute;left:24px;top:24px;font-weight:600">Notifications</div>
    <div style="position:absolute;left:24px;top:40px;font-size:15px">Email me when an order ships Email me when a return is requested Weekly summary report</div>
    <div style="position:absolute;left:180px;top:52px;font-size:22px;font-weight:600;color:#444">Language and region</div>
    <input style="position:absolute;left:24px;top:120px;width:1400px" value="Swedish (Sweden)">
    <button class="btn" style="position:absolute;left:1120px;top:110px">Save changes</button>
    <div style="position:absolute;left:24px;top:200px;font-size:15px;line-height:12px;width:300px">Time zone Europe/Stockholm Date format YYYY-MM-DD Currency SEK First day of week Monday</div>
   </div></div>`,
  "login-crash": `<div style="padding:40px;font-family:Consolas,monospace;font-size:15px;background:#fff;height:100vh">
   <h2 style="font-family:Arial;color:#b00020;margin-top:0">Unhandled Runtime Error</h2>
   <div style="background:#fff0f0;border-left:4px solid #b00020;padding:16px;margin-bottom:24px">TypeError: Cannot read properties of undefined (reading 'token')</div>
   <pre style="color:#444;line-height:1.6">    at getSession (src/auth/session.ts:42:27)
    at LoginPage (src/pages/login.tsx:18:19)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20069:13)
    at beginWork (react-dom.development.js:21582:16)</pre>
   <p style="font-family:Arial;color:#666">This error happened while generating the page. Any console logs will be displayed in the terminal window.</p></div>`,
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const [name, html] of Object.entries(pages)) {
  await page.setContent(`<html><head>${base}</head><body>${html}</body></html>`);
  await page.screenshot({ path: `assets/screenshots/${name}.png` });
}
await browser.close();
console.log("screenshots written");
