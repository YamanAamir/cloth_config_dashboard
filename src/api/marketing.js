import { api } from './index';

// Templates
export const getTemplates = () => api.get('/template/list');
export const createTemplate = (data) => api.post('/template/create', data);
export const updateTemplate = (id, data) => api.put(`/template/${id}/update`, data);
export const deleteTemplate = (id) => api.delete(`/template/${id}/delete`);

// Campaigns
export const getCampaigns = () => api.get('/campaign/list');
export const createCampaign = (data) => api.post('/campaign/create', data);
export const updateCampaign = (id, data) => api.put(`/campaign/${id}/update`, data);
export const deleteCampaign = (id) => api.delete(`/campaign/${id}/delete`);
export const sendCampaign = (id, data = {}) => api.post(`/campaign/${id}/send`, data);
