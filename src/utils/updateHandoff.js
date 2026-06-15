export const handOffUpdateToLauncher = () => {
  document.title = "Updating TexTradeOS";
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;background:#f8fafc;font-family:Segoe UI,sans-serif;color:#334155">
      <section style="max-width:440px;padding:32px;text-align:center">
        <h1 style="margin:0 0 12px;font-size:24px;color:#0f5a5a">Updating TexTradeOS</h1>
        <p style="margin:0;line-height:1.6">This window can be closed. TexTradeOS will reopen automatically when the update is ready.</p>
      </section>
    </main>
  `;

  window.setTimeout(() => {
    window.open("", "_self");
    window.close();
  }, 250);
};
