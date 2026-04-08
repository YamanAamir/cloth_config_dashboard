import React, { useRef, useState, useEffect } from 'react';
import { Button, Form, Input, Select, Space, message, Card, Typography, Spin, Segmented } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, EditOutlined, CodeOutlined } from '@ant-design/icons';
import EmailEditor from 'react-email-editor';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTemplate, updateTemplate, getTemplates } from '../api/marketing';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORIES = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'graduation_caps', label: 'Graduation Caps' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'order', label: 'Order' },
];

const TemplateEditorPage = () => {
    const emailEditorRef = useRef(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [mode, setMode] = useState('visual'); // 'visual' | 'html'
    const [htmlBody, setHtmlBody] = useState('');

    // Load existing template if editing
    useEffect(() => {
        if (editId) {
            setLoadingTemplate(true);
            getTemplates().then(res => {
                const tpl = (res.data.data || []).find(t => String(t.id) === String(editId));
                if (tpl) {
                    form.setFieldsValue({ name: tpl.name, subject: tpl.subject, category: tpl.category });
                    setHtmlBody(tpl.html_body || '');
                    // Load into visual editor when ready
                    if (tpl.design_json && editorReady) {
                        try {
                            emailEditorRef.current?.editor?.loadDesign(JSON.parse(tpl.design_json));
                        } catch { /* ignore */ }
                    }
                }
            }).catch(() => {}).finally(() => setLoadingTemplate(false));
        }
    }, [editId, editorReady]);

    const handleSave = (values) => {
        if (mode === 'visual') {
            if (!emailEditorRef.current) return;
            setSaving(true);
            emailEditorRef.current.editor.exportHtml(async ({ html, design }) => {
                try {
                    await saveTemplate(values, html, JSON.stringify(design));
                } finally { setSaving(false); }
            });
        } else {
            // HTML mode - use textarea content
            if (!htmlBody.trim()) { message.error('HTML body cannot be empty'); return; }
            setSaving(true);
            saveTemplate(values, htmlBody, null).finally(() => setSaving(false));
        }
    };

    const saveTemplate = async (values, html, designJson) => {
        try {
            const payload = {
                name: values.name,
                subject: values.subject,
                category: values.category,
                html_body: html,
                ...(designJson ? { design_json: designJson } : {}),
            };
            if (editId) {
                await updateTemplate(editId, payload);
                message.success('Template updated');
            } else {
                await createTemplate(payload);
                message.success('Template created');
            }
            navigate('/marketing');
        } catch (err) {
            message.error(err.response?.data?.message || 'Save failed');
        }
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/marketing')}>Back</Button>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>{editId ? 'Edit Template' : 'New Template'}</Title>
                        <Text type="secondary">Design your email template</Text>
                    </div>
                </div>
                <Space>
                    <Segmented
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'visual', label: <Space><EditOutlined /> Visual Designer</Space> },
                            { value: 'html', label: <Space><CodeOutlined /> HTML Code</Space> },
                        ]}
                    />
                    <Button type="primary" icon={<SaveOutlined />} loading={saving}
                        onClick={() => form.submit()} size="large">
                        Save Template
                    </Button>
                </Space>
            </div>

            {/* Meta fields */}
            <Card className="glass-card" style={{ border: 'none', marginBottom: 16 }}>
                <Form form={form} layout="inline" onFinish={handleSave}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ minWidth: 220 }}>
                        <Input placeholder="e.g. Graduation Cap Promo" />
                    </Form.Item>
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]} style={{ minWidth: 300 }}>
                        <Input placeholder="e.g. 🎓 Your graduation cap awaits!" />
                    </Form.Item>
                    <Form.Item name="category" label="Category" initialValue="marketing" rules={[{ required: true }]}>
                        <Select options={CATEGORIES} style={{ width: 180 }} />
                    </Form.Item>
                </Form>
            </Card>

            {/* Editor */}
            {mode === 'visual' ? (
                <Card style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                    {loadingTemplate && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 12, color: '#888' }}>Loading template...</div>
                        </div>
                    )}
                    <EmailEditor
                        ref={emailEditorRef}
                        onReady={() => setEditorReady(true)}
                        minHeight="700px"
                        options={{
                            displayMode: 'email',
                            appearance: { theme: 'light' },
                            mergeTags: {
                                name: { name: 'Student Name', value: '{{name}}' },
                                email: { name: 'Student Email', value: '{{email}}' },
                                class: { name: 'Class Name', value: '{{class}}' },
                            }
                        }}
                    />
                </Card>
            ) : (
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                        Write HTML directly. Use <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{class}}'}</code> as placeholders.
                    </Text>
                    <TextArea
                        value={htmlBody}
                        onChange={e => setHtmlBody(e.target.value)}
                        rows={25}
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                        placeholder={`<html>\n<body>\n  <h1>Hello {{name}},</h1>\n  <p>Your graduation cap is ready!</p>\n</body>\n</html>`}
                    />
                    {/* Live Preview */}
                    {htmlBody && (
                        <div style={{ marginTop: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Live Preview:</Text>
                            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff', minHeight: 100 }}
                                dangerouslySetInnerHTML={{ __html: htmlBody }} />
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default TemplateEditorPage;
