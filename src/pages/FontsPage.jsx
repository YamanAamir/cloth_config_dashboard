import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Table, Button, Space, Modal,
    Form, Input, message, Popconfirm, Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { getAdminFonts, createFont, deleteFont, permanentDeleteFont } from '../api/api';

const { Title, Text } = Typography;
const PREVIEW_TEXT = 'AaBbCc 123';

const FontsPage = () => {
    const [fonts, setFonts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewFamily, setPreviewFamily] = useState('');
    const [form] = Form.useForm();

    const fetchFonts = async () => {
        setLoading(true);
        try {
            const res = await getAdminFonts({ limit: 100 });
            setFonts(res.data.data || []);
        } catch { message.error('Failed to fetch fonts'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFonts(); }, []);

    // Load font CSS for preview
    const loadFont = (url, family) => {
        if (!url || !family) return;
        const id = `gf-preview-${family.replace(/\s+/g, '-')}`;
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id; link.rel = 'stylesheet'; link.href = url;
            document.head.appendChild(link);
        }
        setPreviewFamily(family);
    };

    // Load all saved fonts
    useEffect(() => {
        fonts.forEach(f => {
            if (f.google_font_url && f.name) {
                const id = `gf-${f.id}`;
                if (!document.getElementById(id)) {
                    const link = document.createElement('link');
                    link.id = id; link.rel = 'stylesheet'; link.href = f.google_font_url;
                    document.head.appendChild(link);
                }
            }
        });
    }, [fonts]);

    const handleSave = async (values) => {
        setSaving(true);
        try {
            await createFont({ name: values.name, google_font_url: values.google_font_url });
            message.success('Font added');
            setIsModalOpen(false);
            form.resetFields();
            setPreviewFamily(''); setPreviewUrl('');
            fetchFonts();
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to add font');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteFont(id);
            message.success('Font removed');
            fetchFonts();
        } catch { message.error('Delete failed'); }
    };

    const handlePermanentDelete = async (id, name) => {
        Modal.confirm({
            title: 'Permanently delete this font?',
            content: (
                <div>
                    <Typography.Text type="danger" strong>
                        ⚠️ This action cannot be undone!
                    </Typography.Text>
                    <br />
                    <Typography.Text>
                        This will permanently remove "{name}" from the system. 
                        This action is irreversible.
                    </Typography.Text>
                </div>
            ),
            okText: 'Permanently Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await permanentDeleteFont(id);
                    message.success('Font permanently deleted');
                    fetchFonts();
                } catch (error) {
                    message.error(error.response?.data?.message || 'Permanent delete failed');
                }
            }
        });
    };

    const columns = [
        {
            title: 'Font Name',
            dataIndex: 'name',
            key: 'name',
            render: t => <Text strong>{t}</Text>
        },
        {
            title: 'Preview',
            key: 'preview',
            render: (_, r) => (
                <span style={{ fontFamily: r.name, fontSize: 20 }}>{PREVIEW_TEXT}</span>
            )
        },
        {
            title: 'Google Font URL',
            dataIndex: 'google_font_url',
            key: 'url',
            render: url => url ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>
                    <LinkOutlined style={{ marginRight: 4 }} />View CSS
                </a>
            ) : '—'
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, r) => (
                <Popconfirm 
                    title="Permanently delete this font?" 
                    description="This action cannot be undone!"
                    onConfirm={() => handlePermanentDelete(r.id, r.name)} 
                    okText="Delete Forever" 
                    okType="danger"
                    cancelText="Cancel"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Font Management</Title>
                    <Text type="secondary">Fonts available for class representatives when adding names to back print</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setPreviewFamily(''); setIsModalOpen(true); }}>
                    Add Font
                </Button>
            </div>

            <Alert
                message={
                    <span>
                        To get a Google Font URL: go to{' '}
                        <a href="https://fonts.google.com" target="_blank" rel="noreferrer">fonts.google.com</a>
                        {' '}→ select a font → click "Get font" → "Get embed code" → copy the URL from the{' '}
                        <code>&lt;link href="..."&gt;</code> tag.
                    </span>
                }
                type="info" showIcon style={{ marginBottom: 16 }}
            />

            <Card className="glass-card" style={{ border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={fonts}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: 'No fonts added yet.' }}
                />
            </Card>

            <Modal
                title="Add Font"
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setPreviewFamily(''); setPreviewUrl(''); }}
                footer={null}
                destroyOnHidden
            >
                <Alert
                    message={<span>Get URL from <a href="https://fonts.google.com" target="_blank" rel="noreferrer">fonts.google.com</a> → select font → Get font → Get embed code → copy href URL</span>}
                    type="info" showIcon style={{ marginBottom: 16, fontSize: 12 }}
                />
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Font Name" rules={[{ required: true, message: 'Enter font name' }]}
                        tooltip="Exact font family name e.g. 'Roboto', 'Open Sans'">
                        <Input placeholder="e.g. Roboto" onChange={e => {
                            if (previewUrl) loadFont(previewUrl, e.target.value);
                        }} />
                    </Form.Item>
                    <Form.Item name="google_font_url" label="Google Font URL" rules={[{ required: true, message: 'Enter Google Font URL' }]}
                        tooltip="URL from fonts.google.com embed code">
                        <Input
                            placeholder="https://fonts.googleapis.com/css2?family=Roboto&display=swap"
                            onChange={e => {
                                setPreviewUrl(e.target.value);
                                const name = form.getFieldValue('name');
                                if (name && e.target.value) loadFont(e.target.value, name);
                            }}
                        />
                    </Form.Item>

                    {previewFamily && (
                        <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, marginBottom: 16, textAlign: 'center', border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>Preview</Text>
                            <span style={{ fontFamily: previewFamily, fontSize: 28 }}>{PREVIEW_TEXT}</span>
                        </div>
                    )}

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={saving}>Add Font</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default FontsPage;
