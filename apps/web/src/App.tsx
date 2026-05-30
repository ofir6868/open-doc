import React, { useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TemplateList } from './pages/TemplateList';
import { UploadWizard } from './pages/UploadWizard';
import { fontDisplay } from './theme';

type View =
  | { page: 'list' }
  | { page: 'wizard' };

const useStyles = makeStyles({
  nav: {
    height: '60px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${tokens.spacingHorizontalXXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: {
    fontFamily: fontDisplay,
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    userSelect: 'none',
    lineHeight: 1,
  },
  brandAccent: { color: tokens.colorBrandForeground1 },
  tagline: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
});

export default function App() {
  const s = useStyles();
  const [view, setView] = useState<View>({ page: 'list' });

  return (
    <>
      <nav className={s.nav}>
        <span className={s.brand} onClick={() => setView({ page: 'list' })}>
          open<span className={s.brandAccent}>·</span>doc
        </span>
        <span className={s.tagline}>document templates</span>
      </nav>

      {view.page === 'list' && (
        <TemplateList onNew={() => setView({ page: 'wizard' })} />
      )}
      {view.page === 'wizard' && (
        <UploadWizard
          onDone={() => setView({ page: 'list' })}
          onBack={() => setView({ page: 'list' })}
        />
      )}
    </>
  );
}
