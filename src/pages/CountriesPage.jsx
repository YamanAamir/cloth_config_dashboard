import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Modal,
    Form, Input, message, Popconfirm, Upload, Image, Empty, Select, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined, PictureOutlined } from '@ant-design/icons';
import {
    getAllCountries, createCountry, updateCountry, deleteCountry,
    uploadLibraryDesign, getLibraryDesigns
} from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title, Text } = Typography;

const CountriesPage = () => {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({ current: 1, limit: 10, total: 0, totalPages: 1, search: '' });

    // Designs per country (keyed by country id)
    const [designsMap, setDesignsMap] = useState({});
    const [loadingDesigns, setLoadingDesigns] = useState({});
    const [expandedRows, setExpandedRows] = useState([]);

    // Upload modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadForm] = Form.useForm();

    const fetchCountries = async () => {
        setLoading(true);
        try {
            const res = await getAllCountries({ page: pagination.current, limit: pagination.limit, search: pagination.search });
            const { total, page, limit, totalPages } = res.data.pagination || {};
            setCountries(res.data.data || []);
            setPagination(prev => ({ ...prev, total: total ?? 0, current: page ?? prev.current, limit: limit ?? prev.limit, totalPages: totalPages ?? 1 }));
        } catch { message.error('Failed to fetch countries'); }
        finally { setLoading(false); }
    };

    const fetchDesignsForCountry = async (countryId) => {
        if (designsMap[countryId]) return; // already loaded
        setLoadingDesigns(prev => ({ ...prev, [countryId]: true }));
        try {
            const res = await getLibraryDesigns({ country_id: countryId });
            setDesignsMap(prev => ({ ...prev, [countryId]: res.data.data || [] }));
        } catch { message.error('Failed to fetch designs'); }
        finally { setLoadingDesigns(prev => ({ ...prev, [countryId]: false })); }
    };

    useEffect(() => { fetchCountries(); }, []);
    useEffect(() => { fetchCountries(); }, [pagination.current, pagination.limit, pagination.search]);

    const handleSaveCountry = async (values) => {
        try {
            if (editingCountry) {
                await updateCountry(editingCountry.id, values);
                message.success('Country updated');
            } else {
                await createCountry(values);
                message.success('Country created');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingCountry(null);
            fetchCountries();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteCountry(id);
            message.success('Country deleted');
            fetchCountries();
        } catch { message.error('Delete failed'); }
    };

    const handleFileSelect = (file) => {
        if (!file.type.startsWith('image/')) { message.error('Select an image'); return false; }
        if (selectedPreview) URL.revokeObjectURL(selectedPreview);
        setSelectedFile(file);
        setSelectedPreview(URL.createObjectURL(file));
        return false;
    };

    const handleUploadDesign = async (values) => {
        if (!selectedFile) { message.error('Select a file'); return; }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('country_id', values.country_id);
            formData.append('design', selectedFile);
            await uploadLibraryDesign(formData);
            message.success('Design uploaded');
            setUploadModalOpen(false);
            uploadForm.resetFields();
            setSelectedFile(null);
            setSelectedPreview(null);
            // Refresh designs for that country
            setDesignsMap(prev => { const n = { ...prev }; delete n[values.country_id]; return n; });
            if (expandedRows.includes(values.country_id)) {
                fetchDesignsForCountry(values.country_id);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally { setUploading(false); }
    };

    // Expanded row: show designs grid
    const expandedRowRender = (record) => {
        const designs = designsMap[record.id] || [];
        const isLoading = loadingDesigns[record.id];
        return (
            <div style={{ padding: '12px 24px', background: '#fafafa', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>Library Designs — {record.name}</Text>
                    <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => { uploadForm.setFieldsValue({ country_id: record.id }); setUploadModalOpen(true); }}>
                        Upload Design
                    </Button>
                </div>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>Loading...</div>
                ) : designs.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No designs for this country" style={{ padding: 16 }} />
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {designs.map(d => (
                            <div key={d.id} style={{ width: 120, textAlign: 'center' }}>
                                <Image
                                    src={getUploadsUrl(d.file_path)}
                                    width={100} height={100}
                                    style={{ objectFit: 'contain', borderRadius: 6, border: '1px solid #f0f0f0', background: '#fff' }}
                                />
                                <Text ellipsis style={{ display: 'block', fontSize: 11, marginTop: 4 }}>{d.name}</Text>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const columns = [
        { title: 'Country', dataIndex: 'name', key: 'name', render: t => <Text strong>{t}</Text> },
        { title: 'Code', dataIndex: 'code', key: 'code', render: c => <Tag>{c}</Tag> },
        {
            title: 'Action', key: 'action', width: 100,
            render: (_, record) => (
                <Space>
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => { setEditingCountry(record); form.setFieldsValue(record); setIsModalOpen(true); }} />
                    <Popconfirm title="Delete country?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Study Trip Countries</Title>
                <Text type="secondary">Manage countries and their library designs — expand a row to view/upload designs</Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Countries</span>
                        <Space>
                            <Input.Search
                                placeholder="Search"
                                allowClear
                                style={{ width: 220 }}
                                onSearch={(v) => setPagination(prev => ({ ...prev, search: v, current: 1 }))}
                                onChange={(e) => { if (!e.target.value) setPagination(prev => ({ ...prev, search: '', current: 1 })); }}
                            />
                            <Button type="primary" icon={<PlusOutlined />} size="small"
                                onClick={() => { setEditingCountry(null); form.resetFields(); setIsModalOpen(true); }}>
                                Add Country
                            </Button>
                        </Space>
                    </div>
                }
            >
                <Table
                    columns={columns}
                    dataSource={countries}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    expandable={{
                        expandedRowRender,
                        expandedRowKeys: expandedRows,
                        onExpand: (expanded, record) => {
                            if (expanded) {
                                setExpandedRows(prev => [...prev, record.id]);
                                fetchDesignsForCountry(record.id);
                            } else {
                                setExpandedRows(prev => prev.filter(id => id !== record.id));
                            }
                        }
                    }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                        onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, limit: pageSize })),
                    }}
                />
            </Card>

            {/* Country Modal */}
            <Modal title={editingCountry ? 'Edit Country' : 'Add Country'} open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingCountry(null); }}
                footer={null} destroyOnHidden>
                <Form form={form} layout="vertical" onFinish={handleSaveCountry} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Country Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Italy" />
                    </Form.Item>
                    <Form.Item name="code" label="Country Code" rules={[{ required: true }]}>
                        <Input placeholder="e.g. IT" maxLength={5} />
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">{editingCountry ? 'Update' : 'Create'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Upload Design Modal */}
            <Modal title="Upload Library Design" open={uploadModalOpen}
                onCancel={() => { setUploadModalOpen(false); uploadForm.resetFields(); setSelectedFile(null); setSelectedPreview(null); }}
                footer={null} destroyOnHidden>
                <Form form={uploadForm} layout="vertical" onFinish={handleUploadDesign} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Design Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Rome Colosseum" />
                    </Form.Item>
                    <Form.Item name="country_id" label="Country" rules={[{ required: true }]}>
                        <Select placeholder="Select country" options={countries.map(c => ({ value: c.id, label: c.name }))} />
                    </Form.Item>
                    <Form.Item label="Design File" required>
                        <Upload beforeUpload={handleFileSelect} showUploadList={false} accept="image/*">
                            <Button type="dashed" icon={<InboxOutlined />} block style={{ height: 80 }}>
                                {selectedFile ? `✓ ${selectedFile.name}` : 'Click to select image'}
                            </Button>
                        </Upload>
                        {selectedPreview && <img src={selectedPreview} alt="preview" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }} />}
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setUploadModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={uploading}>Upload</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CountriesPage;
