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
        'Vi viser dig hurtigt rundt på siden. Du kan altid starte guiden igen via Guide-knappen øverst.',
      steps: [
        {
          title: 'Elever',
          description:
            'Del registreringslinket med dine klassekammerater og hold styr på, hvor mange der har tilmeldt sig. Du kan også angive forventet elevantal.',
          target: () => document.getElementById('tour-students-card'),
        },
        {
          title: 'Studietur',
          description:
            'Vælg destinationsland for jeres studietur. Dette bruges til at vise relevante landelogoer og designs.',
          target: () => document.getElementById('tour-studietur-card'),
        },
        {
          title: 'Levering',
          description:
            'Her kan du vælge at alle skal have levering til en fælles adresse.',
          target: () => document.getElementById('tour-delivery-card'),
        },
        {
          title: 'Bagdesign',
          description:
            'Upload både den sorte og den hvide variant af dit klassebagsidedesign. Admin gennemgår og godkender det inden brug.',
          target: () => document.getElementById('tour-backdesign-card'),
        },
        {
          title: 'Upload logo',
          description:
            'Upload et klasselogo i høj kvalitet til brug på dimissionsgenstande. Admin gennemgår og godkender det inden brug.',
          target: () => document.getElementById('tour-upload-logo-card'),
        },
        {
          title: 'Aktuel status',
          description:
            'Se den aktuelle godkendelsesstatus på dit bagdesign og seneste logo – om de er godkendt, under gennemgang eller kræver ændringer.',
          target: () => document.getElementById('tour-status-card'),
        },

      ],
    },

    '/upload-files': {
      steps: [
        {
          title: 'Upload-siden',
          description:
            'Her administrerer du alle dine klasses logoer og bagdesigns. Du kan uploade nye filer og se status på eksisterende.',
          target: () => document.getElementById('tour-upload-header'),
        },
        {
          title: 'Logoer & Bagdesigns faner',
          description:
            'Skift mellem "Logos"-fanen for klasselogoer og "Back Designs"-fanen for bagdesigns. Tæller viser antal filer pr. kategori.',
          target: () => document.getElementById('tour-upload-tabs-card'),
        },
        {
          title: 'Upload-knap',
          description:
            'Klik her for at uploade et nyt logo eller bagdesign. Filen gennemgås af admin inden godkendelse. Status vises som Pending, Approved eller Rejected.',
          target: () => document.getElementById('tour-add-btn'),
        },
      ],
    },

    '/back-design-configurator': {
      steps: [
        {
          title: 'Vælg basisbillede',
          description:
            'Vælg et bagdesign fra dine egne uploads eller fra studietur-biblioteket. Klik på et design for at indlæse det på lærredet.',
          target: () => document.getElementById('tour-config-gallery'),
        },
        {
          title: 'Navne panel',
          description:
            'Tilføj elevnavne manuelt eller vælg fra registrerede elever. Navnene vises direkte på lærredet og kan flyttes og skaleres.',
          target: () => document.getElementById('tour-config-gallery'),
        },
        {
          title: 'Design-lærred',
          description:
            'Det interaktive lærred viser bagdesignet med navne. Du kan skifte mellem lys og mørk trøje-farve. Træk navne for at placere dem præcist.',
          target: () => document.getElementById('tour-config-canvas'),
        },
      ],
    },

    '/student-overview': {
      steps: [
        {
          title: 'Elevers oversigt',
          description:
            'Siden giver dig et komplet overblik over alle elever i din klasse, deres ordrestatus og betalingsstatus.',
          target: () => document.getElementById('tour-student-header'),
        },
        {
          title: 'Status-opsummering',
          description:
            'Disse kort viser en hurtig opsummering: antal elever, gennemførte ordrer, igangværende, der afventer betaling, og elever uden ordre.',
          target: () => document.getElementById('tour-student-summary'),
        },
        {
          title: 'Elevtabel',
          description:
            'Se alle elever med navn, e-mail, ordrestatus og betalingsoverblik. Brug søgefeltet til at finde en bestemt elev. Klik på øje-ikonet for detaljerede ordreoplysninger.',
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
