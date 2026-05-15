import React from 'react';

/**
 * AppFooter — standard footer for most screens (game, nickname, hi-brainbee, admin).
 * AuthFooter — fixed-to-viewport footer specifically for the login screen,
 *              because its parent is position:fixed with overflow:hidden.
 */

const AppFooter = () => (
  <footer className="app-footer">
    <div className="app-footer-divider" />
    <p className="app-footer-institution">
      University of Science and Technology of Southern Philippines – Jasaan
    </p>
    <p className="app-footer-credit">Built by KCC Brainovators · 2026</p>
  </footer>
);

export const AuthFooter = () => (
  <footer className="auth-screen-footer">
    <div className="app-footer-divider" />
    <p className="app-footer-institution">
      University of Science and Technology of Southern Philippines – Jasaan
    </p>
    <p className="app-footer-credit">Built by KCC Brainovators · 2026</p>
  </footer>
);

export default AppFooter;