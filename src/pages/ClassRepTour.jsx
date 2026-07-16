import { useState, useEffect } from 'react';
import { Tour, Modal, Button } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

/**
 * ClassRepTour – page-aware guided tour for class_representative users.
 *
 * Behaviour:
 *  - Auto-prompt modal shows ONCE EVER (on very first app load for this user).
 *    After the user clicks "Start tour" or "Nej tak", it is never shown again.
 *    ONE key in localStorage: classRepTourEverSeen
 *  - The green Guide button is always visible on pages that have a tour.
 *    Clicking it starts the tour for the current page at any time.
 */
const TOUR_SEEN_KEY = 'classRepTourEverSeen'; // single global key, set once, never cleared

// Clean up any old per-page keys left from previous versions
const OLD_KEY_PREFIXES = ['classRepTourShown_', 'classRepTourDate_', 'classRepTourPromptDate', 'classRepTourPromptShown'];
const cleanupOldKeys = () => {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (OLD_KEY_PREFIXES.some(prefix => key?.startsWith(prefix))) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(key => localStorage.removeItem(key));
};

const ClassRepTour = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Only render for class reps
  if (!user || user.role !== 'class_representative') return null;

  const location = useLocation();
  const [tourOpen, setTourOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // ─── Tour steps per route ─────────────────────────────────────────────────
  const PAGE_TOURS = {
    '/my-class': {
      promptTitle: 'Velkommen til ClothConfig!',
      promptDesc:
        'Vi viser dig, hvordan du opsætter din klasse, uploader design og deler registreringslinket. Du kan altid starte guiden igen via Guide-knappen.',
      steps: [
        {
          title: 'Elevantal & registreringslink',
          description:
            'Angiv det forventede antal elever i klassen. Fragtomkostningerne fordeles automatisk ligeligt mellem alle elever. Når rygdesignet er godkendt, kan du generere et unikt registreringslink og dele det med dine klassekammerater, så de kan designe deres eget studieturstøj.',
          target: () => document.getElementById('tour-students-card'),
        },
        {
          title: 'Studietur & rygdesign',
          description:
            'Vælg destinationen for jeres studietur. Du kan vælge et færdigt rygdesign fra biblioteket eller uploade dit eget design for et mere personligt udtryk.',
          target: () => document.getElementById('tour-studietur-card'),
        },
        {
          title: 'Levering',
          description:
            'Vælg, om hele klassens ordre skal leveres samlet til skolen eller en anden fælles adresse. Du kan vælge mellem Standardlevering og Ekspreslevering, og fragtomkostningerne fordeles automatisk mellem alle elever.',
          target: () => document.getElementById('tour-delivery-card'),
        },
        {
          title: 'Upload rygdesign',
          description:
            'Upload dit rygdesign i en sort eller hvid variant – eller begge dele. Vores team gennemgår og godkender designet, før det bliver gjort tilgængeligt for klassen.',
          target: () => document.getElementById('tour-backdesign-card'),
        },
        {
          title: 'Upload skolelogo',
          description:
            'Upload et skolelogo i høj kvalitet til brug på klassens studieturstøj. Vores team gennemgår og godkender logoet, før det bliver gjort tilgængeligt for alle elever.',
          target: () => document.getElementById('tour-upload-logo-card'),
        },
        {
          title: 'Godkendelsesstatus',
          description:
            'Følg status på jeres rygdesign og skolelogo. Her kan du se, om de er under gennemgang, godkendt eller kræver ændringer, før de kan bruges på klassens studieturstøj.',
          target: () => document.getElementById('tour-status-card'),
        },
      ],
    },

    '/upload-files': {
      steps: [
        {
          title: 'Upload-siden',
          description:
            'Her administrerer du alle dine klasses logoer og rygdesigns. Du kan uploade nye filer og følge deres godkendelsesstatus.',
          target: () => document.getElementById('tour-upload-header'),
        },
        {
          title: 'Logoer & rygdesigns',
          description:
            'Skift mellem fanerne for skolelogoer og rygdesigns. Her kan du se alle uploadede filer og deres aktuelle status.',
          target: () => document.getElementById('tour-upload-tabs-card'),
        },
        {
          title: 'Upload filer',
          description:
            'Klik her for at uploade et nyt skolelogo eller rygdesign. Alle filer bliver gennemgået og godkendt, før de bliver tilgængelige for klassen.',
          target: () => document.getElementById('tour-add-btn'),
        },
      ],
    },

    '/back-design-configurator': {
      steps: [
        {
          title: 'Vælg rygdesign',
          description:
            'Vælg et rygdesign fra dine uploads eller fra studietur-biblioteket. Klik på et design for at åbne det i editoren.',
          target: () => document.getElementById('tour-config-gallery'),
        },
        {
          title: 'Navne',
          description:
            'Tilføj elevnavne manuelt eller vælg blandt de registrerede elever. Navnene kan flyttes og tilpasses direkte på designet.',
          target: () => document.getElementById('tour-config-gallery'),
        },
        {
          title: 'Designeditor',
          description:
            'Forhåndsvis rygdesignet med navne. Du kan flytte, placere og tilpasse elementerne, så designet ser præcis ud, som du ønsker.',
          target: () => document.getElementById('tour-config-canvas'),
        },
      ],
    },

    '/student-overview': {
      steps: [
        {
          title: 'Elevoversigt',
          description:
            'Få et komplet overblik over alle elever i klassen samt deres ordre- og betalingsstatus.',
          target: () => document.getElementById('tour-student-header'),
        },
        {
          title: 'Statusoversigt',
          description:
            'Kortene viser en hurtig oversigt over antal elever, gennemførte ordrer, afventende betalinger og elever uden ordre.',
          target: () => document.getElementById('tour-student-summary'),
        },
        {
          title: 'Elevliste',
          description:
            'Se alle elever med navn, e-mail, ordrestatus og betalingsstatus. Brug søgning til hurtigt at finde en elev, eller klik på øje-ikonet for flere detaljer.',
          target: () => document.getElementById('tour-student-table'),
        },
      ],
    },
  };
  const currentTour = PAGE_TOURS[location.pathname];
  const currentSteps = currentTour?.steps ?? [];

  // ─── One-time auto-prompt on very first load ──────────────────────────────

  useEffect(() => {
    // Clean up old per-page keys from previous versions
    cleanupOldKeys();

    const alreadySeen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!alreadySeen) {
      const timer = setTimeout(() => setShowPrompt(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []); // empty deps = runs once on mount only

  // ─── Close tour when navigating away ─────────────────────────────────────

  useEffect(() => {
    setTourOpen(false);
  }, [location.pathname]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStartTour = () => {
    if (!currentSteps.length) return;

    setTourOpen(false);

    requestAnimationFrame(() => {
      setTimeout(() => {
        setTourOpen(true);
      }, 100);
    });
  };
  const dismissPrompt = (startTour = false) => {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
    setShowPrompt(false);
    if (startTour) handleStartTour();
  };

  // Don't render on pages with no tour defined
  if (!currentTour) return null;

  return (
    <>
      {/* ── Green Guide button ── */}
      <Button
        onClick={handleStartTour}
        icon={<QuestionCircleOutlined />}
        style={{
          backgroundColor: '#049639ff',
          borderColor: '#049639ff',
          color: '#fff',
          borderRadius: 16,
          fontWeight: 600,
          paddingInline: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Guide
      </Button>

      {/* ── One-time welcome prompt ── */}
      <Modal
        title={currentTour?.promptTitle || 'Vil du have en hurtig rundvisning?'}
        open={showPrompt}
        okText="Ja, vis mig rundt"
        cancelText="Nej tak"
        onOk={() => dismissPrompt(true)}
        onCancel={() => dismissPrompt(false)}
      >
        <p>
          {currentTour?.promptDesc ||
            'Udforsk siden med en guidet tour. Du kan altid starte den igen via Guide-knappen.'}
        </p>
      </Modal>

      {/* ── Ant Design Tour ── */}
      <Tour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={currentSteps}
      />
    </>
  );
};

export default ClassRepTour;
