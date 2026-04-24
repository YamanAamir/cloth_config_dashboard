import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Table, Tag, Space, Modal, Form, Input, Switch,
  message, Tooltip, Popconfirm, Empty, Spin, Typography,
  Divider, Tabs, Select, InputNumber, Row, Col, Badge, Alert
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined,
  MailOutlined, PauseCircleOutlined, PlayCircleOutlined,
  ExperimentOutlined, EyeOutlined, ThunderboltOutlined, SaveOutlined
} from '@ant-design/icons';
import EmailEditor from 'react-email-editor';
import EmailPreviewModal from '../components/email/EmailPreviewModal';
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  toggleEmailTemplateStatus,
  sendTestEmail,
} from '../api/api';

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Config ────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  {
    value: 'manual',
    label: 'Manual',
    desc: 'You decide when to send this email yourself',
    color: 'default',
  },
  {
    value: 'user_registration',
    label: 'On user signup',
    desc: 'Automatically sent when a new user registers',
    color: 'blue',
  },
  {
    value: 'order_placed',
    label: 'When order is placed',
    desc: 'Automatically sent when a user places a new order',
    color: 'blue',
  },
  {
    value: 'payment_received',
    label: 'When payment received',
    desc: 'Automatically sent after a successful payment is confirmed',
    color: 'blue',
  },
  {
    value: 'deadline_reminder',
    label: 'Deadline reminder',
    desc: 'Automatically sent before an upcoming deadline',
    color: 'blue',
  },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'students', label: 'Students only' },
  { value: 'class_reps', label: 'Class reps only' },
];

const CATEGORY_OPTIONS = [
  { value: 'welcome',        label: 'Welcome' },
  { value: 'guidance',       label: 'Guidance' },
  { value: 'transactional',  label: 'Transactional' },
  { value: 'reminder',       label: 'Reminder' },
  { value: 'notification',   label: 'Notification' },
  { value: 'marketing',      label: 'Marketing' },
];

const statusConfig = (status) => {
  if (status === 0) return { label: 'Active', color: 'success' };
  if (status === 2) return { label: 'Paused', color: 'warning' };
  return { label: 'Draft', color: 'default' };
};

// ─── Component ─────────────────────────────────────────────────────────────

const EmailsPage = () => {
  const [emails, setEmails]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState('all');

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [saving, setSaving]       = useState(false);
  const [form]                    = Form.useForm();

  // editor
  const editorRef                         = useRef(null);
  const [editorReady, setEditorReady]     = useState(false);

  // preview
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // test send
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTarget, setTestTarget]       = useState(null);
  const [testEmail, setTestEmail]         = useState('');
  const [testSending, setTestSending]     = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEmailTemplates();
      setEmails(res.data?.data?.templates || res.data?.templates || res.data || []);
    } catch {
      message.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = emails.filter(e => {
    if (filter === 'automated') return e.is_automated;
    if (filter === 'manual')    return !e.is_automated;
    return true;
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setActiveTab('content');
    setEditorReady(false);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name:        record.name,
      subject:     record.subject,
      category:    record.category || 'welcome',
      trigger:     record.is_automated ? (record.automation_type || 'user_registration') : 'manual',
      delay_hours: record.delay_hours || 0,
      audience:    record.target_audience || 'all',
      is_active:   record.status === 0,
    });
    setActiveTab('content');
    setEditorReady(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    form.validateFields().then(values => {
      const doSave = (html, design) => {
        setSaving(true);
        const isAutomated = values.trigger !== 'manual';
        const payload = {
          name:             values.name,
          subject:          values.subject,
          category:         values.category,
          html_body:        html || '',
          design,
          is_automated:     isAutomated,
          automation_type:  isAutomated ? values.trigger : null,
          delay_hours:      values.delay_hours || 0,
          target_audience:  values.audience,
          status:           values.is_active ? 0 : 1,
        };

        const apiCall = editing
          ? updateEmailTemplate(editing.id, payload)
          : createEmailTemplate(payload);

        apiCall
          .then(() => { message.success('Email saved'); closeModal(); load(); })
          .catch(() => message.error('Failed to save'))
          .finally(() => setSaving(false));
      };

      if (editorRef.current?.editor && editorReady) {
        editorRef.current.editor.exportHtml(({ html, design }) => doSave(html, design));
      } else {
        doSave('', null);
      }
    });
  };

  // ── Toggle / Delete ───────────────────────────────────────────────────────

  const handleToggle = async (record) => {
    try {
      await toggleEmailTemplateStatus(record.id, { status: record.status === 0 ? 1 : 0 });
      load();
    } catch {
      message.error('Failed to update status');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteEmailTemplate(record.id);
      message.success('Deleted');
      load();
    } catch {
      message.error('Failed to delete');
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const automatedCount = emails.filter(e => e.is_automated).length;
  const manualCount    = emails.filter(e => !e.is_automated).length;

  const columns = [
    {
      title: 'Email',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.subject}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      width: 120,
      render: (_, r) =>
        r.is_automated
          ? <Tag icon={<ThunderboltOutlined />} color="blue">Automated</Tag>
          : <Tag color="default">Manual</Tag>,
    },
    {
      title: 'Trigger',
      width: 200,
      render: (_, r) => {
        if (!r.is_automated) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        const opt = TRIGGER_OPTIONS.find(o => o.value === r.automation_type);
        return <Text style={{ fontSize: 12 }}>{opt?.label || r.automation_type}</Text>;
      },
    },
    {
      title: 'Status',
      width: 90,
      render: (_, r) => {
        const s = statusConfig(r.status);
        return <Badge status={s.color} text={s.label} />;
      },
    },
    {
      title: 'Actions',
      width: 180,
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Preview">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setPreviewTemplate(r)} />
          </Tooltip>
          <Tooltip title="Send test email">
            <Button type="text" size="small" icon={<ExperimentOutlined />}
              onClick={() => { setTestTarget(r); setTestModalOpen(true); }}
            />
          </Tooltip>
          <Tooltip title={r.status === 0 ? 'Deactivate' : 'Activate'}>
            <Button type="text" size="small"
              icon={r.status === 0 ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggle(r)}
            />
          </Tooltip>
          <Popconfirm title="Delete this email?" okText="Delete" okType="danger" onConfirm={() => handleDelete(r)}>
            <Button danger type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Automation tab ────────────────────────────────────────────────────────

  const automationTabContent = (
    <div style={{ maxWidth: 560, paddingTop: 8 }}>

      <Form.Item
        name="trigger"
        label={<Text strong>When should this email be sent?</Text>}
      >
        <Select size="large" style={{ width: '100%' }}>
          {TRIGGER_OPTIONS.map(o => (
            <Option key={o.value} value={o.value}>
              <div style={{ padding: '2px 0' }}>
                <div style={{ fontWeight: 500 }}>{o.label}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 1 }}>{o.desc}</div>
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(p, c) => p.trigger !== c.trigger}>
        {({ getFieldValue }) => {
          const trigger = getFieldValue('trigger');
          if (trigger === 'manual' || !trigger) return null;
          const opt = TRIGGER_OPTIONS.find(o => o.value === trigger);
          return (
            <>
              <Alert
                type="info"
                showIcon
                message={opt?.desc}
                style={{ marginBottom: 20, borderRadius: 8 }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="delay_hours"
                    label="Delay before sending"
                    tooltip="Set to 0 to send immediately when the trigger fires"
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      addonAfter="hours"
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="audience" label="Send to">
                    <Select>
                      {AUDIENCE_OPTIONS.map(o => (
                        <Option key={o.value} value={o.value}>{o.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          );
        }}
      </Form.Item>

      <Divider />

      <Form.Item
        name="is_active"
        label={<Text strong>Status</Text>}
        valuePropName="checked"
        extra="Draft emails are saved but not sent. Activate to enable sending."
      >
        <Switch checkedChildren="Active" unCheckedChildren="Draft" />
      </Form.Item>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MailOutlined /> Emails
          </Title>
          <Text type="secondary">Create and manage manual and automated email templates</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}>
          New Email
        </Button>
      </div>

      {/* Filter bar */}
      <Space style={{ marginBottom: 16 }}>
        <Button type={filter === 'all'       ? 'primary' : 'default'} onClick={() => setFilter('all')}>
          All ({emails.length})
        </Button>
        <Button type={filter === 'automated' ? 'primary' : 'default'} onClick={() => setFilter('automated')}
          icon={<ThunderboltOutlined />}>
          Automated ({automatedCount})
        </Button>
        <Button type={filter === 'manual'    ? 'primary' : 'default'} onClick={() => setFilter('manual')}>
          Manual ({manualCount})
        </Button>
      </Space>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <Empty description="No emails yet" style={{ padding: 60 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Email</Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        )}
      </div>

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={1100}
        destroyOnClose
        styles={{ body: { padding: '16px 24px 0' } }}
        title={
          <Title level={4} style={{ margin: 0 }}>
            {editing ? `Edit: ${editing.name}` : 'New Email'}
          </Title>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ trigger: 'manual', category: 'welcome', audience: 'all', delay_hours: 0, is_active: true }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'content',
                label: 'Content',
                children: (
                  <div>
                    <Row gutter={16} style={{ marginBottom: 8 }}>
                      <Col span={8}>
                        <Form.Item
                          name="name"
                          label="Email name"
                          rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                          <Input placeholder="e.g. Welcome email for new students" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          name="subject"
                          label="Subject line"
                          rules={[{ required: true, message: 'Please enter a subject' }]}
                        >
                          <Input placeholder="e.g. Welcome to StudentLife, {{name}}!" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="category"
                          label="Category"
                          rules={[{ required: true, message: 'Please select a category' }]}
                        >
                          <Select placeholder="Select category">
                            {CATEGORY_OPTIONS.map(o => (
                              <Option key={o.value} value={o.value}>{o.label}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <div style={{
                      height: 450,
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}>
                      <EmailEditor
                        ref={editorRef}
                        onReady={() => {
                          setEditorReady(true);
                          if (editing?.design && editorRef.current?.editor) {
                            editorRef.current.editor.loadDesign(editing.design);
                          }
                        }}
                        options={{ displayMode: 'email' }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'automation',
                label: 'Automation',
                children: automationTabContent,
              },
            ]}
          />
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 16 }}>
          <Button onClick={closeModal}>Cancel</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Save Email
          </Button>
        </div>
      </Modal>

      {/* ─── Preview ─────────────────────────────────────────────────────── */}
      <EmailPreviewModal
        visible={!!previewTemplate}
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      {/* ─── Test Send Modal ──────────────────────────────────────────────── */}
      <Modal
        open={testModalOpen}
        onCancel={() => { setTestModalOpen(false); setTestEmail(''); }}
        title="Send Test Email"
        footer={null}
        width={400}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Send a test of <strong>{testTarget?.name}</strong> to any email address.
        </Text>
        <Input
          placeholder="Enter email address"
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          onPressEnter={async () => {
            if (!testEmail) return;
            setTestSending(true);
            try {
              await sendTestEmail(testTarget.id, { email: testEmail });
              message.success('Test email sent!');
              setTestModalOpen(false);
              setTestEmail('');
            } catch {
              message.error('Failed to send test email');
            } finally {
              setTestSending(false);
            }
          }}
          style={{ marginBottom: 12 }}
        />
        <Button
          type="primary"
          block
          icon={<SendOutlined />}
          loading={testSending}
          onClick={async () => {
            if (!testEmail) return message.warning('Enter an email address');
            setTestSending(true);
            try {
              await sendTestEmail(testTarget.id, { email: testEmail });
              message.success('Test email sent!');
              setTestModalOpen(false);
              setTestEmail('');
            } catch {
              message.error('Failed to send test email');
            } finally {
              setTestSending(false);
            }
          }}
        >
          Send Test
        </Button>
      </Modal>

    </div>
  );
};

export default EmailsPage;
