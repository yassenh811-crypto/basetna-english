/* ============================================================
   🦶 Footer
   ============================================================ */
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p className="footer-brand"><strong>بسّطنا الإنجليزي</strong></p>
        <p>بإشراف مس. شيرهان علي</p>
        <p className="footer-copy">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
      </div>
    </footer>
  );
}

export default Footer;