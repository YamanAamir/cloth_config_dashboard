import { api, apiFormdata } from './index';

// Auth APIs
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const sidebarMenus = (data) => api.get('/auth/sidebar-menus', data);
export const setUserPassword = (data) => api.post('/auth/set-password', data);
export const adminDashboard = (data) => api.get('/admin/dashboard', data);

// School APIs
export const getAllSchools = (params = {}) => api.post('/admin/schools', params);
export const createSchool = (data) => api.post('/admin/school/create', data);
export const updateSchool = (id, data) => api.put(`/admin/school/${id}/update`, data);
export const deleteSchool = (id) => api.delete(`/admin/school/${id}/delete`);
export const toggleSchoolStatus = (id, data) => api.patch(`/admin/school/${id}/toggle-status`, data);

// Class Representative APIs
export const getAllClassReps = (params = {}) => api.post('/admin/class-reps', params);
export const createClassRep = (data) => api.post('/admin/class-rep/create', data);
export const updateClassRep = (id, data) => api.put(`/admin/class-rep/${id}/update`, data);
export const deleteClassRep = (id) => api.delete(`/admin/class-rep/${id}/delete`);
export const toggleClassRepStatus = (id, data) => api.patch(`/admin/class-rep/${id}/toggle-status`, data);
export const resetUserPassword = (userId) => api.post(`/admin/user/${userId}/reset-password`);

// Class APIs
export const getAllClasses = (params = {}) => api.post('/admin/classes', params);
export const getAllOrders = (params = {}) => api.get('/admin/orders/list', params);
export const getClassStudents = (classId, params = {}) => api.post(`/admin/class/${classId}/students`, params);
export const getSchoolStats = (schoolId) => api.get(`/admin/school/${schoolId}/stats`);
export const getSchoolClasses = (schoolId, params = {}) => api.post(`/admin/school/${schoolId}/classes`, params);
export const getClassRep = (classId) => api.get(`/admin/class/${classId}/rep`);
export const createClass = (data) => api.post('/admin/class/create', data);
export const updateClass = (id, data) => api.put(`/admin/class/${id}/update`, data);
export const deleteClass = (id) => api.delete(`/admin/class/${id}/delete`);
export const toggleClassStatus = (id, data) => api.patch(`/admin/class/${id}/toggle-status`, data);
export const assignClassRep = (data) => api.post('/admin/class/assign-rep', data);
// Education Program APIs (admin)
export const getEducationPrograms = (params = {}) => api.get('/admin/education-programs', params);
export const createEducationProgram = (data) => api.post('/admin/education-program/create', data);
export const updateEducationProgram = (id, data) => api.put(`/admin/education-program/${id}/update`, data);
export const deleteEducationProgram = (id) => api.delete(`/admin/education-program/${id}/delete`);

// Student Count APIs
export const setExpectedStudentCount = (classId, data) => api.put(`/admin/class/${classId}/expected-students`, data);
export const getClassStudentCount = (classId) => api.get(`/admin/class/${classId}/student-count`);
export const setClassRepExpectedStudentCount = (classId, data) => api.put(`/class-rep/class/${classId}/expected-students`, data);
export const getClassRepStudentCount = (classId) => api.get(`/class-rep/class/${classId}/student-count`);
export const getClassRepDelivery = (classId) => api.get(`/class-rep/class/${classId}/delivery`);
export const getStudentClassDelivery = (classId) => api.get(`/student/class/${classId}/delivery`);
export const updateClassRepDelivery = (classId, data) => api.put(`/class-rep/class/${classId}/delivery`, { delivery_details: data });
export const getAllClassesWithStudentCount = (params = {}) => api.post('/admin/classes-with-student-count', params);

// Logo & Design APIs (admin)
export const getAllLogos = (params = {}) => api.post('/admin/logos', params);
export const approveLogo = (logoId, body = {}) => api.put(`/admin/approve-logo/${logoId}`, body);
export const rejectLogo = (logoId, body = {}) => api.put(`/admin/reject-logo/${logoId}`, body);
export const adminDeleteLogo = (logoId) => api.delete(`/admin/logo/${logoId}/delete`);
export const adminPermanentDeleteLogo = (logoId) => api.delete(`/admin/logo/${logoId}/permanent-delete`, { data: { confirm: "DELETE" } });
export const getAllBackDesigns = (params = {}) => api.post('/admin/back-designs', params);
export const approveBackDesign = (id) => api.put(`/admin/approve-back-design/${id}`);
export const rejectBackDesign = (id, body = {}) => api.put(`/admin/reject-back-design/${id}`, body);
export const adminDeleteBackDesign = (designId) => api.delete(`/admin/back-design/${designId}/delete`);
export const adminPermanentDeleteBackDesign = (designId) => api.delete(`/admin/back-design/${designId}/permanent-delete`, { data: { confirm: "DELETE" } });

export const adminUploadLogo = (formData) => apiFormdata.post('/admin/logo/upload', formData);
export const adminUploadBackDesign = (formData) => apiFormdata.post('/admin/back-design/upload', formData);
export const adminEditBackDesign = (designId, formData) => apiFormdata.put(`/admin/back-design/${designId}/edit`, formData);
export const uploadSchoolLogo = (formData) => apiFormdata.post('/admin/upload-logo', formData);
export const uploadClassBackDesign = (formData) => apiFormdata.post('/admin/upload-back-design', formData);
export const reUploadClassBackDesign = (id, formData) => apiFormdata.post(`/admin/upload-back-design/${id}`, formData);
export const getAllBackDesignTemplates = (params = {}) => api.post('/admin/back-design-templates', params);
export const uploadBackDesignTemplate = (formData) => apiFormdata.post('/admin/back-design-templates/upload', formData);
export const deleteBackDesignTemplate = (id) => api.delete(`/admin/back-design-templates/${id}`);
export const getClassBackDesign = (classId) => api.get(`/class-rep/class/${classId}/configurator-back-design`);

// Name List APIs (Admin)
export const getAllNameLists = (params = {}) => api.get('/admin/namelist/list', { params });
export const getClassNameListAdmin = (classId, params = {}) => api.get(`/admin/namelist/${classId}/class`, { params });
export const approveNameList = (id) => api.put(`/admin/namelist/${id}/approve`);
export const rejectNameList = (id) => api.put(`/admin/namelist/${id}/reject`);
export const unlockNameList = (id) => api.put(`/admin/namelist/${id}/unlock`);

// Class Rep Specific APIs
export const getMyClass = () => api.get('/class-rep/get-class');
export const getStudents = (params = {}) => api.post('/class-rep/students', params);
export const generateRegistrationLink = () => api.get('/class-rep/generate-registration-link');
export const createStudent = (data) => api.post('/rep/student/create', data);
export const updateStudent = (id, data) => api.put(`/rep/student/${id}/update`, data);
export const deleteStudent = (id) => api.delete(`/rep/student/${id}/delete`);
export const uploadLogo = (formData) => apiFormdata.post('/class-rep/upload-logo', formData);
export const uploadBackDesign = (formData) => apiFormdata.post('/class-rep/upload-back-design', formData);
export const updateBackDesign = (id, formData) => apiFormdata.post(`/class-rep/upload-back-design/${id}`, formData);
export const editMyBackDesign = (designId, formData) => apiFormdata.put(`/class-rep/back-design/${designId}/edit`, formData);
export const deleteLogo = (id) => api.delete(`/class-rep/logo/${id}/delete`);
export const deleteMyBackDesign = (id) => api.delete(`/class-rep/back-design/${id}/delete`);
export const getMyLogos = (params = {}) => api.post('/class-rep/my-logos', params);
export const getMyBackDesigns = (params = {}) => api.post('/class-rep/back-designs', params);
export const getConfiguratorBackDesign = () => api.get('/class-rep/configurator-back-design');
export const saveConfiguratorState = (data) => api.post('/class-rep/configurator/save-state', data);
export const loadConfiguratorState = () => api.get('/class-rep/configurator/load-state');
export const selectBackDesignForClass = (data) => api.post('/class-rep/select-back-design', data);

// Name List APIs (Class Rep)
export const getNameList = () => api.get('/class-rep/name-list');
export const createNameList = (data) => api.post('/class-rep/namelist/create', data);
export const addNameListItem = (nameListId, data) => api.post(`/class-rep/namelist/${nameListId}/item`, data);
export const updateNameListItem = (itemId, data) => api.put(`/class-rep/namelist/item/${itemId}`, data);
export const reorderNameListItems = (nameListId, items) => api.put(`/class-rep/namelist/reorder/${nameListId}`, { items });
export const markNameListReady = (nameListId) => api.put(`/class-rep/namelist/${nameListId}/ready`);
export const deleteNameListItem = (itemId) => api.delete(`/class-rep/namelist/item/${itemId}`);

// Font APIs (Admin)
export const getAdminFonts = (params = {}) => api.post('/admin/fonts', params);
export const createFont = (data) => api.post('/admin/font/create', data);
export const updateFont = (id, data) => api.put(`/admin/font/${id}/update`, data);
export const deleteFont = (id) => api.delete(`/admin/font/${id}/delete`);
export const permanentDeleteFont = (id) => api.delete(`/admin/font/${id}/permanent-delete`, { data: { confirm: "DELETE" } });
export const toggleFontStatus = (id) => api.put(`/admin/font/${id}/toggle-status`);

// Student APIs (Admin)
export const adminGetStudents = (params = {}) => api.post('/admin/students', params);
export const adminGetStudentDetails = (id) => api.get(`/admin/student/${id}/details`);
export const adminDeleteStudent = (id) => api.delete(`/admin/student/${id}/delete`);
export const adminPermanentDeleteStudent = (id) => api.delete(`/admin/student/${id}/permanent-delete`, { data: { confirm: "DELETE" } });

// Student APIs (Class Rep)
export const crGetStudentDetails = (id) => api.get(`/class-rep/student/${id}/details`);
export const crDeleteStudent = (id) => api.delete(`/class-rep/student/${id}/delete`);

// Font APIs (Class Rep)
export const getClassRepFonts = () => api.get('/class-rep/fonts');

export const getAllCountries = (params = {}) => api.post('/admin/countries', params);
export const createCountry = (data) => api.post('/admin/country/create', data);
export const updateCountry = (id, data) => api.put(`/admin/country/${id}/update`, data);
export const deleteCountry = (id) => api.delete(`/admin/country/${id}/delete`);
export const toggleCountryStatus = (id) => api.put(`/admin/country/${id}/toggle-status`);
export const permanentDeleteCountry = (id) => api.delete(`/admin/country/${id}/permanent-delete`, { data: { confirm: "DELETE" } });

// Shipping Rates APIs (Admin)
export const getShippingRates = () => api.get('/admin/shipping-rates');
export const getShippingRate = (id) => api.get(`/admin/shipping-rate/${id}`);
export const createShippingRate = (data) => api.post('/admin/shipping-rate/create', data);
export const updateShippingRate = (id, data) => api.put(`/admin/shipping-rate/${id}/update`, data);
export const deleteShippingRate = (id) => api.delete(`/admin/shipping-rate/${id}/delete`);
export const toggleShippingRateStatus = (id) => api.put(`/admin/shipping-rate/${id}/toggle-status`);

export const getClassRepShippingRates = () => api.get('/class-rep/shipping-rates');
// Library Design APIs (Admin)
export const uploadLibraryDesign = (formData) => apiFormdata.post('/admin/library-design/upload', formData);
export const getLibraryDesigns = (params = {}) => api.get('/admin/library-designs', { params });
export const updateLibraryDesign = (id, data) => api.patch(`/admin/library-design/${id}`, data);
export const deleteLibraryDesign = (id) => api.delete(`/admin/library-design/${id}/delete`);

// Class Rep - Study Trip
export const getStudyTripCountries = () => api.get('/class-rep/study-trip-countries');
export const setStudyTripCountry = (data) => api.put('/class-rep/set-study-trip-country', data);
export const getClassRepLibraryDesigns = () => api.get('/class-rep/library-designs');
export const getOrderDetails = (orderId) => api.get(`/admin/orders/${orderId}/details`);
export const getOrderHistory = (orderId) => api.get(`/admin/orders/${orderId}/history`);
export const unlockOrder = (orderId) => api.put(`/admin/orders/${orderId}/unlock`);
export const lockOrder = (orderId) => api.put(`/admin/orders/${orderId}/lock`);
export const lockClass = (classId) => api.put(`/admin/lock-class/${classId}`);
export const unlockClass = (classId) => api.put(`/admin/unlock-class/${classId}`);
export const sendDeadlineReminder = (classId) => api.post(`/admin/class/${classId}/send-deadline-reminder`);
export const sendStatusEmail = (classId) => api.post(`/admin/class/${classId}/send-status-email`);
export const sendFollowupEmail = (classId) => api.post(`/admin/class/${classId}/send-followup-email`);

// Notification settings
export const getNotificationSettings = () => api.get('/admin/notification-settings');
export const updateNotificationSettings = (settings) => api.put('/admin/notification-settings', settings);
export const testNotificationEmail = (email) => api.post('/admin/test-notification-email', { email });
export const updateClassProcessStatus = (classId, data) => api.put(`/admin/class/${classId}/process-status`, data);
export const generateProductionFiles = (classId) => api.post(`/admin/generate-files/${classId}`);
export const getProductionPackages = () => api.post('/admin/production-packages');

// Email Template APIs (Admin) - CORRECTED
export const getEmailTemplates = (params = {}) => api.get('/templates/list', { params });
export const getEmailTemplate = (id) => api.get(`/templates/${id}`);
export const createEmailTemplate = (data) => api.post('/templates/create', data);
export const updateEmailTemplate = (id, data) => api.put(`/templates/${id}/update`, data);
export const deleteEmailTemplate = (id) => api.delete(`/templates/${id}/delete`);
export const toggleEmailTemplateStatus = (id, data) => api.patch(`/templates/${id}/toggle-status`, data);

// Email Automation APIs - CORRECTED
export const getAutomationTemplates = (params = {}) => api.get('/templates/automation/list', { params });
export const updateEmailAutomation = (templateId, data) => api.put(`/templates/${templateId}/automation`, data);
export const sendTestEmail = (templateId, data) => api.post(`/templates/${templateId}/test-send`, data);
export const getTemplateCategories = (params = {}) => api.get('/templates/categories/stats', { params });

// Campaign APIs (Admin) - CORRECTED
export const getCampaigns = (params = {}) => api.get('/campaigns/list', { params });
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post('/campaigns/create', data);
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}/update`, data);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}/delete`);
export const sendCampaign = (id, data) => api.post(`/campaigns/${id}/send`, data);
export const sendCampaignToUser = (id, data) => api.post(`/campaigns/${id}/send-to-user`, data);

// Legacy Template APIs (for backward compatibility)
export const getTemplates = (params = {}) => api.get('/templates/list', { params });
export const getTemplate = (id) => api.get(`/templates/${id}`);
export const createTemplate = (data) => api.post('/templates/create', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}/update`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}/delete`);

// Contact APIs
export const sendContactInquiry = (data) => api.post('/contact/inquiry', data);

// Support Ticket APIs (Class Rep)
export const submitSupportTicket = (data) => api.post('/class-rep/support/submit', data);
export const getMyTickets = () => api.get('/class-rep/support/my-tickets');
export const getTicketMessages = (ticketId) => api.get(`/class-rep/support/ticket/${ticketId}`);
export const rateSupportTicket = (ticketId, rating) => api.patch(`/class-rep/support/ticket/${ticketId}/rating`, { rating });

// Support Ticket APIs (Admin)
export const adminGetAllTickets = (params = {}) => api.get('/admin/support/tickets', { params });
export const adminGetTicketMessages = (ticketId) => api.get(`/admin/support/ticket/${ticketId}`);
export const getRatingSummary = () => api.get('/admin/support/rating-summary');
export const adminCloseTicket = (ticketId) => api.patch(`/admin/support/${ticketId}/close`);