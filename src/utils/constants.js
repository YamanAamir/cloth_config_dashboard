export const EducationType = {
  STX: 'STX',
  HF: 'HF',
  HHX: 'HHX',
  HTX: 'HTX',
  EUD: 'EUD',
  EUX: 'EUX',
  Efterskole: 'Efterskole'
};

export const Role = {
  ADMIN: 'admin',
  SERVER_OWNER: 'server_owner',
  CLASS_REPRESENTATIVE: 'class_representative',
  STUDENT: 'student'
};

export const LogoStatus = {
  UPLOADED: 'uploaded',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const DesignStatus = {
  UPLOADED: 'uploaded',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const NameListStatus = {
  DRAFT: 'draft',
  READY: 'ready'
};

export const OrderStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

export const Status = {
  ACTIVE: 0,
  INACTIVE: 1,
  DELETED: 2
};

// Template Categories - Clean data structure without JSX
export const TEMPLATE_CATEGORIES = {
  marketing: {
    key: 'marketing',
    label: 'Marketing Templates',
    icon: 'MailOutlined',
    color: '#1890ff',
    description: 'Marketing and promotional email templates',
    templates: [
      { key: 'graduation_promo', label: 'Graduation Promotion', description: 'Promote graduation caps and products' },
      { key: 'welcome_intro', label: 'Welcome Introduction', description: 'Introduce new users to the platform' },
      { key: 'general_marketing', label: 'General Marketing', description: 'General promotional content' }
    ]
  },
  welcome: {
    key: 'welcome',
    label: 'Welcome Templates',
    icon: 'UserAddOutlined',
    color: '#52c41a',
    description: 'Welcome new users to the platform',
    templates: [
      { key: 'student_welcome', label: 'Student Welcome', description: 'Welcome new students to the platform' },
      { key: 'class_rep_welcome', label: 'Class Rep Welcome', description: 'Welcome new class representatives' },
      { key: 'admin_welcome', label: 'Admin Welcome', description: 'Welcome new admin users' }
    ]
  },
  guidance: {
    key: 'guidance',
    label: 'Guidance Templates',
    icon: 'FileTextOutlined',
    color: '#1890ff',
    description: 'Help users with instructions and guides',
    templates: [
      { key: 'how_to_order', label: 'How to Place Order', description: 'Step-by-step order placement guide' },
      { key: 'design_selection', label: 'Design Selection Guide', description: 'Help users choose designs' },
      { key: 'upload_instructions', label: 'Upload Instructions', description: 'File upload guidelines' }
    ]
  },
  transactional: {
    key: 'transactional',
    label: 'Transactional Templates',
    icon: 'ShoppingCartOutlined',
    color: '#722ed1',
    description: 'Order and payment related emails',
    templates: [
      { key: 'order_confirmation', label: 'Order Confirmation', description: 'Confirm order placement' },
      { key: 'payment_confirmation', label: 'Payment Confirmation', description: 'Confirm payment received' },
      { key: 'status_updates', label: 'Status Updates', description: 'Order status changes' }
    ]
  },
  reminder: {
    key: 'reminder',
    label: 'Reminder Templates',
    icon: 'ClockCircleOutlined',
    color: '#fa8c16',
    description: 'Remind users about important deadlines',
    templates: [
      { key: 'deadline_reminders', label: 'Deadline Reminders', description: 'Remind about upcoming deadlines' },
      { key: 'incomplete_order', label: 'Incomplete Order', description: 'Remind about incomplete orders' },
      { key: 'payment_pending', label: 'Payment Pending', description: 'Remind about pending payments' }
    ]
  },
  notification: {
    key: 'notification',
    label: 'Notification Templates',
    icon: 'BellOutlined',
    color: '#f5222d',
    description: 'System notifications and alerts',
    templates: [
      { key: 'admin_alerts', label: 'Admin Alerts', description: 'Important admin notifications' },
      { key: 'upload_notifications', label: 'Upload Notifications', description: 'File upload confirmations' },
      { key: 'system_reports', label: 'System Reports', description: 'Automated system reports' }
    ]
  }
};

/**
 * Base URL for API (without /api). Used to build uploads URL.
 */
export const getApiBase = () => 
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * Full URL for an uploaded file path (e.g. uploads/school_logo/xxx.jpg).
 */
export const getUploadsUrl = (filePath) => {
  if (!filePath) return '';
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${getApiBase()}/${normalizedPath}`;
};

/** Preview path for a back design record (configured export vs raw upload). */
export const getBackDesignDisplayPath = (design, color = 'white') => {
  if (!design) return '';
  
  if (color === 'black') {
    return design.configured_file_path_2 || design.file_path_2 || design.configured_file_path || design.file_path || '';
  }
  
  return design.configured_file_path || design.file_path || design.configured_file_path_2 || design.file_path_2 || '';
};

export const getBackDesignDisplayUrl = (design, color = 'white') =>
  getUploadsUrl(getBackDesignDisplayPath(design, color));

// ─── Danish Time Formatting (Europe/Copenhagen, UTC+1/UTC+2 DST) ─────────────

const DK_LOCALE = 'da-DK';
const DK_TZ    = 'Europe/Copenhagen';

/**
 * Format a timestamp as full Danish date + time.
 * e.g. "12. jun. 2026, 14:35:07"
 */
export const formatDanishDateTime = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(DK_LOCALE, {
      timeZone: DK_TZ,
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(d).replace(',', '');
  } catch {
    return '—';
  }
};

/**
 * Format a timestamp as Danish date only (EU format: DD.MM.YYYY).
 * e.g. "21.07.2026"
 */
export const formatDanishDate = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(DK_LOCALE, {
      timeZone: DK_TZ,
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format a timestamp as Danish time only (EU 24h format: HH:mm).
 * e.g. "16:30"
 */
export const formatDanishTime = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(DK_LOCALE, {
      timeZone: DK_TZ,
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '—';
  }
};
