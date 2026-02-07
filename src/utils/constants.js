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

/** Base URL for API (without /api). Used to build uploads URL. */
export const getApiBase = () =>
    (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/** Full URL for an uploaded file path (e.g. uploads/school_logo/xxx.jpg). */
export const getUploadsUrl = (filePath) =>
    filePath ? `${getApiBase()}/${filePath.replace(/^\/+/, '')}` : '';
