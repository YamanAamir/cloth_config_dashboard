import api from './index';

// Auth APIs
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const sidebarMenus = (data) => api.get('/auth/sidebar-menus', data);
// School APIs
export const getAllSchools = () => api.get('/admin/schools');
export const createSchool = (data) => api.post('/admin/school/create', data);
export const updateSchool = (id, data) => api.put(`/admin/school/${id}/update`, data);
export const deleteSchool = (id) => api.delete(`/admin/school/${id}/delete`);
export const toggleSchoolStatus = (id, data) => api.patch(`/admin/school/${id}/toggle-status`, data);

// Class Representative APIs
export const getAllClassReps = () => api.get('/admin/class-reps');
export const createClassRep = (data) => api.post('/admin/class-rep/create', data);
export const updateClassRep = (id, data) => api.put(`/admin/class-rep/${id}/update`, data);
export const deleteClassRep = (id) => api.delete(`/admin/class-rep/${id}/delete`);
export const toggleClassRepStatus = (id, data) => api.patch(`/admin/class-rep/${id}/toggle-status`, data);

// Class APIs
export const getAllClasses = () => api.get('/admin/classes');
export const createClass = (data) => api.post('/admin/class/create', data);
export const updateClass = (id, data) => api.put(`/admin/class/${id}/update`, data);
export const deleteClass = (id) => api.delete(`/admin/class/${id}/delete`);
export const toggleClassStatus = (id, data) => api.patch(`/admin/class/${id}/toggle-status`, data);
export const assignClassRep = (data) => api.post('/admin/class/assign-rep', data);

// Logo & Design APIs
export const getAllLogos = () => api.get('/admin/logos');
export const updateLogoStatus = (id, data) => api.patch(`/admin/logo/${id}/status`, data);
export const getAllBackDesigns = () => api.get('/admin/back-designs');
export const updateBackDesignStatus = (id, data) => api.patch(`/admin/back-design/${id}/status`, data);

// Class Rep Specific APIs
export const getMyClass = () => api.get('/class-rep/get-class');
export const getStudents = () => api.get('/class-rep/students');
export const createStudent = (data) => api.post('/rep/student/create', data);
export const updateStudent = (id, data) => api.put(`/rep/student/${id}/update`, data);
export const deleteStudent = (id) => api.delete(`/rep/student/${id}/delete`);
export const uploadLogo = (data) => api.post('/rep/class/upload-logo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadBackDesign = (data) => api.post('/rep/class/upload-back-design', data, { headers: { 'Content-Type': 'multipart/form-data' } });