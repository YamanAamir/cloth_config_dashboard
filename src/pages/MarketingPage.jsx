import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Table, Space, Modal, Form, Input,
    Select, Tag, message, Popconfirm, Tabs, Tooltip, Badge
} from 'antd';
import {
    PlusOutlined, SendOutlined, DeleteOutlined, EditOutlined,
    MailOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllSchools, getAllClasses, getTemplates, createTemplate, updateTemplate, deleteTemplate, getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaign } from '../api/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TARGET_OPTIONS = [
    { value: 'all', label: 'All Students (consent given)' },
    { value: 'school', label: 'By School' },
    { value: 'class', label: 'By Class' },
];

const STATUS_MAP = {
    draft: { color: 'default', label: 'Draft' },
    sent: { color: 'success', label: 'Sent' },
    scheduled: { color: 'processing', label: 'Scheduled' },
};

const MarketingPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState({}); // { [id]: 'send' | 'force' | false }
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);

    // Template preview only (no create/edit modal - use editor page)
    const [previewTemplate, setPreviewTemplate] = useState(null);

    // Campaign modal
    const [campaignModal, setCampaignModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [campaignForm] = Form.useForm();
    const [targetType, setTargetType] = useState('all');

    // Helper function to display target information
    const getTargetDisplay = (campaign) => {
        if (campaign.target_object) {
            if (campaign.target_type === 'school') {
                return `School: ${campaign.target_object.name}`;
            } else if (campaign.target_type === 'class') {
                return `Class: ${campaign.target_object.name} (${campaign.target_object.school?.name || 'Unknown School'})`;
            }
        }

        // Fallback for 'all' or when no target_object
        if (campaign.target_type === 'all') return 'All Students';
        if (campaign.target_type === 'school') return `School ID: ${campaign.target_id}`;
        if (campaign.target_type === 'class') return `Class ID: ${campaign.target_id}`;
        return campaign.target_type || 'Unknown';
    };

    // Preview campaign content
    const handlePreviewCampaign = (campaign) => {
        setPreviewTemplate({
            id: campaign.id,
            name: campaign.title,
            subject: campaign.subject,
            html_body: campaign.html_body,
            target_info: getTargetDisplay(campaign),
            template_name: campaign.template?.name,
            template_id: campaign.template_id,
            sent_count: campaign.sent_count,
            failed_count: campaign.failed_count,
            status: campaign.status,
            created_at: campaign.created_at,
            sent_at: campaign.sent_at
        });
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [tRes, cRes, sRes, clRes] = await Promise.all([
                getTemplates(), getCampaigns(),
                getAllSchools({ limit: 100 }),
                getAllClasses({ limit: 100 })
            ]);
            setTemplates(tRes.data.data || []);
            setCampaigns(cRes.data.data || []);
            setSchools(sRes.data.data || []);
            setClasses(clRes.data.data || []);
        } catch { message.error('Failed to load marketing data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    // Template handlers
    const handleSaveTemplate = async (values) => {
        try {
            const payload = {
                name: values.name,
                subject: values.subject,
                html_body: values.body,
                category: values.category || 'marketing',
                is_default: false,
            };
            if (editingTemplate) {
                await updateTemplate(editingTemplate.id, payload);
                message.success('Template updated');
            } else {
                await createTemplate(payload);
                message.success('Template created');
            }
            setTemplateModal(false);
            templateForm.resetFields();
            setEditingTemplate(null);
            fetchAll();
        } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    };

    const handleDeleteTemplate = async (id) => {
        try { await deleteTemplate(id); message.success('Template deleted'); fetchAll(); }
        catch { message.error('Delete failed'); }
    };

    // Campaign handlers
    const handleSaveCampaign = async (values) => {
        try {
            const payload = {
                title: values.title,
                subject: values.subject,
                template_id: values.template_id || null,
                body: values.body || "",
                target_type: values.target || 'all',
                target_id: values.target_value || null,
            };
            if (editingCampaign) {
                await updateCampaign(editingCampaign.id, payload);
                message.success('Campaign updated');
            } else {
                await createCampaign(payload);
                message.success('Campaign created');
            }
            setCampaignModal(false);
            campaignForm.resetFields();
            setEditingCampaign(null);
            fetchAll();
        } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    };

    const handleSendCampaign = async (id, name, force = false) => {
        setSending(prev => ({ ...prev, [id]: force ? 'force' : 'send' }));
        try {
            const res = await sendCampaign(id, { force });
            message.success(`Campaign "${name}" sent to ${res.data?.sent_count || 0} recipients`);
            fetchAll();
        } catch (err) { message.error(err.response?.data?.message || 'Send failed'); }
        finally { setSending(prev => ({ ...prev, [id]: false })); }
    };

    const handleDeleteCampaign = async (id) => {
        try { await deleteCampaign(id); message.success('Campaign deleted'); fetchAll(); }
        catch { message.error('Delete failed'); }
    };

    const templateColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: t => <Text strong>{t}</Text> },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        { title: 'Category', dataIndex: 'category', key: 'category', render: c => <Tag color="blue">{c}</Tag> },
        {
            title: 'Action', key: 'action', render: (_, r) => (
                <Space>
                    <Tooltip title="Preview">
                        <Button type="text" icon={<EyeOutlined style={{ color: '#1890ff' }} />}
                            onClick={() => setPreviewTemplate(r)} />
                    </Tooltip>
                    <Tooltip title="Edit in Designer">
                        <Button type="text" icon={<EditOutlined style={{ color: '#00b96b' }} />}
                            onClick={() => navigate(`/template-editor?id=${r.id}`)} />
                    </Tooltip>
                    <Popconfirm title="Delete template?" onConfirm={() => handleDeleteTemplate(r.id)} okText="Yes" cancelText="No">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const campaignColumns = [
        { title: 'Campaign', dataIndex: 'title', key: 'title', render: t => <Text strong>{t}</Text> },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        {
            title: 'Template', key: 'template',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13 }}>{r.template?.name || 'No Template'}</Text>
                </Space>
            )
        },
        // {
        //     title: 'Target', dataIndex: 'target', key: 'target',
        //     render: (t, r) => (
        //         <Space direction="vertical" size={0}>
        //             <Tag color="blue">{r.target_type}</Tag>
        //             <Text type="secondary" style={{ fontSize: 11 }}>
        //                 {r.target_object ? (
        //                     <>
        //                         {r.target_type === 'school' && r.target_object.name}
        //                         {r.target_type === 'class' && `${r.target_object.name}`}
        //                         {r.target_type === 'all' && 'All consented students'}
        //                     </>
        //                 ) : (
        //                     <>
        //                         {r.target_type === 'all' && 'All consented students'}
        //                         {r.target_type === 'school' && `School ID: ${r.target_id}`}
        //                         {r.target_type === 'class' && `Class ID: ${r.target_id}`}
        //                     </>
        //                 )}
        //             </Text>
        //             {r.target_object?.school && (
        //                 <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic' }}>
        //                     {r.target_object.school.name}
        //                 </Text>
        //             )}
        //         </Space>
        //     )
        // },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: s => {
                const m = STATUS_MAP[s] || STATUS_MAP.draft;
                return <Tag color={m.color}>{m.label}</Tag>;
            }
        },
        {
            title: 'Actions', key: 'action', render: (_, r) => {
                const isSent = r.status === 'sent';

                return (
                    <Space>
                        {!isSent && (
                            <>
                                <Tooltip title="Send to consented students only">
                                    <Popconfirm
                                        title={`Send "${r.title}" to all eligible students?`}
                                        description="Only students with marketing consent will receive this."
                                        onConfirm={() => handleSendCampaign(r.id, r.title, false)}
                                        okText="Send" cancelText="Cancel"
                                    >
                                        <Button type="primary" size="small" icon={<SendOutlined />}
                                            loading={sending[r.id] === 'send'}>
                                            Send
                                        </Button>
                                    </Popconfirm>
                                </Tooltip>
                                <Tooltip title="Force send to ALL students (ignore consent)">
                                    <Popconfirm
                                        title={`Force send "${r.title}"?`}
                                        description="This will send to ALL students, ignoring marketing consent."
                                        onConfirm={() => handleSendCampaign(r.id, r.title, true)}
                                        okText="Force Send" cancelText="Cancel"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button size="small" icon={<SendOutlined />}
                                            loading={sending[r.id] === 'force'}
                                            style={{ borderColor: '#faad14', color: '#faad14' }}>
                                            Force
                                        </Button>
                                    </Popconfirm>
                                </Tooltip>
                            </>
                        )}

                        <Tooltip title="Preview Campaign">
                            <Button type="text" icon={<EyeOutlined style={{ color: '#1890ff' }} />}
                                onClick={() => handlePreviewCampaign(r)} />
                        </Tooltip>

                        {!isSent && (
                            <Tooltip title="Edit Campaign">
                                <Button type="text" icon={<EditOutlined style={{ color: '#00b96b' }} />}
                                    onClick={() => {
                                        setEditingCampaign(r);
                                        setTargetType(r.target_type || r.target || 'all');
                                        campaignForm.setFieldsValue({
                                            title: r.title || r.name,
                                            subject: r.subject,
                                            body: r.body || r.html_body,
                                            template_id: r.template_id,
                                            target: r.target_type || r.target || 'all',
                                            target_value: r.target_id || r.target_value,
                                        });
                                        setCampaignModal(true);
                                    }} />
                            </Tooltip>
                        )}

                        <Popconfirm title="Delete campaign?" onConfirm={() => handleDeleteCampaign(r.id)} okText="Yes" cancelText="No">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <MailOutlined style={{ marginRight: 8 }} />
                    Email Marketing
                </Title>
                <Text type="secondary">
                    Create campaigns to promote graduation caps to students who gave marketing consent
                </Text>
            </div>

            <Tabs
                items={[
                    {
                        key: 'campaigns',
                        label: <span><SendOutlined /> Campaigns ({campaigns.length})</span>,
                        children: (
                            <Card className="glass-card" style={{ border: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                    <Button type="primary" icon={<PlusOutlined />}
                                        onClick={() => { setEditingCampaign(null); campaignForm.resetFields(); setTargetType('all'); setCampaignModal(true); }}>
                                        New Campaign
                                    </Button>
                                </div>
                                <Table columns={campaignColumns} dataSource={campaigns} rowKey="id"
                                    loading={loading} pagination={{ pageSize: 10 }} />
                            </Card>
                        )
                    },
                    {
                        key: 'templates',
                        label: <span><FileTextOutlined /> Templates ({templates.length})</span>,
                        children: (
                            <Card className="glass-card" style={{ border: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                    <Button type="primary" icon={<PlusOutlined />}
                                        onClick={() => navigate('/template-editor')}>
                                        New Template
                                    </Button>
                                </div>
                                <Table columns={templateColumns} dataSource={templates} rowKey="id"
                                    loading={loading} pagination={{ pageSize: 10 }} />
                            </Card>
                        )
                    }
                ]}
            />

            {/* Campaign Modal */}
            <Modal title={editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                open={campaignModal}
                onCancel={() => { setCampaignModal(false); campaignForm.resetFields(); setEditingCampaign(null); }}
                footer={null} width={600} destroyOnHidden>
                <Form form={campaignForm} layout="vertical" onFinish={handleSaveCampaign} style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Campaign Title" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Spring Graduation Cap Campaign" />
                    </Form.Item>

                    <Form.Item name="template_id" label="Email Template" rules={[{ required: true, message: 'Select a template' }]}>
                        <Select
                            placeholder="Select a template"
                            options={templates.map(t => ({ value: t.id, label: `${t.name} — ${t.category}` }))}
                            onChange={(id) => {
                                if (id) {
                                    const tpl = templates.find(t => t.id === id);
                                    if (tpl) campaignForm.setFieldsValue({ subject: tpl.subject });
                                }
                            }}
                        />
                    </Form.Item>

                    <Form.Item name="subject" label="Email Subject" rules={[{ required: true }]}>
                        <Input placeholder="Auto-filled from template, editable" />
                    </Form.Item>

                    <Form.Item name="target" label="Target Audience" initialValue="all">
                        <Select options={TARGET_OPTIONS} onChange={setTargetType} />
                    </Form.Item>
                    {targetType === 'school' && (
                        <Form.Item name="target_value" label="Select School" rules={[{ required: true }]}>
                            <Select
                                showSearch optionFilterProp="label"
                                placeholder="Select school"
                                options={schools.map(s => ({ value: s.id, label: s.name }))}
                            />
                        </Form.Item>
                    )}
                    {targetType === 'class' && (
                        <Form.Item name="target_value" label="Select Class" rules={[{ required: true }]}>
                            <Select
                                showSearch optionFilterProp="label"
                                placeholder="Select class"
                                options={classes.map(c => ({ value: String(c.id), label: `${c.name} — ${c.school?.name || ''}` }))}
                            />
                        </Form.Item>
                    )}

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setCampaignModal(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">{editingCampaign ? 'Update' : 'Create'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Campaign Preview Modal */}
            <Modal
                title={previewTemplate ? `Preview: ${previewTemplate.name}` : 'Preview'}
                open={!!previewTemplate}
                onCancel={() => setPreviewTemplate(null)}
                footer={[
                    <Button key="close" onClick={() => setPreviewTemplate(null)}>Close</Button>
                ]}
                width={700}
                destroyOnHidden
            >
                {previewTemplate && (
                    <div>
                        {/* Campaign Info */}
                        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Subject:</Text>
                                    <Text strong>{previewTemplate.subject}</Text>
                                </div>
                                {previewTemplate.template_name && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Template:</Text>
                                        <Text>{previewTemplate.template_name}</Text>
                                    </div>
                                )}
                                {previewTemplate.target_info && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Target:</Text>
                                        <Text>{previewTemplate.target_info}</Text>
                                    </div>
                                )}
                                {previewTemplate.status && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Status:</Text>
                                        <Tag color={STATUS_MAP[previewTemplate.status]?.color || 'default'}>
                                            {STATUS_MAP[previewTemplate.status]?.label || previewTemplate.status}
                                        </Tag>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Sent Count:</Text>
                                    <Badge count={previewTemplate.sent_count || 0} color="#00b96b" />
                                </div>
                                {previewTemplate.failed_count > 0 && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Failed Count:</Text>
                                        <Badge count={previewTemplate.failed_count} color="#ff4d4f" />
                                    </div>
                                )}
                                {/* {previewTemplate.created_at && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Created:</Text>
                                        <Text style={{ fontSize: 12 }}>
                                            {new Date(previewTemplate.created_at).toLocaleString('da-DK')}
                                        </Text>
                                    </div>
                                )}
                                {previewTemplate.sent_at && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Sent At:</Text>
                                        <Text style={{ fontSize: 12 }}>
                                            {new Date(previewTemplate.sent_at).toLocaleString('da-DK')}
                                        </Text>
                                    </div>
                                )} */}
                            </Space>
                        </div>

                        {/* Email Content */}
                        <div
                            style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, minHeight: 200, background: '#fff' }}
                            dangerouslySetInnerHTML={{ __html: previewTemplate.html_body || '<p style="color:#bbb">No content</p>' }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MarketingPage;
