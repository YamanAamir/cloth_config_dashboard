import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Table, Modal, Form, Input,
    Select, Space, Popconfirm, message, Tooltip, Tag, Badge
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    EyeOutlined, CopyOutlined
} from '@ant-design/icons';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORIES = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS = {
    marketing: 'green', transactional: 'blue',
    reminder: 'orange', welcome: 'purple', other: 'default',
};

const CreateTemplatePage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => { fetchTemplates(); }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await getTemplates();
            setTemplates(res.data?.data || res.data || []);
        } catch { message.error('Failed to load templates'); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            name: record.name,
            subject: record.subject,
            category: record.category,
            html_body: record.html_body || record.body,
        });
        setModalOpen(true);
    };

    const openPreview = (record) => {
        setPreviewHtml(record.html_body || record.body || '');
        setPreviewOpen(true);
    };

    const handleDuplicate = (record) => {
        setEditingId(null);
        form.setFieldsValue({
            name: `${record.name} (Copy)`,
            subject: record.subject,
            category: record.category,
            html_body: record.html_body || record.body,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editingId) {
                await updateTemplate(editingId, values);
                message.success('Template updated');
            } else {
                await createTemplate(values);
                message.success('Template created');
            }
            setModalOpen(false);
            fetchTemplates();
        } catch (err) {
            if (err?.response?.data?.message) message.error(err.response.data.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteTemplate(id);
            message.success('Template deleted');
            fetchTemplates();
        } catch { message.error('Delete failed'); }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (t) => <Text strong>{t}</Text>,
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            ellipsis: true,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (c) => <Tag color={CATEGORY_COLORS[c] || 'default'}>{c || 'other'}</Tag>,
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (d) => d ? new Date(d).toLocaleDateString() : '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Preview">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)} />
                    </Tooltip>
                    <Tooltip title="Duplicate">
                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(record)} />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Popconfirm title="Delete this template?" onConfirm={() => handleDelete(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Email Templates</Title>
                    <Text type="secondary">Create reusable HTML email templates for campaigns</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size="large">
                    New Template
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={templates}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No templates yet.' }}
                />
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                title={editingId ? 'Edit Template' : 'New Email Template'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                okText={editingId ? 'Update' : 'Create'}
                width={860}
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Space style={{ width: '100%' }} size={16}>
                        <Form.Item label="Template Name" name="name" rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="e.g. Graduation Cap Promo" />
                        </Form.Item>
                        <Form.Item label="Category" name="category" rules={[{ required: true }]} style={{ width: 180, marginBottom: 0 }}>
                            <Select placeholder="Select category">
                                {CATEGORIES.map(c => (
                                    <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Space>

                    <Form.Item label="Email Subject" name="subject" rules={[{ required: true }]} style={{ marginTop: 16 }}>
                        <Input placeholder="Subject line shown to recipients..." />
                    </Form.Item>

                    <Form.Item
                        label="HTML Body"
                        name="html_body"
                        rules={[{ required: true }]}
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Supports {'{{name}}'}, {'{{class}}'}, {'{{school}}'} placeholders</Text>}
                    >
                        <TextArea
                            rows={14}
                            placeholder="Paste or write your HTML email here..."
                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Preview Modal */}
            <Modal
                title="Template Preview"
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={<Button onClick={() => setPreviewOpen(false)}>Close</Button>}
                width={700}
            >
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                    <iframe
                        srcDoc={previewHtml}
                        style={{ width: '100%', height: 520, border: 'none' }}
                        title="Template Preview"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CreateTemplatePage;
