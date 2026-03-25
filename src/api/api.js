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

// Class APIs
export const getAllClasses = (params = {}) => api.post('/admin/classes', params);
export const getAllOrders = (params = {}) => api.get('/admin/orders/list', params);
export const createClass = (data) => api.post('/admin/class/create', data);
export const updateClass = (id, data) => api.put(`/admin/class/${id}/update`, data);
export const deleteClass = (id) => api.delete(`/admin/class/${id}/delete`);
export const toggleClassStatus = (id, data) => api.patch(`/admin/class/${id}/toggle-status`, data);
export const assignClassRep = (data) => api.post('/admin/class/assign-rep', data);

// Logo & Design APIs (admin)
export const getAllLogos = (params = {}) => api.post('/admin/logos', params);
export const approveLogo = (logoId, body = {}) => api.put(`/admin/approve-logo/${logoId}`, body);
export const rejectLogo = (logoId, body = {}) => api.put(`/admin/reject-logo/${logoId}`, body);
export const getAllBackDesigns = (params = {}) => api.post('/admin/back-designs', params);
export const approveBackDesign = (id) => api.put(`/admin/approve-back-design/${id}`);
export const rejectBackDesign = (id) => api.put(`/admin/reject-back-design/${id}`);

// Back Design Templates (Library) - Admin
export const getAllBackDesignTemplates = (params = {}) => api.post('/admin/back-design-templates', params);
export const uploadBackDesignTemplate = (formData) => apiFormdata.post('/admin/back-design-templates/upload', formData);
export const deleteBackDesignTemplate = (id) => api.delete(`/admin/back-design-templates/${id}`);
export const getClassBackDesign = (classId) => api.get(`/class-rep/class/${classId}/configurator-back-design`);

// Name List APIs (Admin)
export const getAllNameLists = (params = {}) => api.get('/admin/namelist/list', { params });
export const getClassNameListAdmin = (classId, params = {}) => api.get(`/admin/namelist/${classId}/class`, { params });
export const approveNameList = (id) => api.put(`/admin/namelist/${id}/approve`);
export const rejectNameList = (id) => api.put(`/admin/namelist/${id}/reject`);

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
export const getMyLogos = (params = {}) => api.post('/class-rep/my-logos', params);
export const getMyBackDesigns = (params = {}) => api.post('/class-rep/back-designs', params);
export const getConfiguratorBackDesign = () => api.get('/class-rep/configurator-back-design');
export const selectBackDesignForClass = (data) => api.post('/class-rep/select-back-design', data);

// Name List APIs (Class Rep)
export const getNameList = () => api.get('/class-rep/name-list');
export const createNameList = (data) => api.post('/class-rep/namelist/create', data);
export const addNameListItem = (nameListId, data) => api.post(`/class-rep/namelist/${nameListId}/item`, data);
export const updateNameListItem = (itemId, data) => api.put(`/class-rep/namelist/item/${itemId}`, data);
export const reorderNameListItems = (nameListId, items) => api.put(`/class-rep/namelist/reorder/${nameListId}`, { items });
export const markNameListReady = (nameListId) => api.put(`/class-rep/namelist/${nameListId}/ready`);
export const deleteNameListItem = (itemId) => api.delete(`/class-rep/namelist/item/${itemId}`);

// Order Details API
export const getOrderDetails = (orderId) => api.get(`/admin/orders/${orderId}/details`);
export const getOrderHistory = (orderId) => api.get(`/admin/orders/${orderId}/history`);
export const unlockOrder = (orderId) => api.put(`/admin/orders/${orderId}/unlock`);
export const lockOrder = (orderId) => api.put(`/admin/orders/${orderId}/lock`);
