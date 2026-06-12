import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Table, Modal, Form, Input, Select,
    Space, Tag, Popconfirm, message, Tooltip, Divider, Alert, Badge
} from 'antd';
import {
    PlusOutlined, SendOutlined, EditOutlined, DeleteOutlined,
    MailOutlined, EyeOutlined, TeamOutlined, GlobalOutlined,
    UserAddOutlined, FileTextOutlined, ShoppingCartOutlined,
    ClockCircleOutlined, BellOutlined
} from '@ant-design/icons';
import {
    getCampaigns, createCampaign, updateCampaign,
    deleteCampaign, sendCampaign, getAllClasses, getAllSchools, getEmailTemplates
} from '../api/api';
import { TEMPLATE_CATEGORIES, formatDanishDateTime, formatDanishDate } from '../utils/constants';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TARGET_TYPES = [
    { value: 'all', label: 'All Users', icon: <GlobalOutlined /> },
    { value: 'class', label: 'Specific Class', icon: <TeamOutlined /> },
    { value: 'school', label: 'Specific School', icon: <TeamOutlined /> },
    { value: 'role', label: 'By Role', icon: <TeamOutlined /> },
];

const ROLES = [
    { value: 'class_representative', label: 'Class Representatives' },
    { value: 'student', label: 'Students' },
];

const STATUS_COLORS = { draft: 'default', sent: 'success', failed: 'error' };

// Simple HTML email templates
const EMAIL_TEMPLATES = [
    {
        key: 'graduation_caps',
        label: 'Graduation Caps Promo',
        subject: 'Your graduation cap awaits — exclusive offer inside',
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
  <div style="background:#00b96b;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🎓 Graduation Caps</h1>
  </div>
  <div style="padding:24px;border:1px solid #f0f0f0;border-top:none;border-radius:0 0 8px 8px;">
    <p style="font-size:16px;">Hi {{name}},</p>
    <p>You recently ordered your class clothing — now it's time to complete the look with a <strong>custom graduation cap</strong>.</p>
    <p>We offer fully personalized graduation caps to match your class style. Don't miss out!</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="#" style="background:#00b96b;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
        Explore Graduation Caps
      </a>
    </div>
    <p style="color:#999;font-size:12px;">You're receiving this because you ordered class clothing with us.</p>
  </div>
</div>`,
    },
    {
        key: 'follow_up',
        label: 'Follow-up / Re-engagement',
        subject: 'We miss you — complete your graduation look',
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
  <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">👋 Hey {{name}}!</h1>
  </div>
  <div style="padding:24px;border:1px solid #f0f0f0;border-top:none;border-radius:0 0 8px 8px;">
    <p style="font-size:16px;">It's been a while since we heard from you.</p>
    <p>Your classmates are already ordering their graduation caps — make sure you don't miss out on the group order!</p>
    <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0;">
      <strong>Why choose us?</strong>
      <ul style="margin:8px 0;padding-left:20px;">
        <li>Custom designs matching your class clothing</li>
        <li>Group discounts available</li>
        <li>Fast delivery</li>
      </ul>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="#" style="background:#1a1a2e;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;">
        Order Now
      </a>
    </div>
  </div>
</div>`,
    },
    {
        key: 'blank',
        label: 'Blank (Custom HTML)',
        subject: '',
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p>Hi {{name}},</p>
  <p>Your message here...</p>
</div>`,
    },
];

const CampaignPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [sending, setSending] = useState(null);
    const [classes, setClasses] = useState([]);
    const [schools, setSchools] = useState([]);
    const [automatedTemplates, setAutomatedTemplates] = useState({});
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [form] = Form.useForm();
    const targetType = Form.useWatch('target_type', form);

    useEffect(() => {
        fetchCampaigns();
        fetchTargets();
        loadAutomatedTemplates();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await getCampaigns();
            setCampaigns(res.data?.data || res.data || []);
        } catch { message.error('Failed to load campaigns'); }
        finally { setLoading(false); }
    };

    const fetchTargets = async () => {
        try {
            const [classRes, schoolRes] = await Promise.all([
                getAllClasses({ limit: 200 }),
                getAllSchools({ limit: 200 })
            ]);
            setClasses(classRes.data?.data || []);
            setSchools(schoolRes.data?.data || []);
        } catch { /* silent */ }
    };

    const loadAutomatedTemplates = async () => {
        try {
            // Load all templates (not just automated since your templates have is_automated: false)
            const response = await getEmailTemplates();
            
            // Handle different response structures
            let templates = [];
            if (response.data) {
                if (Array.isArray(response.data)) {
                    templates = response.data;
                } else if (response.data.templates && Array.isArray(response.data.templates)) {
                    templates = response.data.templates;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    templates = response.data.data;
                }
            }

            // Group templates by category
            const groupedTemplates = {};
            Object.keys(TEMPLATE_CATEGORIES).forEach(categoryKey => {
                groupedTemplates[categoryKey] = templates.filter(t => t.category === categoryKey);
            });

            setAutomatedTemplates(groupedTemplates);
        } catch (error) {
            console.error('Failed to load automated templates:', error);
            // Fallback to empty structure for development
            const emptyTemplates = {};
            Object.keys(TEMPLATE_CATEGORIES).forEach(categoryKey => {
                emptyTemplates[categoryKey] = [];
            });
            setAutomatedTemplates(emptyTemplates);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setSelectedTemplate(null);
        form.resetFields();
        form.setFieldsValue({ target_type: 'all' });
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditingId(record.id);
        setSelectedTemplate(null);
        form.setFieldsValue({
            title: record.title,
            subject: record.subject,
            body: record.html_body,   // API returns html_body
            target_type: record.target_type,
            target_id: record.target_id,
        });
        setModalOpen(true);
    };

    const applyTemplate = (templateId) => {
        if (!templateId) {
            setSelectedTemplate(null);
            return;
        }

        // Check local templates first
        const local = EMAIL_TEMPLATES.find(t => t.key === templateId);
        if (local) { 
            form.setFieldsValue({ subject: local.subject, body: local.body });
            setSelectedTemplate(local);
            return; 
        }

        // Check automated templates from all categories
        let foundTemplate = null;
        Object.values(automatedTemplates).forEach(categoryTemplates => {
            const template = categoryTemplates.find(t => String(t.id) === String(templateId));
            if (template) {
                foundTemplate = template;
            }
        });

        if (foundTemplate) {
            form.setFieldsValue({ 
                subject: foundTemplate.subject, 
                body: foundTemplate.html_body || foundTemplate.body 
            });
            setSelectedTemplate(foundTemplate);
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            // Include template information if selected
            const campaignData = {
                ...values,
                template_id: selectedTemplate?.id || null,
                template_name: selectedTemplate?.name || selectedTemplate?.label || null
            };
            
            if (editingId) {
                await updateCampaign(editingId, campaignData);
                message.success('Campaign updated successfully');
            } else {
                await createCampaign(campaignData);
                message.success('Campaign created successfully');
            }
            setModalOpen(false);
            setSelectedTemplate(null);
            fetchCampaigns();
        } catch (err) {
            if (err?.response?.data?.message) {
                message.error(err.response.data.message);
            } else {
                message.error('Failed to save campaign');
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteCampaign(id);
            message.success('Deleted');
            fetchCampaigns();
        } catch { message.error('Delete failed'); }
    };

    const handleSend = async (id) => {
        setSending(id);
        try {
            const res = await sendCampaign(id);
            message.success(res.data?.message || 'Campaign sent successfully');
            fetchCampaigns();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Send failed');
        } finally { setSending(null); }
    };

    const handlePreview = (html) => {
        setPreviewHtml(html);
        setPreviewOpen(true);
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (t) => <Text strong>{t}</Text>,
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            ellipsis: true,
        },
        {
            title: 'Template',
            dataIndex: 'template_name',
            key: 'template_name',
            render: (templateName) => templateName ? (
                <Tag color="blue">{templateName}</Tag>
            ) : (
                <Tag color="default">Custom</Tag>
            ),
        },
        {
            title: 'Target',
            key: 'target',
            render: (_, r) => (
                <Tag icon={<TeamOutlined />}>
                    {r.target_type === 'all' ? 'All Users'
                        : r.target_type === 'class' ? `Class: ${r.target_id}`
                        : r.target_type === 'school' ? `School: ${r.target_id}`
                        : r.target_type === 'role' ? `Role: ${r.target_id}`
                        : r.target_type}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Badge status={STATUS_COLORS[s] || 'default'} text={s || 'draft'} />,
        },
        {
            title: 'Sent At',
            dataIndex: 'sent_at',
            key: 'sent_at',
            render: (d) => d ? formatDanishDateTime(d) : '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Preview HTML">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record.html_body)} />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} disabled={record.status === 'sent'} />
                    </Tooltip>
                    <Popconfirm
                        title="Send this campaign?"
                        description="Emails will be sent to all targeted users."
                        onConfirm={() => handleSend(record.id)}
                        okText="Send"
                    >
                        <Tooltip title="Send Campaign">
                            <Button
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                loading={sending === record.id}
                                disabled={record.status === 'sent'}
                            >
                                Send
                            </Button>
                        </Tooltip>
                    </Popconfirm>
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(record.id)}>
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
                    <Title level={4} style={{ margin: 0 }}>Email Campaigns</Title>
                    <Text type="secondary">
                        Create targeted email campaigns using pre-designed automated templates or custom content.
                    </Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size="large">
                    New Campaign
                </Button>
            </div>

            {/* <Alert
                message="Clothing is a gateway — graduation caps are the main product."
                description="Target students who ordered class clothing and convert them into graduation cap customers using personalized email campaigns."
                type="info"
                showIcon
                icon={<MailOutlined />}
                style={{ marginBottom: 24 }}
            /> */}

            <Card>
                <Table
                    columns={columns}
                    dataSource={campaigns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No campaigns yet. Create your first one!' }}
                />
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                title={editingId ? 'Edit Campaign' : 'New Email Campaign'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                okText={editingId ? 'Update' : 'Save as Draft'}
                width={800}
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Campaign Title" name="title" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Graduation Caps Launch 2025" />
                    </Form.Item>

                    <Form.Item label="Select Email Template">
                        <Select
                            placeholder="Choose from pre-designed automated templates"
                            onChange={applyTemplate}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                        >
                            {/* Automated Templates by Category */}
                            {Object.entries(TEMPLATE_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                                const categoryTemplates = automatedTemplates[categoryKey] || [];
                                if (categoryTemplates.length === 0) return null;
                                
                                return (
                                    <Select.OptGroup 
                                        key={categoryKey}
                                        label={
                                            <span style={{ color: categoryInfo.color, fontWeight: 'bold' }}>
                                                {categoryInfo.label} ({categoryTemplates.length})
                                            </span>
                                        }
                                    >
                                        {categoryTemplates.map(template => (
                                            <Select.Option key={String(template.id)} value={String(template.id)}>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{template.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#999' }}>
                                                        {template.subject}
                                                    </div>
                                                </div>
                                            </Select.Option>
                                        ))}
                                    </Select.OptGroup>
                                );
                            })}
                            
                            {/* Built-in Templates */}
                            <Select.OptGroup label="Built-in Templates">
                                {EMAIL_TEMPLATES.map(t => (
                                    <Select.Option key={t.key} value={t.key}>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{t.label}</div>
                                            <div style={{ fontSize: '12px', color: '#999' }}>
                                                {t.subject || 'Custom template'}
                                            </div>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select.OptGroup>
                        </Select>
                    </Form.Item>

                    {/* Template Preview */}
                    {selectedTemplate && (
                        <Alert
                            message={`Selected: ${selectedTemplate.name || selectedTemplate.label}`}
                            description={
                                <div>
                                    <div><strong>Subject:</strong> {selectedTemplate.subject}</div>
                                    <div style={{ marginTop: '8px' }}>
                                        <Button 
                                            size="small" 
                                            icon={<EyeOutlined />}
                                            onClick={() => handlePreview(selectedTemplate.html_body || selectedTemplate.body)}
                                        >
                                            Preview Template
                                        </Button>
                                    </div>
                                </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <Form.Item label="Email Subject" name="subject" rules={[{ required: true }]}>
                        <Input placeholder="Subject line..." />
                    </Form.Item>

                    <Form.Item
                        label="Email Body (HTML)"
                        name="body"
                        rules={[{ required: true }]}
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Use {'{{name}}'} to personalize with recipient name</Text>}
                    >
                        <TextArea rows={12} placeholder="Paste HTML or write your email content..." style={{ fontFamily: 'monospace', fontSize: 12 }} />
                    </Form.Item>

                    <Divider />

                    <Form.Item label="Target Audience" name="target_type" rules={[{ required: true }]}>
                        <Select>
                            {TARGET_TYPES.map(t => (
                                <Select.Option key={t.value} value={t.value}>
                                    <Space>{t.icon}{t.label}</Space>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {targetType === 'class' && (
                        <Form.Item label="Select Class" name="target_id" rules={[{ required: true }]}>
                            <Select showSearch placeholder="Choose a class" optionFilterProp="children">
                                {classes.map(c => (
                                    <Select.Option key={c.id} value={String(c.id)}>{c.name}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {targetType === 'school' && (
                        <Form.Item label="Select School" name="target_id" rules={[{ required: true }]}>
                            <Select showSearch placeholder="Choose a school" optionFilterProp="children">
                                {schools.map(s => (
                                    <Select.Option key={s.id} value={String(s.id)}>{s.name}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {targetType === 'role' && (
                        <Form.Item label="Select Role" name="target_id" rules={[{ required: true }]}>
                            <Select placeholder="Choose role">
                                {ROLES.map(r => (
                                    <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* HTML Preview Modal */}
            <Modal
                title="Email Preview"
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={<Button onClick={() => setPreviewOpen(false)}>Close</Button>}
                width={700}
            >
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                    <iframe
                        srcDoc={previewHtml}
                        style={{ width: '100%', height: 500, border: 'none' }}
                        title="Email Preview"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CampaignPage;
